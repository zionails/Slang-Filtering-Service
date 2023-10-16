import numpy as np
from flask import Flask, request, Response, jsonify, g
from flask_cors import CORS
import requests
import os
import json
from TextClassifier import TextClassifier
import mysql.connector
import easyocr
import tempfile
from io import BytesIO

app = Flask(__name__)
CORS(app)

# config.json 파일 로드
with open('config.json') as config_file:
    config_data = json.load(config_file)

app.config['DB_HOST'] = config_data['DB_HOST']
app.config['DB_USER'] = config_data['DB_USER']
app.config['DB_PASSWORD'] = config_data['DB_PASSWORD']
app.config['DB_DATABASE'] = config_data['DB_DATABASE']


def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host=app.config['DB_HOST'],
            user=app.config['DB_USER'],
            password=app.config['DB_PASSWORD'],
            database=app.config['DB_DATABASE']
        )
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # 필수 필드 검증
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        db = get_db()  # 이전에 정의된 get_db 함수 사용
        cursor = db.cursor()

        # 사용자 검증
        cursor.execute("SELECT password FROM users WHERE username = %s", (data['username'],))
        result = cursor.fetchone()
        if result is None:
            return jsonify({"error": "Invalid username or password"}), 400

        stored_password = result[0]
        if stored_password != data['password']:  # 주의: 실제 상황에서는 해시된 비밀번호를 비교해야 함
            return jsonify({"error": "Invalid username or password"}), 400

        # 로그인 성공
        return jsonify({"message": "Login successful"}), 200

    except mysql.connector.Error as err:
        # 데이터베이스 오류 처리
        print(f"Database error: {err}")
        return jsonify({"error": "Database error"}), 500

    except Exception as err:
        # 기타 오류 처리
        print(f"Other error: {err}")
        return jsonify({"error": "An unknown error occurred"}), 500


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()

    # 필수 필드 검증
    required_fields = ['id', 'name', 'email', 'username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        db = get_db()  # 이전에 정의된 get_db 함수 사용
        cursor = db.cursor()

        # 아이디 중복 검사
        cursor.execute("SELECT id FROM users WHERE id = %s", (data['id'],))
        if cursor.fetchone():
            return jsonify({"error": "ID already exists"}), 400

        # 이메일 중복 검사
        cursor.execute("SELECT email FROM users WHERE email = %s", (data['email'],))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 400

        # 새 사용자 저장
        query = (
            "INSERT INTO users (id, name, email, username, password) "
            "VALUES (%s, %s, %s, %s, %s)"
        )
        cursor.execute(query,
                       (data['id'], data['name'], data['email'], data['username'], data['password']))  # 평문 비밀번호 사용
        db.commit()

        # 성공 응답 반환
        return jsonify({"message": "User created successfully"}), 201

    except mysql.connector.Error as err:
        # 데이터베이스 오류 처리
        print(f"Database error: {err}")
        return jsonify({"error": "Database error"}), 500

    except Exception as err:
        # 기타 오류 처리
        print(f"Other error: {err}")
        return jsonify({"error": "An unknown error occurred"}), 500


@app.route('/write', methods=['POST'])
def write():
    content = request.get_json()
    if content and 'sentences' in content:
        sentences = content['sentences']
        classifier = TextClassifier(model_path="./Model")
        predictions = classifier.predict(sentences)
        response_data = {
            "predictions": predictions.tolist()  # 변환된 결과를 JSON으로 만들기 위해 리스트로 변환
        }
        return jsonify(response_data), 200
    else:
        return jsonify({"error": "Invalid request, JSON with 'sentences' key expected"}), 400


@app.route('/delete', methods=['POST'])
def delete():
    None


@app.route('/sentence', methods=['GET'])
def sentence():
    sentences = request.args.get('sentences')
    if sentences:
        sentences = sentences.split('|')
        classifier = TextClassifier(model_path="./Model")
        predictions = classifier.predict(sentences)
        response_data = {"data": []}  # 응답 데이터를 저장할 딕셔너리
        for i, pred in enumerate(predictions):
            sentence_data = {
                "sentence": sentences[i],
                "labels": {},
            }
            for label, score in zip(classifier.labels, pred):
                sentence_data["labels"][label] = f"{score.item():.4f}"  # 점수를 문자열로 변환
            response_data["data"].append(sentence_data)  # 응답 데이터에 문장 데이터 추가

        return json.dumps(response_data, ensure_ascii=False, indent=2)  # JSON으로 직렬화


@app.route('/image', methods=['GET'])
def image():
    image_url = request.args.get('url')
    if not image_url:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F401",
                "message": "url 존재하지 않음"
            }
        }
        return Response(json.dumps(response_data), status=400, mimetype='application/json')

    response = requests.get(image_url)
    if response.status_code != 200:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F402",
                "message": "이미지를 다운받을 수 없음"
            }
        }
        return Response(json.dumps(response_data), status=400, mimetype='application/json')

    # 이미지 데이터를 EasyOCR에 전달하여 텍스트 추출
    image_data = response.content
    reader_ko = easyocr.Reader(['ko', 'en'], model_storage_directory='OCRModel')
    result = reader_ko.readtext(image_data)

    # 결과를 텍스트로 변환
    text_output = ''.join([text for (bbox, text, prob) in result])

    # 결과를 JSON 응답으로 반환
    image_result = {
        'result': text_output
    }
    return Response(json.dumps(image_result), status=200, mimetype='application/json')


if __name__ == '__main__':
    app.run(debug=config_data['APP_DEBUG'], host='0.0.0.0', port=config_data['APP_PORT'])
