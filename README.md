# 顔検出アプリ

画像の顔検出を行うWebアプリケーションです。アップロードされた画像から顔と目を検出し、検出された目の位置にサングラスエフェクトを表示することができます。

## 機能

- 画像アップロード
- 顔と目の検出
  - 顔の位置を緑色の矩形で表示
  - 目の位置を赤色の点で表示
  - 検出結果の詳細表示（座標、サイズ）
- サングラスエフェクト
  - 検出された目の位置に自動調整
  - フェードアウトアニメーション
- エラーハンドリング
  - 詳細なエラーメッセージ
  - ファイルサイズチェック
  - 画像形式の検証

## 技術スタック

- Backend: Python (Flask)
- Frontend: HTML, CSS, JavaScript
- 画像処理: OpenCV (opencv-python-headless)
- 顔検出: OpenCV Cascade Classifier

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
   - Build and Output Settings: デフォルト値を使用
   - Root Directory: `./`

4. 環境変数の設定
   - `Settings` > `Environment Variables`で以下を設定:
     - `PYTHON_VERSION`: `3.9`
     - `VERCEL`: `1`

5. デプロイの実行
   - 「Deploy」をクリック
   - デプロイが完了するまで待機

## 使用方法

1. 画像のアップロード
   - 「画像を選択」ボタンをクリック
   - JPG、JPEG、PNG形式の画像を選択
   - 「アップロード」ボタンをクリック

2. 顔検出
   - アップロード後、自動的に顔と目を検出
   - 検出された顔は緑色の矩形で表示
   - 検出された目は赤色の点で表示
   - 検出結果の詳細が下部に表示

3. サングラスエフェクト
   - 顔検出後、サングラスボタンが有効化
   - ボタンをクリックすると目の位置にサングラスを表示
   - サングラスは自動的にフェードアウト

## トラブルシューティング

### よくある問題と解決方法

1. 画像アップロードエラー
   - ファイルサイズが16MB以下であることを確認
   - 対応している画像形式（JPG、JPEG、PNG）であることを確認
   - ブラウザのコンソールでエラーメッセージを確認

2. 顔検出の精度
   - 十分な明るさと解像度の画像を使用
   - 正面を向いた顔写真が最も検出精度が高い
   - 複数の顔が含まれる場合は最も大きい顔を優先

3. サングラスの表示位置
   - 目の検出精度により表示位置が変わる可能性あり
   - 正面を向いた顔写真で最も正確な位置に表示

## ライセンス

MIT License
