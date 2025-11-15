/**
 * Firebase/Firestore接続設定
 * FirestoreApp ライブラリを使用（GAS専用）
 */

// FirestoreApp の型定義（GASライブラリ）
declare namespace FirestoreApp {
  interface Firestore {
    getDocument(path: string): FirestoreDocument | null;
    getDocuments(paths: string[]): FirestoreDocument[];
    createDocument(collection: string, fields: any, documentId?: string): FirestoreDocument;
    updateDocument(path: string, fields: any, mask?: boolean): FirestoreDocument;
    deleteDocument(path: string): void;
    query(collection: string): Query;
    getDocumentsByIds(collection: string, documentIds: string[]): FirestoreDocument[];
  }

  interface Query {
    Where(field: string, operator: string, value: any): Query;
    OrderBy(field: string, direction?: 'ASCENDING' | 'DESCENDING'): Query;
    Limit(limit: number): Query;
    Offset(offset: number): Query;
    Select(...fields: string[]): Query;
    Execute(): FirestoreDocument[];
  }

  interface FirestoreDocument {
    name: string;
    fields: any;
    createTime: string;
    updateTime: string;
  }

  function getFirestore(email: string, key: string, projectId: string): Firestore;
}

let firestoreInstance: FirestoreApp.Firestore | null = null;

/**
 * Firestoreインスタンスを取得（シングルトン）
 */
export function getFirestore(): FirestoreApp.Firestore {
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

  firestoreInstance = FirestoreApp.getFirestore(clientEmail, formattedPrivateKey, projectId);

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
 * FirestoreDocumentの fields を JavaScript オブジェクトに変換
 */
export function fieldsToObject(fields: any): any {
  if (!fields) return {};

  const result: any = {};

  for (const key in fields) {
    const field = fields[key];

    // Firestoreのフィールド型を適切に変換
    if (field.stringValue !== undefined) {
      result[key] = field.stringValue;
    } else if (field.integerValue !== undefined) {
      result[key] = parseInt(field.integerValue);
    } else if (field.doubleValue !== undefined) {
      result[key] = parseFloat(field.doubleValue);
    } else if (field.booleanValue !== undefined) {
      result[key] = field.booleanValue;
    } else if (field.timestampValue !== undefined) {
      result[key] = new Date(field.timestampValue);
    } else if (field.arrayValue && field.arrayValue.values) {
      result[key] = field.arrayValue.values.map((v: any) => fieldsToObject({ temp: v }).temp);
    } else if (field.mapValue && field.mapValue.fields) {
      result[key] = fieldsToObject(field.mapValue.fields);
    } else if (field.nullValue !== undefined) {
      result[key] = null;
    } else {
      result[key] = field;
    }
  }

  return result;
}

/**
 * JavaScriptオブジェクトをFirestoreのfields形式に変換
 */
export function objectToFields(obj: any): any {
  const fields: any = {};

  for (const key in obj) {
    const value = obj[key];

    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((item) => {
            const temp = objectToFields({ temp: item });
            return temp.temp;
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: objectToFields(value) } };
    } else {
      // その他の型はそのまま
      fields[key] = value;
    }
  }

  return fields;
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

==============================================
設定方法：
1. スクリプトエディタ > プロジェクトの設定 > スクリプト プロパティ
2. 「スクリプト プロパティを追加」をクリック
3. 上記の値を設定
==============================================

==============================================
GASライブラリの追加（重要！）
==============================================

Apps Scriptエディタで以下のライブラリを追加してください：

1. 左サイドバーの「ライブラリ +」をクリック
2. 以下のスクリプトIDを入力：
   1VUSl4b1r1eoNcRWotZM3e87ygkxvXltOgyDZhixqncz9lQ3MjfT1iKFw
3. 「検索」をクリック
4. バージョン: 最新版を選択
5. 識別子: FirestoreApp（そのまま）
6. 「追加」をクリック

==============================================
  `);
}
