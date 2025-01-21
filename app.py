import os
import cv2
import dlib
import numpy as np
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB制限
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# dlibの顔検出器を初期化
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')

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
    faces = detector(gray)
    
    results = []
    for face in faces:
        # 顔のランドマークを検出
        shape = predictor(gray, face)
        
        # 顔の座標を取得
        face_data = {
            "x": face.left(),
            "y": face.top(),
            "width": face.width(),
            "height": face.height(),
            "landmarks": []
        }
        
        # ランドマークの座標を取得
        for i in range(68):
            point = shape.part(i)
            face_data["landmarks"].append({
                "x": point.x,
                "y": point.y
            })
        
        results.append(face_data)
    
    return results

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
