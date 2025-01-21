from flask import Flask, request, jsonify, render_template
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os

app = Flask(__name__)

# カスケード分類器の読み込み
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    try:
        # 画像データを取得
        file = request.files['image']
        img_data = file.read()
        
        # バイナリデータをnumpy配列に変換
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # グレースケールに変換
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 顔検出
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        results = []
        for (x, y, w, h) in faces:
            face_roi_gray = gray[y:y+h, x:x+w]
            face_roi_color = img[y:y+h, x:x+w]
            
            # 目の検出
            eyes = eye_cascade.detectMultiScale(face_roi_gray)
            
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
                            'left_eye': eye1_center,
                            'right_eye': eye2_center,
                            'eye_distance': float(eye_distance),
                            'face_x': int(x),
                            'face_y': int(y),
                            'face_width': int(w),
                            'face_height': int(h)
                        }
                        results.append(eye_data)
                        break
        
        # 結果を返す
        return jsonify({
            'status': 'success',
            'message': '顔の検出に成功しました',
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'エラーが発生しました: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
