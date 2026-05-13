# CSV Changer

CSVファイルをアップロードして、特定のカラム（name, email, phone）のみを抽出するフロント完結型アプリです。

## 技術構成

- Next.js 15.1.3 (App Router)
- TypeScript
- Tailwind CSS
- Papa Parse

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 機能

- CSVファイルのアップロード（.csvのみ）
- name, email, phoneカラムの抽出
- 整形済みCSVのダウンロード
- 空行の自動除外
- UTF-8対応
- すべてブラウザ内で処理（サーバー処理なし）

## 使い方

1. 「CSVファイルを選択」ボタンをクリック
2. CSVファイルを選択
3. 「実行」ボタンをクリック
4. `processed.csv` が自動ダウンロードされます

## 注意事項

- 存在しないカラムがあってもエラーになりません
- 空行は自動的に除外されます
- 1万件程度のデータでも快適に動作します
