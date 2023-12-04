import mimetypes
import os
from datetime import datetime
from fastapi import FastAPI, Response, HTTPException, Depends, status, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from TextClassifier import TextClassifier
import mysql.connector
import easyocr
import uvicorn
import boto3
import tempfile
from typing import List, Optional
import torch
import json

app = FastAPI()
# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인에서 접근 허용 (실제 운영환경에서는 제한적으로 설정해야 합니다)
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)
# config.json 파일 로드
with open('config.json') as config_file:
    config_data = json.load(config_file)

DB_CONFIG = {
    "host": config_data['DB_HOST'],
    "user": config_data['DB_USER'],
    "password": config_data['DB_PASSWORD'],
    "database": config_data['DB_DATABASE']
}


def get_db():
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        yield db
    except mysql.connector.Error as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))
    finally:
        db.close()


class LoginRequest(BaseModel):
    accountid: str
    password: str


@app.post("/login")
def login(request_data: LoginRequest, db: mysql.connector.MySQLConnection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT accountid, username, password FROM users WHERE accountid = %s", (request_data.accountid,))
    result = cursor.fetchone()
    if result is None or result[2] != request_data.password:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F400",
                "message": "로그인 실패"
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')
    response_data = {
        "status": 200,
        "result": "success",
        "data": {
            "accountid": result[0],
            "username": result[1]
        }
    }
    return Response(json.dumps(response_data), status_code=200, media_type='application/json')


class SignupRequest(BaseModel):
    accountid: str
    email: str
    username: str
    password: str


@app.post("/signup")
def signup(request_data: SignupRequest, db: mysql.connector.MySQLConnection = Depends(get_db)):
    # 필수 필드 검증
    if not request_data.accountid or not request_data.email or not request_data.username or not request_data.password:
        raise HTTPException(status_code=400, detail="모든 필드를 채워주세요.")
    cursor = db.cursor()
    cursor.execute("SELECT accountid FROM users WHERE accountid = %s", (request_data.accountid,))
    if cursor.fetchone():
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F401",
                "message": "ID 중복"
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')
    cursor.execute("SELECT email FROM users WHERE email = %s", (request_data.email,))
    if cursor.fetchone():
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F402",
                "message": "Email 중복"
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')
    query = (
        "INSERT INTO users (accountid, email, username, password) "
        "VALUES (%s, %s, %s, %s)"
    )
    cursor.execute(query,
                   (request_data.accountid, request_data.email, request_data.username,
                    request_data.password))
    db.commit()

    response_data = {
        "status": 200,
        "result": "success"
    }
    return Response(json.dumps(response_data), status_code=200, media_type='application/json')


classifier = TextClassifier(model_path="./Model")
reader_ko = easyocr.Reader(['ko', 'en'])


class WriteRequest(BaseModel):
    title: str
    content: str
    user_id: str
    image1: Optional[UploadFile] = None
    image2: Optional[UploadFile] = None
    image3: Optional[UploadFile] = None


# 아마존s3연결 확인해야함
@app.post("/write")
async def write(
        title: str = Form(...),
        content: str = Form(...),
        user_id: str = Form(...),
        image1: UploadFile = File(None),
        image2: UploadFile = File(None),
        image3: UploadFile = File(None),
        db: mysql.connector.MySQLConnection = Depends(get_db)
):
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=config_data['aws_access_key_id'],
            aws_secret_access_key=config_data['aws_secret_access_key'],
            region_name=config_data['region_name']
        )
        # 데이터베이스에서 user_id 확인
        cursor = db.cursor()
        cursor.execute("SELECT accountid FROM users WHERE accountid = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            # 사용자 ID가 유효하지 않은 경우 에러 응답 반환
            response_data = {
                "status": 400,
                "error": {
                    "errorCode": "F403",
                    "message": "유효하지 않은 사용자 ID"
                },
                "result": "fail"
            }
            return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        image_urls = []
        # 이미지 파일이 제공된 경우
        for idx, image_field in enumerate([image1, image2, image3]):
            if image_field:
                try:
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(image_field.file.read())
                        temp_file.flush()
                        temp_file_path = temp_file.name
                        # easyocr를 사용하여 텍스트 추출
                        result = reader_ko.readtext(temp_file.name)
                except Exception as e:
                    # 여기서 예외를 처리합니다.
                    print(e)
                finally:
                    if temp_file_path and os.path.exists(temp_file_path):
                        os.remove(temp_file_path)

                # 결과를 텍스트로 변환
                texts = [text for (bbox, text, prob) in result]
                text_output = ' '.join(texts)  # 공백으로 구분된 전체 텍스트

                predictions = classifier.predict(text_output)

                # 가장 높은 점수를 가진 라벨 찾기
                max_label = classifier.labels[torch.argmax(predictions[0]).item()]
                max_score = torch.max(predictions[0]).item()
                # 만약 가장 높은 점수를 가진 라벨이 'clean'이 아닌 경우 에러 발생
                if max_label != "clean":
                    # 에러코드
                    response_data = {
                        "status": 400,
                        "error": {
                            "errorCode": "F404",
                            "message": "이미지 비속어 감지"
                        },
                        "image": idx + 1,
                        "result": max_label
                    }
                    return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        # content의 텍스트를 분석하여 비속어를 확인합니다.
        text_output = content
        predictions = classifier.predict(text_output)

        # 가장 높은 점수를 가진 라벨 찾기
        max_label = classifier.labels[torch.argmax(predictions[0]).item()]
        max_score = torch.max(predictions[0]).item()

        # 만약 가장 높은 점수를 가진 라벨이 'clean'이 아닌 경우 에러 발생
        if max_label != "clean":
            # 에러코드
            response_data = {
                "status": 400,
                "error": {
                    "errorCode": "F405",
                    "message": "컨텐츠 비속어 감지"
                },
                "result": max_label
            }
            return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        # 모든 검사가 끝나고 안전하다고 판단된 후에만 S3에 이미지를 업로드합니다.
        for idx, image_field in enumerate([image1, image2, image3]):
            if image_field:
                bucket_name = 'capstonst'
                # 현재 날짜와 시간을 이용한 파일명 생성
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                file_extension = os.path.splitext(image_field.filename)[1]
                object_name = f'images/{user_id}/{timestamp}{idx}{file_extension}'

                # 파일 확장자를 기반으로 MIME 타입 추론
                mime_type, _ = mimetypes.guess_type(image_field.filename)

                # 기본 MIME 타입 설정
                if not mime_type:
                    mime_type = 'application/octet-stream'

                image_field.file.seek(0)  # 파일 포인터를 처음으로 되돌립니다.
                s3.upload_fileobj(
                    image_field.file,
                    bucket_name,
                    object_name,
                    ExtraArgs={'ContentType': mime_type}
                )

                # 업로드된 이미지의 URL 저장
                image_url = f"https://{bucket_name}.s3.amazonaws.com/{object_name}"
                image_urls.append(image_url)

        # image_urls 리스트를 쉼표로 구분된 문자열로 변환
        image_urls_str = ','.join(image_urls)

        # 데이터베이스에 post 정보 저장
        cursor = db.cursor()
        query = (
            "INSERT INTO posts (title, content, image_url, user_id, date) "
            "VALUES (%s, %s, %s, %s, NOW())"
        )
        cursor.execute(query,
                       (title, content, image_urls_str,
                        user_id))  # image_urls_str 사용
        db.commit()
        response_data = {
            "status": 200,
            "result": "success"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')

    except Exception as e:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F406",
                "message": f"작성 실패: {str(e)}"  # 예외 내용 추가
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')


class UpdateRequest(BaseModel):
    id: str
    title: str
    content: str
    user_id: str
    image1: Optional[UploadFile] = None
    image2: Optional[UploadFile] = None
    image3: Optional[UploadFile] = None


@app.post("/update")
async def update(
        post_id: str = Form(...),
        title: str = Form(...),
        content: str = Form(...),
        user_id: str = Form(...),
        image1: UploadFile = File(None),
        image2: UploadFile = File(None),
        image3: UploadFile = File(None),
        db: mysql.connector.MySQLConnection = Depends(get_db)
):
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=config_data['aws_access_key_id'],
            aws_secret_access_key=config_data['aws_secret_access_key'],
            region_name=config_data['region_name']
        )
        # 데이터베이스에서 포스트 ID 확인
        cursor = db.cursor()
        cursor.execute("SELECT * FROM posts WHERE id = %s AND user_id = %s", (post_id, user_id))
        post = cursor.fetchone()
        if not post:
            response_data = {
                "status": 400,
                "error": {
                    "errorCode": "F407",
                    "message": "유효하지 않은 사용자 ID"
                },
                "result": "fail"
            }
            return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        image_urls = []
        # 이미지 파일이 제공된 경우
        for idx, image_field in enumerate([image1, image2, image3]):
            if image_field:
                try:
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(image_field.file.read())
                        temp_file.flush()
                        temp_file_path = temp_file.name
                        # easyocr를 사용하여 텍스트 추출
                        result = reader_ko.readtext(temp_file.name)
                except Exception as e:
                    # 여기서 예외를 처리합니다.
                    print(e)
                finally:
                    if temp_file_path and os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                # 결과를 텍스트로 변환
                texts = [text for (bbox, text, prob) in result]
                text_output = ' '.join(texts)  # 공백으로 구분된 전체 텍스트

                predictions = classifier.predict(text_output)

                # 가장 높은 점수를 가진 라벨 찾기
                max_label = classifier.labels[torch.argmax(predictions[0]).item()]
                max_score = torch.max(predictions[0]).item()
                # 만약 가장 높은 점수를 가진 라벨이 'clean'이 아닌 경우 에러 발생
                if max_label != "clean":
                    # 에러코드
                    response_data = {
                        "status": 400,
                        "error": {
                            "errorCode": "F408",
                            "message": "이미지 비속어 감지"
                        },
                        "image": idx + 1,
                        "result": max_label
                    }
                    return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        # content의 텍스트를 분석하여 비속어를 확인합니다.
        text_output = content
        predictions = classifier.predict(text_output)

        # 가장 높은 점수를 가진 라벨 찾기
        max_label = classifier.labels[torch.argmax(predictions[0]).item()]
        max_score = torch.max(predictions[0]).item()

        # 만약 가장 높은 점수를 가진 라벨이 'clean'이 아닌 경우 에러 발생
        if max_label != "clean":
            # 에러코드
            response_data = {
                "status": 400,
                "error": {
                    "errorCode": "F409",
                    "message": "컨텐츠 비속어 감지"
                },
                "result": max_label
            }
            return Response(json.dumps(response_data), status_code=200, media_type='application/json')

        existing_image_urls = []
        try:
            cursor.execute("SELECT image_url FROM posts WHERE id = %s", (post_id,))
            post = cursor.fetchone()
            # fetchone()은 쿼리 결과가 없으면 None을 반환합니다.
            if post:
                # Assuming 'image_url' is the first column in the row returned by fetchone()
                existing_image_urls = post[0].split(',') if post[0] else []
        except Exception as e:
            # 예외 처리 로직
            print(f"An error occurred while fetching the post: {e}")

        # 기존 이미지 파일들을 S3에서 삭제합니다.
        for db_image_url in existing_image_urls:
            # URL에서 버킷 이름과 객체 키를 추출합니다.
            bucket_name = 'capstonst'
            object_key = db_image_url.replace(f"https://{bucket_name}.s3.amazonaws.com/", "")
            # S3에서 이미지 객체를 삭제합니다.
            s3.delete_object(Bucket=bucket_name, Key=object_key)

        # 모든 검사가 끝나고 안전하다고 판단된 후에만 S3에 이미지를 업로드합니다.
        for idx, image_field in enumerate([image1, image2, image3]):
            if image_field:
                bucket_name = 'capstonst'
                # 현재 날짜와 시간을 이용한 파일명 생성
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                file_extension = os.path.splitext(image_field.filename)[1]
                object_name = f'images/{user_id}/{timestamp}{idx}{file_extension}'

                # 파일 확장자를 기반으로 MIME 타입 추론
                mime_type, _ = mimetypes.guess_type(image_field.filename)

                # 기본 MIME 타입 설정
                if not mime_type:
                    mime_type = 'application/octet-stream'

                image_field.file.seek(0)  # 파일 포인터를 처음으로 되돌립니다.
                s3.upload_fileobj(
                    image_field.file,
                    bucket_name,
                    object_name,
                    ExtraArgs={'ContentType': mime_type}
                )

                # 업로드된 이미지의 URL 저장
                image_url = f"https://{bucket_name}.s3.amazonaws.com/{object_name}"
                image_urls.append(image_url)

        # image_urls 리스트를 쉼표로 구분된 문자열로 변환
        image_urls_str = ','.join(image_urls)

        # 데이터베이스에 post 정보 저장
        cursor = db.cursor()
        query = (
            "UPDATE posts "
            "SET title = %s, content = %s, image_url = %s, user_id = %s, date = NOW()"
            "WHERE id = %s"
        )
        cursor.execute(query, (title, content, image_urls_str, user_id, post_id))
        db.commit()
        response_data = {
            "status": 200,
            "result": "success"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')

    except Exception as e:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F410",
                "message": f"수정 실패: {str(e)}"  # 예외 내용 추가
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')


class DeleteRequest(BaseModel):
    post_id: str
    user_id: str


@app.post("/delete")
async def delete(delete_request: DeleteRequest, db: mysql.connector.MySQLConnection = Depends(get_db)):
    # 데이터베이스에서 post_id와 user_id로 게시물을 찾습니다.
    cursor = db.cursor()
    cursor.execute("SELECT * FROM posts WHERE id = %s AND user_id = %s",
                   (delete_request.post_id, delete_request.user_id))
    post = cursor.fetchone()
    if not post:
        # 에러코드
        response_data = {
            "status": 400,
            "error": {
                "errorCode": "F411",
                "message": "게시글 없음"
            },
            "result": "fail"
        }
        return Response(json.dumps(response_data), status_code=200, media_type='application/json')
    s3 = boto3.client(
        's3',
        aws_access_key_id=config_data['aws_access_key_id'],
        aws_secret_access_key=config_data['aws_secret_access_key'],
        region_name=config_data['region_name']
    )
    existing_image_urls = []
    try:
        cursor.execute("SELECT image_url FROM posts WHERE id = %s", (delete_request.post_id,))
        post = cursor.fetchone()
        # fetchone()은 쿼리 결과가 없으면 None을 반환합니다.
        if post:
            # Assuming 'image_url' is the first column in the row returned by fetchone()
            existing_image_urls = post[0].split(',') if post[0] else []
    except Exception as e:
        # 예외 처리 로직
        print(f"An error occurred while fetching the post: {e}")

    # 기존 이미지 파일들을 S3에서 삭제합니다.
    for db_image_url in existing_image_urls:
        # URL에서 버킷 이름과 객체 키를 추출합니다.
        bucket_name = 'capstonst'
        object_key = db_image_url.replace(f"https://{bucket_name}.s3.amazonaws.com/", "")
        # S3에서 이미지 객체를 삭제합니다.
        s3.delete_object(Bucket=bucket_name, Key=object_key)

    # 게시물을 삭제합니다.
    cursor.execute("DELETE FROM posts WHERE id = %s AND user_id = %s", (delete_request.post_id, delete_request.user_id))
    db.commit()

    # 삭제 성공 메시지를 반환합니다.
    response_data = {
        "status": 200,
        "result": "success"
    }
    return Response(json.dumps(response_data), status_code=200, media_type='application/json')


class Post(BaseModel):
    id: int
    title: str
    content: str
    image_url: str
    user_id: str
    date: str


class PostPageResponse(BaseModel):
    posts: List[Post]
    final_page: int


class PageRequest(BaseModel):
    page: int


@app.post("/post")
async def post(page_request: PageRequest, db: mysql.connector.MySQLConnection = Depends(get_db)):
    page = page_request.page
    # 페이지 번호를 확인하고 1보다 작으면 1로 설정
    page = max(page, 1)

    cursor = db.cursor(dictionary=True)  # 딕셔너리 형식의 결과를 반환하도록 설정

    # 게시글의 시작 인덱스를 계산
    start_index = (page - 1) * 10

    # 해당 페이지의 게시글을 검색
    cursor.execute(
        "SELECT * FROM posts ORDER BY id ASC LIMIT %s, 10",
        (start_index,)
    )
    posts = cursor.fetchall()

    # Post 모델을 사용하여 검색된 게시글을 파싱하기 전에 날짜 형식을 변환
    for post in posts:
        if isinstance(post['date'], datetime):
            post['date'] = post['date'].isoformat()

    # 전체 게시글 수를 가져와서 최종 페이지 번호를 계산
    cursor.execute("SELECT COUNT(*) FROM posts")
    total_posts = cursor.fetchone()['COUNT(*)']
    final_page = -(-total_posts // 10)  # 올림 나눗셈을 사용하여 최종 페이지 번호 계산

    # Post 모델을 사용하여 검색된 게시글을 파싱
    posts_models = [Post(**post) for post in posts]

    # 게시글과 최종 페이지 번호를 포함한 JSON 응답 데이터를 생성
    response_data = {
        "status": 200,
        "result": "success",
        "posts": posts_models,
        "final_page": final_page
    }

    # JSON 응답을 반환
    return Response(json.dumps(response_data, default=lambda x: x.dict()), status_code=200,
                    media_type='application/json')


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config_data['APP_PORT'], reload=config_data['APP_DEBUG'])
