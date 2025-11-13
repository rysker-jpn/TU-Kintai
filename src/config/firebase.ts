/**
 * Firebase/Firestore接続設定
 */

import { Firestore } from '@google-cloud/firestore';

let firestoreInstance: Firestore | null = null;

/**
 * Firestoreインスタンスを取得（シングルトン）
 */
export function getFirestore(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const props = PropertiesService.getScriptProperties();
  const projectId = props.getProperty('FIREBASE_PROJECT_ID');
  const clientEmail = props.getProperty('FIREBASE_CLIENT_EMAIL');
  const privateKey = props.getProperty('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase設定が不足しています。Script Propertiesを確認してください。');
  }

  // 改行コードを正しく処理
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  firestoreInstance = new Firestore({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: formattedPrivateKey,
    },
  });

  return firestoreInstance;
}

/**
 * Firebase API Keyを取得
 */
export function getFirebaseApiKey(): string {
  const apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
  if (!apiKey) {
    throw new Error('FIREBASE_API_KEY が未設定です');
  }
  return apiKey;
}

/**
 * Slack Bot Tokenを取得
 */
export function getSlackBotToken(): string | null {
  return PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
}

/**
 * Script Propertiesのセットアップガイドを表示
 */
export function showSetupGuide(): void {
  Logger.log(`
==============================================
Firebase/Firestore セットアップガイド
==============================================

以下の値をScript Propertiesに設定してください：

1. FIREBASE_API_KEY
   - Firebase Console > プロジェクト設定 > 全般 > ウェブAPIキー

2. FIREBASE_PROJECT_ID
   - Firebase Console > プロジェクト設定 > 全般 > プロジェクトID

3. FIREBASE_CLIENT_EMAIL
   - Firebase Console > プロジェクト設定 > サービスアカウント
   - 「新しい秘密鍵の生成」でダウンロードしたJSONの "client_email"

4. FIREBASE_PRIVATE_KEY
   - 同じJSONファイルの "private_key" の値
   - ※ 改行コード(\\n)はそのまま貼り付けてOK

5. SLACK_BOT_TOKEN（オプション）
   - Slack App の Bot User OAuth Token

6. BACKUP_SHEET_ID（オプション）
   - バックアップ用スプレッドシートID

==============================================
設定方法：
1. スクリプトエディタ > プロジェクトの設定 > スクリプト プロパティ
2. 「スクリプト プロパティを追加」をクリック
3. 上記の値を設定
==============================================
  `);
}
