# 🔥 TU勤怠管理システム v2.0

Firestore + Google Apps Script による高速勤怠管理システム

## 🚀 機能

### コア機能
- ✅ 勤怠打刻（出勤/休憩/休憩戻り/退勤）- オフィス/リモート対応
- ✅ 日報機能（Slack連携）
- ✅ シフト提出・一覧表示（カレンダー/リスト表示）
- ✅ シフト締切・ロック機能（前月26日〜、作成後10分以内のみ編集可）
- ✅ シフト修正依頼（ロック後の申請フロー）
- ✅ 管理者による承認/拒否

### 新機能（v2.0）
- 🆕 打刻修正申請
- 🆕 管理者向け月次実績レポート
- 🆕 日程調整ビュー（全員が出勤している日時の可視化）
- 🆕 打刻リマインダー（シフト時刻+10分で未打刻時にSlack DM）
- 🆕 休憩時のSlack通知

## 📊 アーキテクチャ

- **メインDB**: Firestore（高速読み書き）
- **バックアップ**: Google Spreadsheet（記録・閲覧用）
- **認証**: Firebase Authentication
- **通知**: Slack API

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firestore設定

1. Firebase Consoleでプロジェクトを作成
2. Firestoreを有効化
3. サービスアカウントキーをダウンロード（`service-account-key.json`）
4. Script PropertiesにFirestore設定を追加

### 3. ビルドとデプロイ

```bash
# ビルド
npm run build

# GASにプッシュ
npm run push

# デプロイ
npm run deploy
```

## 📂 プロジェクト構造

```
/src
  /config
    firebase.ts          # Firestore接続設定
    constants.ts         # 定数定義
  /models
    User.ts, Kintai.ts, Shift.ts
  /repositories
    FirestoreRepository.ts
    SpreadsheetRepository.ts
  /services
    AuthService.ts
    KintaiService.ts
    ShiftService.ts
    NotificationService.ts
    ReminderService.ts
  /api
    attendance.ts, shifts.ts, reports.ts
  /utils
    date.ts, cache.ts
  /triggers
    reminders.ts         # 時間トリガー
  main.ts
```

## 🔐 環境変数

Script Propertiesに以下を設定：

- `FIREBASE_API_KEY`: Firebase API Key
- `FIREBASE_PROJECT_ID`: Firestore Project ID
- `FIREBASE_CLIENT_EMAIL`: Service Account Email
- `FIREBASE_PRIVATE_KEY`: Service Account Private Key
- `SLACK_BOT_TOKEN`: Slack Bot Token
- `BACKUP_SHEET_ID`: バックアップ用スプレッドシートID

## 📝 Firestore無料枠

- **読取**: 50,000/日
- **書込**: 20,000/日
- **削除**: 20,000/日

**50名での想定負荷**: 約1,000〜2,000操作/日 → 無料枠で十分対応可能 ✅

## 📄 ライセンス

Private
