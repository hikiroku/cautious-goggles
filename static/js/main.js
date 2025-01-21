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
        const detailsHTML = faces.map((face, index) => {
            // 目のペアを検出
            const eyes = face.landmarks.filter(point => point.type === 'eye');
            const eyePair = findHorizontalEyePair(eyes);
            
            // 顔の位置情報を計算
            const faceTop = face.y * scale;
            const faceHeight = face.height * scale;
            
            // 目のペア情報を整形
            let eyePairInfo = '<p>目のペアが検出できませんでした</p>';
            if (eyePair) {
                const leftEyeScaled = {
                    x: eyePair.leftEye.x * scale,
                    y: eyePair.leftEye.y * scale
                };
                const rightEyeScaled = {
                    x: eyePair.rightEye.x * scale,
                    y: eyePair.rightEye.y * scale
                };

                // 目の間の距離を計算
                const eyeDistance = Math.sqrt(
                    Math.pow(rightEyeScaled.x - leftEyeScaled.x, 2) + 
                    Math.pow(rightEyeScaled.y - leftEyeScaled.y, 2)
                );

                // サングラスのサイズと位置を計算
                const sunglassesSize = eyeDistance * 2.0;
                const centerX = (leftEyeScaled.x + rightEyeScaled.x) / 2;
                const centerY = (leftEyeScaled.y + rightEyeScaled.y) / 2;
                const x = centerX - (sunglassesSize / 2);
                const y = centerY - (sunglassesSize * 0.6);

                eyePairInfo = `
                    <div class="eye-pair-info">
                        <h5>目のペア情報</h5>
                        <p>左目: (${leftEyeScaled.x.toFixed(2)}, ${leftEyeScaled.y.toFixed(2)})</p>
                        <p>右目: (${rightEyeScaled.x.toFixed(2)}, ${rightEyeScaled.y.toFixed(2)})</p>
                        <h5>計算情報</h5>
                        <p>目の間の距離: ${eyeDistance.toFixed(2)}px</p>
                        <p>サングラスサイズ: ${sunglassesSize.toFixed(2)}px</p>
                        <p>中心座標: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})</p>
                        <p>表示位置: (${x.toFixed(2)}, ${y.toFixed(2)})</p>
                    </div>
                `;
            }

            return `
                <div class="face-info">
                    <h4>顔 ${index + 1}</h4>
                    <p>位置: (${face.x}, ${face.y})</p>
                    <p>サイズ: ${face.width} x ${face.height}</p>
                    <p>ランドマーク数: ${face.landmarks.length}</p>
                    
                    <div class="position-info">
                        <h5>位置計算情報</h5>
                        <p>スケール: ${scale.toFixed(3)}</p>
                        <p>顔の上端: ${faceTop.toFixed(2)}px</p>
                        <p>顔の高さ: ${faceHeight.toFixed(2)}px</p>
                        <p>元の座標: (${face.x}, ${face.y})</p>
                        <p>スケール後: (${(face.x * scale).toFixed(2)}, ${(face.y * scale).toFixed(2)})</p>
                    </div>
                    
                    ${eyePairInfo}
                    
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
            `;
        }).join('');

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

    // 水平な目のペアを見つける関数
    function findHorizontalEyePair(eyes) {
        if (eyes.length < 2) return null;
        
        // X座標でソート
        const sortedEyes = [...eyes].sort((a, b) => a.x - b.x);
        
        // 2つの目ずつチェック
        for (let i = 0; i < sortedEyes.length - 1; i++) {
            const eye1 = sortedEyes[i];
            const eye2 = sortedEyes[i + 1];
            
            // Y座標の差が小さい（ほぼ水平）場合、このペアを採用
            if (Math.abs(eye2.y - eye1.y) < 10) {
                return {
                    leftEye: eye1,
                    rightEye: eye2
                };
            }
        }
        
        // 水平なペアが見つからない場合は最初の2つを使用
        return {
            leftEye: sortedEyes[0],
            rightEye: sortedEyes[1]
        };
    }

    // サングラスemojiを描画
    function drawSunglasses(faces, scale) {
        // 元の画像を保存
        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        
        // 最初の顔のみを処理
        const face = faces[0];
        if (face) {
            // 目のランドマークをグループ化
            const eyes = face.landmarks.filter(point => point.type === 'eye');
            const eyePair = findHorizontalEyePair(eyes);
            
            if (eyePair) {
                const { leftEye, rightEye } = eyePair;

                // 目の位置をスケール適用
                const leftEyeScaled = {
                    x: leftEye.x * scale,
                    y: leftEye.y * scale
                };
                const rightEyeScaled = {
                    x: rightEye.x * scale,
                    y: rightEye.y * scale
                };

                // 目の間の距離を計算
                const eyeDistance = Math.sqrt(
                    Math.pow(rightEyeScaled.x - leftEyeScaled.x, 2) + 
                    Math.pow(rightEyeScaled.y - leftEyeScaled.y, 2)
                );

                // サングラスのサイズを計算（目の間隔の2.0倍）
                const sunglassesSize = eyeDistance * 2.0;

                // 目の中心位置を計算
                const centerX = (leftEyeScaled.x + rightEyeScaled.x) / 2;
                const centerY = (leftEyeScaled.y + rightEyeScaled.y) / 2;

                // サングラスの位置を調整（目を完全に覆うように）
                const x = centerX - (sunglassesSize / 2);
                const y = centerY - (sunglassesSize * 0.6); // 目の中心から上に60%移動

                // サングラスemojiを描画
                ctx.save();
                ctx.font = `${sunglassesSize}px Arial`;
                ctx.fillText('🕶', x, y);
                ctx.restore();
            }
        }

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
                
                // 最初の顔のみを処理
                const face = faces[0];
                if (face) {
                    const eyes = face.landmarks.filter(point => point.type === 'eye');
                    const eyePair = findHorizontalEyePair(eyes);
                    
                    if (eyePair) {
                        const { leftEye, rightEye } = eyePair;
                        const leftEyeScaled = {
                            x: leftEye.x * scale,
                            y: leftEye.y * scale
                        };
                        const rightEyeScaled = {
                            x: rightEye.x * scale,
                            y: rightEye.y * scale
                        };

                        const eyeDistance = Math.sqrt(
                            Math.pow(rightEyeScaled.x - leftEyeScaled.x, 2) + 
                            Math.pow(rightEyeScaled.y - leftEyeScaled.y, 2)
                        );

                        const sunglassesSize = eyeDistance * 2.0;
                        const centerX = (leftEyeScaled.x + rightEyeScaled.x) / 2;
                        const centerY = (leftEyeScaled.y + rightEyeScaled.y) / 2;
                        const x = centerX - (sunglassesSize / 2);
                        const y = centerY - (sunglassesSize * 0.6);

                        ctx.save();
                        ctx.font = `${sunglassesSize}px Arial`;
                        ctx.fillText('🕶', x, y);
                        ctx.restore();
                    }
                }
            }
        }, 50);
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
