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
git clone https://github.com/hikiroku/cautious-goggles.git
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

## Vercelへのデプロイ手順

1. Vercelアカウントの準備
   - [Vercel](https://vercel.com)でアカウントを作成
   - GitHubアカウントと連携

2. プロジェクトのインポート
   - Vercelダッシュボードで「Import Project」をクリック
   - GitHubリポジトリを選択
   - `cautious-goggles`を選択

3. デプロイ設定
   - Framework Preset: `Other`
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: `./`
   - Install Command: `pip install -r requirements.txt`

4. 環境変数の設定
   - `Settings` > `Environment Variables`で以下を設定:
     - `PYTHON_VERSION`: `3.9`
     - `REQUIREMENTS_FILE`: `requirements.txt`

5. デプロイの実行
   - 「Deploy」をクリック
   - デプロイが完了するまで待機

## トラブルシューティング

### デプロイ時の注意点

1. Python依存関係
   - `requirements.txt`に記載されているバージョンが正しいことを確認
   - 特にOpenCVとdlibのバージョンに注意

2. ファイルアップロード
   - アップロードされたファイルは一時的に保存
   - 定期的なクリーンアップが必要

3. メモリ使用量
   - 画像処理時のメモリ使用量に注意
   - 大きすぎる画像はリサイズして処理

### よくある問題と解決方法

1. モジュールが見つからないエラー
   - `requirements.txt`の内容を確認
   - 必要なパッケージが全て含まれているか確認

2. 画像アップロードエラー
   - ファイルサイズ制限を確認
   - 対応している画像形式を確認

3. 顔検出の精度
   - 明るさや角度による影響
   - 複数人物の場合の処理

## ライセンス

MIT License
