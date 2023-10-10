from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import requests
import os
import json

app = Flask(__name__)
CORS(app)


@app.route('/login', methods=['POST'])
def login():
    None


@app.route('/signup', methods=['POST'])
def signup():
    None


@app.route('/logout', methods=['POST'])
def logout():
    None


@app.route('/write', methods=['POST'])
def write():
    None


@app.route('/delete', methods=['POST'])
def delete():
    None


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=9035)
