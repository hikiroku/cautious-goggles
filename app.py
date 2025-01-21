import os
import cv2
import numpy as np
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB制限
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# OpenCVの顔検出器を初期化
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_faces(image_path):
    # 画像を読み込み
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "画像の読み込みに失敗しました"}

    # グレースケールに変換
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 顔を検出
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )
    
    faces_data = []
    for (x, y, w, h) in faces:
        face_data = {
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "landmarks": []
        }
        
        # 顔領域内で目を検出
        roi_gray = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray)
        
        # 目の位置を追加
        for (ex, ey, ew, eh) in eyes:
            face_data["landmarks"].append({
                "x": int(x + ex + ew/2),  # 目の中心のx座標
                "y": int(y + ey + eh/2),  # 目の中心のy座標
                "type": "eye"
            })
        
        faces_data.append(face_data)
    
    return faces_data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "ファイルがアップロードされていません"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "ファイルが選択されていません"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "許可されていないファイル形式です"}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # 顔検出を実行
        results = detect_faces(filepath)
        
        # アップロードされた画像のパスを含める
        response = {
            "image_path": os.path.join('uploads', filename),
            "faces": results
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
