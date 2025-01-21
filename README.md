# 顔検出アプリ

画像の顔検出と表情分析を行うWebアプリケーションです。アップロードされた画像から顔を検出し、表情分析を行います。また、検出された目の位置にサングラスエフェクトを表示することができます。

## 機能

- 画像アップロード
- 顔検出
- 表情分析
- サングラスエフェクト
- デバッグ情報の表示

## 技術スタック

- Backend: Python (Flask)
- Frontend: HTML, CSS, JavaScript
- 画像処理: OpenCV
- 顔検出: dlib

## ローカルでの実行方法

1. リポジトリをクローン
```bash
git clone [repository-url]
cd face-detection-app
```

2. 依存パッケージのインストール
```bash
pip install -r requirements.txt
```

3. アプリケーションの起動
```bash
python app.py
```

4. ブラウザでアクセス
```
http://localhost:5000
```

## デプロイ

このアプリケーションはVercelにデプロイすることができます。

1. Vercelアカウントを作成
2. Vercelプロジェクトを作成
3. GitHubリポジトリと連携
4. デプロイ設定を確認
5. デプロイを実行

## ライセンス

MIT License
