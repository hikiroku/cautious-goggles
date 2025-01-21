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
        const img = new Image();
        img.onload = () => {
            // キャンバスのサイズを画像に合わせる
            const maxWidth = 800;
            const scale = Math.min(1, maxWidth / img.width);
            previewCanvas.width = img.width * scale;
            previewCanvas.height = img.height * scale;
            
            // 画像を描画
            ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
        };
        img.src = URL.createObjectURL(file);
    }

    // 顔の検出結果を描画
    function drawDetectionResults(faces, scale) {
        faces.forEach(face => {
            // 顔の矩形を描画
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                face.x * scale,
                face.y * scale,
                face.width * scale,
                face.height * scale
            );

            // ランドマークを描画
            ctx.fillStyle = '#ff0000';
            face.landmarks.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x * scale, point.y * scale, 2, 0, 2 * Math.PI);
                ctx.fill();
            });

            // 表情の表示
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            ctx.fillText(
                `${face.expression.expression}`,
                face.x * scale,
                (face.y * scale) - 10
            );
        });

        // 検出結果の詳細を表示
        const detailsHTML = faces.map((face, index) => `
            <div class="face-info">
                <h4>顔 ${index + 1}</h4>
                <p>位置: (${face.x}, ${face.y})</p>
                <p>サイズ: ${face.width} x ${face.height}</p>
                <p>ランドマーク数: ${face.landmarks.length}</p>
                <div class="expression-info">
                    <h5>表情分析</h5>
                    <p>表情: ${face.expression.expression}</p>
                    <p>信頼度: ${face.expression.confidence}</p>
                    <div class="expression-details">
                        <p>笑顔: ${face.expression.details['笑顔の検出']}</p>
                        <p>目の検出: ${face.expression.details['目の検出']}</p>
                    </div>
                </div>
            </div>
        `).join('');

        faceDetails.innerHTML = detailsHTML;
        resultInfo.classList.remove('hidden');
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

            // 画像のプレビュー表示
            displayPreview(file);

            // フォームデータの作成
            const formData = new FormData();
            formData.append('file', file);

            // サーバーへのアップロード
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'アップロードに失敗しました');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // アップロード成功後、分析ボタンを有効化
            currentFilePath = data.filepath;
            analyzeButton.disabled = false;

        } catch (err) {
            showError(err.message);
        } finally {
            toggleLoading(false);
        }
    });

    // サングラスemojiを描画
    function drawSunglasses(faces, scale) {
        // 元の画像を保存
        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        
        faces.forEach(face => {
            // 目のランドマークをグループ化
            const eyes = face.landmarks.filter(point => point.type === 'eye');
            if (eyes.length >= 2) {
                // 左目と右目を特定
                const leftEye = eyes[0].x < eyes[1].x ? eyes[0] : eyes[1];
                const rightEye = eyes[0].x < eyes[1].x ? eyes[1] : eyes[0];

                // 目の間の距離を計算
                const eyeDistance = Math.sqrt(
                    Math.pow(rightEye.x - leftEye.x, 2) + 
                    Math.pow(rightEye.y - leftEye.y, 2)
                ) * scale;

                // サングラスのサイズと位置を計算
                const sunglassesSize = eyeDistance * 1.2; // サイズを調整
                const centerX = ((leftEye.x + rightEye.x) / 2) * scale;
                const centerY = (leftEye.y * scale + rightEye.y * scale) / 2;
                
                // 目の高さの差が小さい場合は回転しない
                const heightDiff = Math.abs(rightEye.y - leftEye.y) * scale;
                const shouldRotate = heightDiff > 5; // 5ピクセル以上の差がある場合のみ回転

                // サングラスの位置を調整
                const x = centerX - (sunglassesSize / 2);
                const y = centerY - (sunglassesSize / 4);

                // サングラスemojiを描画
                ctx.save();
                if (shouldRotate) {
                    const angle = Math.atan2(
                        (rightEye.y - leftEye.y) * scale,
                        (rightEye.x - leftEye.x) * scale
                    );
                    ctx.translate(centerX, centerY);
                    ctx.rotate(angle);
                    ctx.translate(-centerX, -centerY);
                }
                ctx.font = `${sunglassesSize}px Arial`;
                ctx.fillText('🕶', x, y);
                ctx.restore();
            }
        });

        // アニメーション効果（フェードアウト）
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05; // フェードアウトの速度を遅く
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                ctx.putImageData(imageData, 0, 0);
            } else {
                ctx.globalAlpha = opacity;
                ctx.putImageData(imageData, 0, 0);
                faces.forEach(face => {
                    const eyes = face.landmarks.filter(point => point.type === 'eye');
                    if (eyes.length >= 2) {
                        const leftEye = eyes[0].x < eyes[1].x ? eyes[0] : eyes[1];
                        const rightEye = eyes[0].x < eyes[1].x ? eyes[1] : eyes[0];
                        const eyeDistance = Math.sqrt(
                            Math.pow(rightEye.x - leftEye.x, 2) + 
                            Math.pow(rightEye.y - leftEye.y, 2)
                        ) * scale;
                        
                        const sunglassesSize = eyeDistance * 1.2;
                        const centerX = ((leftEye.x + rightEye.x) / 2) * scale;
                        const centerY = (leftEye.y * scale + rightEye.y * scale) / 2;
                        const heightDiff = Math.abs(rightEye.y - leftEye.y) * scale;
                        const shouldRotate = heightDiff > 5;
                        
                        const x = centerX - (sunglassesSize / 2);
                        const y = centerY - (sunglassesSize / 4);

                        ctx.save();
                        if (shouldRotate) {
                            const angle = Math.atan2(
                                (rightEye.y - leftEye.y) * scale,
                                (rightEye.x - leftEye.x) * scale
                            );
                            ctx.translate(centerX, centerY);
                            ctx.rotate(angle);
                            ctx.translate(-centerX, -centerY);
                        }
                        ctx.font = `${sunglassesSize}px Arial`;
                        ctx.fillText('🕶', x, y);
                        ctx.restore();
                    }
                });
            }
        }, 50); // アニメーションの更新間隔を短く
    }

    // 分析ボタンのクリックハンドラ
    analyzeButton.addEventListener('click', async () => {
        if (!currentFilePath) {
            showError('画像をアップロードしてください');
            return;
        }

        try {
            toggleLoading(true);
            error.classList.add('hidden');
            resultInfo.classList.add('hidden');

            // 分析リクエストの送信
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filepath: currentFilePath })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '分析に失敗しました');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // スケール係数の計算（プレビューサイズに合わせる）
            const img = new Image();
            img.onload = () => {
                const scale = previewCanvas.width / img.width;
                currentScale = scale;
                currentFaces = data.faces;
                drawDetectionResults(data.faces, scale);
                sunglassesButton.disabled = false;
            };
            img.src = previewCanvas.toDataURL();

        } catch (err) {
            showError(err.message);
            sunglassesButton.disabled = true;
        } finally {
            toggleLoading(false);
        }
    });

    // サングラスボタンのクリックハンドラ
    sunglassesButton.addEventListener('click', () => {
        if (currentFaces && currentFaces.length > 0) {
            drawSunglasses(currentFaces, currentScale);
        }
    });

    // ファイル選択時のプレビュー表示
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            displayPreview(file);
            resultInfo.classList.add('hidden');
            analyzeButton.disabled = true;
            sunglassesButton.disabled = true;
            currentFilePath = null;
            currentFaces = null;
        }
    });
});
