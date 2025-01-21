document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const resultInfo = document.getElementById('resultInfo');
    const faceDetails = document.getElementById('faceDetails');

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
        });

        // 検出結果の詳細を表示
        const detailsHTML = faces.map((face, index) => `
            <div class="face-info">
                <h4>顔 ${index + 1}</h4>
                <p>位置: (${face.x}, ${face.y})</p>
                <p>サイズ: ${face.width} x ${face.height}</p>
                <p>ランドマーク数: ${face.landmarks.length}</p>
            </div>
        `).join('');

        faceDetails.innerHTML = detailsHTML;
        resultInfo.classList.remove('hidden');
    }

    // フォームの送信処理
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

            // スケール係数の計算（プレビューサイズに合わせる）
            const img = new Image();
            img.onload = () => {
                const scale = previewCanvas.width / img.width;
                drawDetectionResults(data.faces, scale);
            };
            img.src = URL.createObjectURL(file);

        } catch (err) {
            showError(err.message);
        } finally {
            toggleLoading(false);
        }
    });

    // ファイル選択時のプレビュー表示
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            displayPreview(file);
            resultInfo.classList.add('hidden');
        }
    });
});
