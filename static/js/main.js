document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const resultInfo = document.getElementById('resultInfo');
    const faceDetails = document.getElementById('faceDetails');
    const analyzeButton = document.getElementById('analyzeButton');
    const sunglassesButton = document.getElementById('sunglassesButton');
    let currentFilePath = null;
    let currentFaces = null;
    let currentScale = 1;
    let currentImage = null;

    // エラー表示関数
    function showError(message) {
        error.textContent = message;
        error.classList.remove('hidden');
        setTimeout(() => {
            error.classList.add('hidden');
        }, 5000);
    }

    // ローディング表示の制御
    function toggleLoading(show) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    // 画像プレビューの表示
    function displayPreview(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // キャンバスのサイズを画像に合わせる
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / img.width);
                previewCanvas.width = img.width * scale;
                previewCanvas.height = img.height * scale;
                
                // 画像を描画
                ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
                currentImage = img;
                currentScale = scale;
                resolve();
            };
            img.onerror = () => {
                reject(new Error('画像の読み込みに失敗しました'));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    // アップロード処理
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = imageInput.files[0];
        
        if (!file) {
            showError('画像を選択してください');
            return;
        }

        // ファイルサイズチェック（16MB制限）
        if (file.size > 16 * 1024 * 1024) {
            showError('ファイルサイズが大きすぎます（16MB以下にしてください）');
            return;
        }

        try {
            toggleLoading(true);
            error.classList.add('hidden');
            resultInfo.classList.add('hidden');
            analyzeButton.disabled = true;
            sunglassesButton.disabled = true;

            // 画像のプレビュー表示
            await displayPreview(file);

            // フォームデータの作成
            const formData = new FormData();
            formData.append('image', file);

            // サーバーへのアップロード
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'アップロードに失敗しました');
            }

            if (data.status === 'error') {
                throw new Error(data.message);
            }

            // 検出結果を表示
            if (data.results && data.results.length > 0) {
                currentFaces = data.results;
                drawDetectionResults(data.results, currentScale);
                sunglassesButton.disabled = false;
            }

        } catch (err) {
            console.error('Error:', err);
            showError(err.message);
        } finally {
            toggleLoading(false);
        }
    });

    // 検出結果の描画
    function drawDetectionResults(results, scale) {
        if (!results || results.length === 0) return;

        results.forEach(result => {
            // 目の位置を描画
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(result.left_eye[0], result.left_eye[1], 3, 0, 2 * Math.PI);
            ctx.arc(result.right_eye[0], result.right_eye[1], 3, 0, 2 * Math.PI);
            ctx.fill();

            // 顔の矩形を描画
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                result.face_x,
                result.face_y,
                result.face_width,
                result.face_height
            );
        });

        // 結果の詳細を表示
        const detailsHTML = results.map((result, index) => `
            <div class="face-info">
                <h4>顔 ${index + 1}</h4>
                <p>左目の座標: (${result.left_eye[0]}, ${result.left_eye[1]})</p>
                <p>右目の座標: (${result.right_eye[0]}, ${result.right_eye[1]})</p>
                <p>目の間隔: ${Math.round(result.eye_distance)}px</p>
                <p>顔の位置: (${result.face_x}, ${result.face_y})</p>
                <p>顔のサイズ: ${result.face_width}x${result.face_height}px</p>
            </div>
        `).join('');

        faceDetails.innerHTML = detailsHTML;
        resultInfo.classList.remove('hidden');
    }

    // サングラスの描画
    function drawSunglasses(result) {
        // 元の画像を保存
        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        
        // 目の位置を取得
        const leftEye = result.left_eye;
        const rightEye = result.right_eye;
        
        // 目の間の距離を計算
        const eyeDistance = result.eye_distance;
        
        // サングラスのサイズを計算（目の間隔の2倍）
        const sunglassesWidth = eyeDistance * 2.0;
        const sunglassesHeight = sunglassesWidth / 3;
        
        // サングラスの位置を計算（目の中心）
        const centerX = (leftEye[0] + rightEye[0]) / 2;
        const centerY = (leftEye[1] + rightEye[1]) / 2;
        const x = centerX - (sunglassesWidth / 2);
        const y = centerY - (sunglassesHeight / 2);

        // サングラスemojiを描画
        ctx.save();
        ctx.font = `${sunglassesWidth}px Arial`;
        ctx.fillText('🕶', x, y + sunglassesHeight);
        ctx.restore();

        // アニメーション効果（フェードアウト）
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                ctx.putImageData(imageData, 0, 0);
            } else {
                ctx.globalAlpha = opacity;
                ctx.putImageData(imageData, 0, 0);
                ctx.save();
                ctx.font = `${sunglassesWidth}px Arial`;
                ctx.fillText('🕶', x, y + sunglassesHeight);
                ctx.restore();
            }
        }, 50);
    }

    // サングラスボタンのクリックハンドラ
    sunglassesButton.addEventListener('click', () => {
        if (currentFaces && currentFaces.length > 0) {
            drawSunglasses(currentFaces[0]);
        }
    });

    // ファイル選択時のプレビュー表示
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            displayPreview(file).catch(err => {
                showError(err.message);
            });
            resultInfo.classList.add('hidden');
            analyzeButton.disabled = true;
            sunglassesButton.disabled = true;
            currentFilePath = null;
            currentFaces = null;
        }
    });
});
