# 🚀 デプロイ手順書

TU勤怠管理システム v2.0 のデプロイ手順です。

---

## 📋 前提条件

- ✅ Firebaseプロジェクト `torchup-kintai2` が作成済み
- ✅ Firestoreが有効化済み
- ✅ サービスアカウントキー（JSON）を取得済み
- ✅ バックアップ用スプレッドシートが作成済み

---

## 🔧 Step 1: Script Propertiesの設定

新しく作成したスプレッドシートで：

1. **拡張機能** > **Apps Script** でエディタを開く
2. ⚙️ **プロジェクトの設定** > **スクリプト プロパティ**
3. 以下の5つの値を設定：

```
FIREBASE_API_KEY:         AIzaSyCUrQd46SrW1tiYxGoaCaCRdiaXBp5C5W0
FIREBASE_PROJECT_ID:      torchup-kintai2
FIREBASE_CLIENT_EMAIL:    <サービスアカウントJSONの client_email>
FIREBASE_PRIVATE_KEY:     <サービスアカウントJSONの private_key>
SLACK_BOT_TOKEN:          <既存のSlack Bot Token>
```

**⚠️ 重要**:
- `FIREBASE_PRIVATE_KEY` の改行コード（`\n`）はそのまま貼り付けてOK
- サービスアカウントキーは**絶対に公開しない**

---

## 📦 Step 2: ビルド（ローカル）

プロジェクトルートで以下を実行：

```bash
# 依存関係のインストール
npm install

# TypeScriptをビルド
npm run build
```

ビルドが成功すると、`dist/Code.js` が生成されます。

---

## 🎯 Step 3: デプロイ

### **方法A: GASエディタから直接デプロイ（簡単・推奨）**

1. Apps Scriptエディタを開く
2. 以下のファイルを作成：
   - **Code.gs** ← `dist/Code.js` の内容をコピー＆ペースト
   - **index.html** ← `src/index.html` の内容をコピー＆ペースト
   - **appsscript.json** ← `src/appsscript.json` の内容をコピー＆ペースト

3. 保存（Ctrl+S または Command+S）

4. **デプロイ** > **新しいデプロイ**
   - 種類: **ウェブアプリ**
   - 説明: `v2.0 初回デプロイ`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
   - 「デプロイ」をクリック

5. **ウェブアプリのURL** をコピー（例: `https://script.google.com/macros/s/.../exec`）

---

### **方法B: clasp経由でデプロイ（上級者向け）**

```bash
# claspにログイン
npx clasp login

# スクリプトIDを指定してクローン（初回のみ）
# スクリプトIDは: 拡張機能 > Apps Script > プロジェクトの設定 から取得
npx clasp clone <YOUR_SCRIPT_ID>

# ビルド＆プッシュ
npm run build
npx clasp push

# デプロイ
npx clasp deploy --description "v2.0 初回デプロイ"
```

---

## ✅ Step 4: 動作確認

1. デプロイされた**ウェブアプリのURL**にアクセス
2. Firebase認証でユーザー登録
3. 勤怠打刻を試す（出勤 → 休憩 → 休憩戻り → 退勤）
4. Firestoreでデータが保存されているか確認
5. バックアップスプレッドシートにもデータが記録されているか確認

---

## 🔍 トラブルシューティング

### **エラー: "FIREBASE_API_KEY が未設定です"**
→ Script Propertiesに5つの値がすべて設定されているか確認

### **エラー: "Firestore設定が不足しています"**
→ `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` が正しいか確認

### **打刻後、スプレッドシートに書き込まれない**
→ バックアップスプレッドシートIDが正しいか確認（`src/config/constants.ts` の `BACKUP_SHEET_ID`）

### **Slack通知が来ない**
→ `SLACK_BOT_TOKEN` が正しく設定されているか確認

---

## 📝 初回ユーザー登録時の注意

**初回登録ユーザーは自動的に `admin` 権限が付与されます。**

- 2人目以降は `member` 権限
- 権限の変更はFirestoreの `users` コレクションから手動で変更可能

---

## 🔄 更新時のデプロイ

コードを修正した場合：

```bash
# ビルド
npm run build

# 方法A: GASエディタからCode.gsを更新

# 方法B: claspでプッシュ
npx clasp push

# 新しいバージョンとしてデプロイ
npx clasp deploy --description "v2.1 バグ修正"
```

---

## 📊 Firestoreコンソールでのデータ確認

Firebase Console > Firestore Database で以下のコレクションを確認：

- `users` - ユーザー情報
- `kintai` - 打刻記録
- `worksum` - 勤務時間サマリー
- `shifts` - シフト情報
- `shift_requests` - シフト修正申請
- `daily_reports` - 日報

---

## 🎉 デプロイ完了！

問題がなければ、以下のURLで本番環境が稼働します：

```
https://script.google.com/macros/s/<YOUR_SCRIPT_ID>/exec
```

このURLをブックマークしてチームに共有してください！
