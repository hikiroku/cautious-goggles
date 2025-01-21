import os
import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB制限
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# MediaPipeの顔検出モジュールを初期化
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=10,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_faces(image_path):
    # 画像を読み込み
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "画像の読み込みに失敗しました"}

    # BGR to RGB
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = rgb_img.shape[:2]
    
    # 顔を検出
    results = face_mesh.process(rgb_img)
    
    faces_data = []
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # 顔の境界ボックスを計算
            x_coordinates = [landmark.x for landmark in face_landmarks.landmark]
            y_coordinates = [landmark.y for landmark in face_landmarks.landmark]
            
            x_min = int(min(x_coordinates) * width)
            y_min = int(min(y_coordinates) * height)
            x_max = int(max(x_coordinates) * width)
            y_max = int(max(y_coordinates) * height)
            
            face_data = {
                "x": x_min,
                "y": y_min,
                "width": x_max - x_min,
                "height": y_max - y_min,
                "landmarks": []
            }
            
            # ランドマークの座標を取得
            for idx, landmark in enumerate(face_landmarks.landmark):
                face_data["landmarks"].append({
                    "x": int(landmark.x * width),
                    "y": int(landmark.y * height)
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
