import os
import cv2
import numpy as np
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB制限
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# OpenCVの検出器を初期化
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_expression(gray_img, x, y, w, h):
    roi_gray = gray_img[y:y+h, x:x+w]
    
    # 笑顔の検出
    smiles = smile_cascade.detectMultiScale(
        roi_gray,
        scaleFactor=1.7,
        minNeighbors=20,
        minSize=(25, 25)
    )
    
    # 目の検出数（両目が検出されているか）
    eyes = eye_cascade.detectMultiScale(roi_gray)
    eyes_count = len(eyes)
    
    # 表情の分析
    if len(smiles) > 0:
        expression = "笑顔"
        confidence = "高"
    elif eyes_count == 2:
        expression = "真剣"
        confidence = "中"
    else:
        expression = "普通"
        confidence = "低"
    
    return {
        "expression": expression,
        "confidence": confidence,
        "details": {
            "笑顔の検出": "あり" if len(smiles) > 0 else "なし",
            "目の検出": f"{eyes_count}個",
        }
    }

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
            "landmarks": [],
            "expression": analyze_expression(gray, x, y, w, h)
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
        
        return jsonify({
            "success": True,
            "image_path": os.path.join('uploads', filename),
            "filepath": filepath
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.get_json()
        if not data or 'filepath' not in data:
            return jsonify({"error": "画像パスが指定されていません"}), 400
        
        filepath = data['filepath']
        if not os.path.exists(filepath):
            return jsonify({"error": "指定された画像が見つかりません"}), 404
        
        # 顔検出を実行
        face_results = detect_faces(filepath)
        
        response = {
            "faces": face_results
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
