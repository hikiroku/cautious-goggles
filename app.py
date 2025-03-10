from flask import Flask, request, jsonify, render_template
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import sys

app = Flask(__name__)

# カスケード分類器のパスを取得
def get_cascade_paths():
    # Vercel環境の場合
    if os.environ.get('VERCEL'):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cascade_dir = os.path.join(base_dir, 'cv2', 'data')
        print(f"Current directory: {os.getcwd()}")
        print(f"Base directory: {base_dir}")
        try:
            print(f"Directory contents: {os.listdir(base_dir)}")
            print(f"CV2 directory contents: {os.listdir(os.path.join(base_dir, 'cv2'))}")
            print(f"Data directory contents: {os.listdir(os.path.join(base_dir, 'cv2', 'data'))}")
        except Exception as e:
            print(f"Error listing directory contents: {str(e)}")
    else:
        # ローカル環境の場合
        cascade_dir = cv2.data.haarcascades

    cascade_path = os.path.join(cascade_dir, 'haarcascade_frontalface_default.xml')
    eye_cascade_path = os.path.join(cascade_dir, 'haarcascade_eye.xml')
    
    print(f"Cascade directory: {cascade_dir}")
    print(f"Face cascade path: {cascade_path}")
    print(f"Eye cascade path: {eye_cascade_path}")
    
    # ファイルの存在確認
    if not os.path.exists(cascade_path):
        print(f"Error: Face cascade file not found at {cascade_path}")
        # 代替パスを試す
        alt_cascade_path = os.path.join(os.getcwd(), 'cv2', 'data', 'haarcascade_frontalface_default.xml')
        if os.path.exists(alt_cascade_path):
            print(f"Found face cascade at alternate path: {alt_cascade_path}")
            cascade_path = alt_cascade_path

    if not os.path.exists(eye_cascade_path):
        print(f"Error: Eye cascade file not found at {eye_cascade_path}")
        # 代替パスを試す
        alt_eye_cascade_path = os.path.join(os.getcwd(), 'cv2', 'data', 'haarcascade_eye.xml')
        if os.path.exists(alt_eye_cascade_path):
            print(f"Found eye cascade at alternate path: {alt_eye_cascade_path}")
            eye_cascade_path = alt_eye_cascade_path
    
    return cascade_path, eye_cascade_path

# カスケード分類器の読み込み
try:
    face_cascade_path, eye_cascade_path = get_cascade_paths()
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
    
    if face_cascade.empty() or eye_cascade.empty():
        raise Exception("カスケード分類器の読み込みに失敗しました")
    print("Cascades loaded successfully")
except Exception as e:
    print(f"Error loading cascades: {str(e)}")
    face_cascade = None
    eye_cascade = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    try:
        if face_cascade is None or eye_cascade is None:
            return jsonify({
                'status': 'error',
                'message': 'カスケード分類器が正しく初期化されていません'
            }), 500

        # 画像データを取得
        if 'image' not in request.files:
            return jsonify({
                'status': 'error',
                'message': '画像ファイルが見つかりません'
            }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'ファイルが選択されていません'
            }), 400

        # 画像を読み込み
        img_data = file.read()
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({
                'status': 'error',
                'message': '画像の読み込みに失敗しました'
            }), 400

        # グレースケールに変換
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 顔検出
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        print(f"Detected {len(faces)} faces")
        
        if len(faces) == 0:
            return jsonify({
                'status': 'error',
                'message': '顔を検出できませんでした'
            }), 400

        results = []
        for (x, y, w, h) in faces:
            face_roi_gray = gray[y:y+h, x:x+w]
            
            # 目の検出
            eyes = eye_cascade.detectMultiScale(face_roi_gray)
            print(f"Detected {len(eyes)} eyes in face")
            
            # 目のペアを見つける
            if len(eyes) >= 2:
                # Y座標でソート
                eyes = sorted(eyes, key=lambda e: e[1])
                
                # 水平な目のペアを探す
                for i in range(len(eyes)-1):
                    eye1 = eyes[i]
                    eye2 = eyes[i+1]
                    
                    # Y座標の差が小さいペアを選択
                    if abs(eye1[1] - eye2[1]) < 10:
                        # 目の中心座標を計算
                        eye1_center = (x + eye1[0] + eye1[2]//2, y + eye1[1] + eye1[3]//2)
                        eye2_center = (x + eye2[0] + eye2[2]//2, y + eye2[1] + eye2[3]//2)
                        
                        # 目の距離を計算
                        eye_distance = np.sqrt((eye1_center[0] - eye2_center[0])**2 + 
                                            (eye1_center[1] - eye2_center[1])**2)
                        
                        # 結果を追加
                        eye_data = {
                            'left_eye': list(map(int, eye1_center)),
                            'right_eye': list(map(int, eye2_center)),
                            'eye_distance': float(eye_distance),
                            'face_x': int(x),
                            'face_y': int(y),
                            'face_width': int(w),
                            'face_height': int(h)
                        }
                        results.append(eye_data)
                        print(f"Added eye pair: {eye_data}")
                        break

        if not results:
            return jsonify({
                'status': 'error',
                'message': '目を検出できませんでした'
            }), 400
        
        # 結果を返す
        return jsonify({
            'status': 'success',
            'message': '顔の検出に成功しました',
            'results': results
        })
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'エラーが発生しました: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
