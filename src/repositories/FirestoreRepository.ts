/**
 * Firestoreリポジトリ
 * データの永続化・取得を担当
 * FirestoreApp ライブラリを使用（GAS専用）
 */

import { getFirestore, fieldsToObject, objectToFields } from '../config/firebase';
import { COLLECTIONS } from '../config/constants';
import {
  User,
  UserCreateInput,
  UserUpdateInput,
} from '../models/User';
import {
  KintaiRecord,
  KintaiRecordInput,
  WorkSummary,
  CorrectionRequest,
  CorrectionRequestInput,
  DailyReport,
  DailyReportInput,
} from '../models/Kintai';
import {
  ShiftEntry,
  ShiftEntryInput,
  ShiftChangeRequest,
  ShiftChangeRequestInput,
} from '../models/Shift';

const db = () => getFirestore();

/* ========== ユーザー管理 ========== */

/**
 * ユーザーを作成または更新
 */
export async function upsertUser(input: UserCreateInput): Promise<User> {
  try {
    Logger.log(`[DEBUG] upsertUser: uid=${input.uid}`);
    const now = new Date();
    const docPath = `${COLLECTIONS.USERS}/${input.uid}`;

    Logger.log('[DEBUG] upsertUser: 既存ドキュメントをチェックします');
    let existingDoc;
    try {
      existingDoc = db().getDocument(docPath);
    } catch (error) {
      // ドキュメントが存在しない場合はnullとして扱う
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('not found')) {
        Logger.log('[DEBUG] upsertUser: ドキュメントが存在しません（新規作成）');
        existingDoc = null;
      } else {
        throw error;
      }
    }

    if (existingDoc) {
      Logger.log('[DEBUG] upsertUser: 既存ユーザーを更新します');
      // 既存ユーザーの更新
      const existing = fieldsToObject(existingDoc.fields) as User;
      const updated: Partial<User> = {
        email: input.email || existing.email,
        displayName: input.displayName || existing.displayName,
        updatedAt: now,
      };
      const fields = objectToFields(updated);
      db().updateDocument(docPath, fields, true);
      Logger.log('[DEBUG] upsertUser: 既存ユーザー更新完了');
      return { ...existing, ...updated } as User;
    } else {
      Logger.log('[DEBUG] upsertUser: 新規ユーザーを作成します');
      // 新規ユーザーの作成
      const newUser: User = {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        role: input.role || 'member',
        status: input.status || 'active',
        createdAt: now,
        updatedAt: now,
      };
      Logger.log(`[DEBUG] upsertUser: newUser=${JSON.stringify(newUser)}`);
      const fields = objectToFields(newUser);
      Logger.log('[DEBUG] upsertUser: createDocument を呼び出します');
      db().createDocument(COLLECTIONS.USERS, fields, input.uid);
      Logger.log('[DEBUG] upsertUser: 新規ユーザー作成完了');
      return newUser;
    }
  } catch (error) {
    Logger.log(`[DEBUG] upsertUser エラー: ${error}`);
    throw error;
  }
}

/**
 * ユーザーを取得
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    const docPath = `${COLLECTIONS.USERS}/${uid}`;
    const doc = db().getDocument(docPath);
    if (!doc) return null;
    return fieldsToObject(doc.fields) as User;
  } catch (error) {
    // デバッグログ: エラーの詳細を確認
    Logger.log(`[DEBUG] getUser catch error:${error}`);
    Logger.log(`[DEBUG] error type: ${typeof error}`);
    Logger.log(`[DEBUG] error instanceof Error: ${error instanceof Error}`);

    // ドキュメントが存在しない場合はnullを返す
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log(`[DEBUG] errorMessage: ${errorMessage}`);
    Logger.log(`[DEBUG] includes 'not found': ${errorMessage.toLowerCase().includes('not found')}`);

    if (errorMessage.toLowerCase().includes('not found')) {
      Logger.log('[DEBUG] Returning null for not found error');
      return null;
    }
    // その他のエラーは再スロー
    Logger.log('[DEBUG] Re-throwing error');
    throw error;
  }
}

/**
 * ユーザーを更新
 */
export async function updateUser(uid: string, input: UserUpdateInput): Promise<void> {
  const docPath = `${COLLECTIONS.USERS}/${uid}`;
  const updateData = {
    ...input,
    updatedAt: new Date(),
  };
  const fields = objectToFields(updateData);
  db().updateDocument(docPath, fields, true);
}

/**
 * 全ユーザーを取得
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    Logger.log('[DEBUG] getAllUsers: クエリを実行します');
    const docs = db().query(COLLECTIONS.USERS).Execute();
    Logger.log(`[DEBUG] getAllUsers: ${docs ? docs.length : 0}件取得しました`);
    return docs.map((doc) => fieldsToObject(doc.fields) as User);
  } catch (error) {
    Logger.log(`[DEBUG] getAllUsers エラー: ${error}`);
    throw error;
  }
}

/* ========== 勤怠打刻 ========== */

/**
 * 打刻記録を作成
 */
export async function createKintaiRecord(input: KintaiRecordInput): Promise<string> {
  const recordId = `K${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const record: KintaiRecord = {
    recordId,
    ...input,
  };

  const collectionPath = `${COLLECTIONS.KINTAI}/${input.uid}/records`;
  const fields = objectToFields(record);
  db().createDocument(collectionPath, fields, recordId);

  return recordId;
}

/**
 * 指定日の打刻記録を取得
 */
export async function getKintaiRecordsByDate(uid: string, date: string): Promise<KintaiRecord[]> {
  const collectionPath = `${COLLECTIONS.KINTAI}/${uid}/records`;
  const docs = db()
    .query(collectionPath)
    .Where('date', '==', date)
    .OrderBy('timestamp', 'ASCENDING')
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as KintaiRecord);
}

/**
 * 指定期間の打刻記録を取得
 */
export async function getKintaiRecordsByRange(
  uid: string,
  startDate: Date,
  endDate: Date
): Promise<KintaiRecord[]> {
  const collectionPath = `${COLLECTIONS.KINTAI}/${uid}/records`;
  const docs = db()
    .query(collectionPath)
    .Where('timestamp', '>=', startDate)
    .Where('timestamp', '<', endDate)
    .OrderBy('timestamp', 'ASCENDING')
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as KintaiRecord);
}

/**
 * 最新N件の打刻記録を取得（今日の状態確認用）
 */
export async function getRecentKintaiRecords(uid: string, limit: number = 10): Promise<KintaiRecord[]> {
  const collectionPath = `${COLLECTIONS.KINTAI}/${uid}/records`;
  const docs = db()
    .query(collectionPath)
    .OrderBy('timestamp', 'DESCENDING')
    .Limit(limit)
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as KintaiRecord).reverse();
}

/* ========== 勤務時間サマリー ========== */

/**
 * 勤務時間サマリーを保存
 */
export async function saveWorkSummary(summary: WorkSummary): Promise<void> {
  const [year, month] = summary.date.split('/').map(Number);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const collectionPath = `${COLLECTIONS.WORKSUM}/${summary.uid}/${monthKey}/daily/${summary.date}`;
  const fields = objectToFields(summary);
  db().createDocument(collectionPath, fields, 'summary');
}

/**
 * 指定月の勤務時間サマリーを取得
 * Note: FirestoreAppにはlistCollections相当の機能がないため、月の全日付を試行
 */
export async function getWorkSummaryByMonth(uid: string, year: number, month: number): Promise<WorkSummary[]> {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const summaries: WorkSummary[] = [];

  // 月の日数を取得
  const daysInMonth = new Date(year, month, 0).getDate();

  // 各日付のサマリーを取得
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}/${month}/${day}`;
    const docPath = `${COLLECTIONS.WORKSUM}/${uid}/${monthKey}/daily/${date}/summary`;
    const doc = db().getDocument(docPath);
    if (doc) {
      summaries.push(fieldsToObject(doc.fields) as WorkSummary);
    }
  }

  return summaries;
}

/* ========== シフト管理 ========== */

/**
 * シフトエントリーを保存（作成/更新）
 */
export async function saveShiftEntry(input: ShiftEntryInput): Promise<string> {
  const entryId = input.entryId || `S${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date();

  const entry: ShiftEntry = {
    entryId,
    uid: input.uid,
    userName: input.userName,
    date: input.date,
    kind: input.kind,
    start: input.start,
    end: input.end,
    memo: input.memo || '',
    createdAt: now,
    updatedAt: now,
  };

  const collectionPath = `${COLLECTIONS.SHIFTS}/${input.uid}/entries`;
  const docPath = `${collectionPath}/${entryId}`;

  // 既存ドキュメントをチェック
  const existingDoc = db().getDocument(docPath);
  const fields = objectToFields(entry);

  if (existingDoc) {
    db().updateDocument(docPath, fields, true);
  } else {
    db().createDocument(collectionPath, fields, entryId);
  }

  return entryId;
}

/**
 * シフトエントリーを取得
 */
export async function getShiftEntry(uid: string, entryId: string): Promise<ShiftEntry | null> {
  const docPath = `${COLLECTIONS.SHIFTS}/${uid}/entries/${entryId}`;
  const doc = db().getDocument(docPath);

  if (!doc) return null;
  return fieldsToObject(doc.fields) as ShiftEntry;
}

/**
 * 指定期間のシフトエントリーを取得
 */
export async function getShiftEntriesByRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<ShiftEntry[]> {
  const collectionPath = `${COLLECTIONS.SHIFTS}/${uid}/entries`;
  const docs = db()
    .query(collectionPath)
    .Where('date', '>=', startDate)
    .Where('date', '<', endDate)
    .OrderBy('date', 'ASCENDING')
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as ShiftEntry);
}

/**
 * 全ユーザーの指定期間のシフトエントリーを取得
 */
export async function getAllShiftEntriesByRange(
  startDate: string,
  endDate: string
): Promise<ShiftEntry[]> {
  const users = await getAllUsers();
  const allEntries: ShiftEntry[] = [];

  for (const user of users) {
    const entries = await getShiftEntriesByRange(user.uid, startDate, endDate);
    allEntries.push(...entries);
  }

  return allEntries;
}

/**
 * シフトエントリーを削除
 */
export async function deleteShiftEntry(uid: string, entryId: string): Promise<void> {
  const docPath = `${COLLECTIONS.SHIFTS}/${uid}/entries/${entryId}`;
  db().deleteDocument(docPath);
}

/* ========== シフト修正申請 ========== */

/**
 * シフト修正申請を作成
 */
export async function createShiftChangeRequest(
  input: ShiftChangeRequestInput
): Promise<string> {
  const requestId = `SR${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const request: ShiftChangeRequest = {
    requestId,
    ...input,
    status: 'pending',
    createdAt: new Date(),
  };

  const fields = objectToFields(request);
  db().createDocument(COLLECTIONS.SHIFT_REQUESTS, fields, requestId);
  return requestId;
}

/**
 * 保留中のシフト修正申請を取得
 */
export async function getPendingShiftChangeRequests(): Promise<ShiftChangeRequest[]> {
  const docs = db()
    .query(COLLECTIONS.SHIFT_REQUESTS)
    .Where('status', '==', 'pending')
    .OrderBy('createdAt', 'DESCENDING')
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as ShiftChangeRequest);
}

/**
 * シフト修正申請を承認
 */
export async function approveShiftChangeRequest(requestId: string): Promise<ShiftChangeRequest | null> {
  const docPath = `${COLLECTIONS.SHIFT_REQUESTS}/${requestId}`;
  const doc = db().getDocument(docPath);
  if (!doc) return null;

  const request = fieldsToObject(doc.fields) as ShiftChangeRequest;
  const fields = objectToFields({ status: 'approved' });
  db().updateDocument(docPath, fields, true);

  return request;
}

/**
 * シフト修正申請を却下
 */
export async function denyShiftChangeRequest(requestId: string): Promise<void> {
  const docPath = `${COLLECTIONS.SHIFT_REQUESTS}/${requestId}`;
  const fields = objectToFields({ status: 'denied' });
  db().updateDocument(docPath, fields, true);
}

/**
 * シフト修正申請を削除
 */
export async function deleteShiftChangeRequest(requestId: string): Promise<void> {
  const docPath = `${COLLECTIONS.SHIFT_REQUESTS}/${requestId}`;
  db().deleteDocument(docPath);
}

/* ========== 打刻修正申請 ========== */

/**
 * 打刻修正申請を作成
 */
export async function createCorrectionRequest(
  input: CorrectionRequestInput
): Promise<string> {
  const requestId = `CR${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const request: CorrectionRequest = {
    requestId,
    ...input,
    status: 'pending',
    createdAt: new Date(),
  };

  const fields = objectToFields(request);
  db().createDocument(COLLECTIONS.CORRECTION_REQUESTS, fields, requestId);
  return requestId;
}

/**
 * 保留中の打刻修正申請を取得
 */
export async function getPendingCorrectionRequests(): Promise<CorrectionRequest[]> {
  const docs = db()
    .query(COLLECTIONS.CORRECTION_REQUESTS)
    .Where('status', '==', 'pending')
    .OrderBy('createdAt', 'DESCENDING')
    .Execute();

  return docs.map((doc) => fieldsToObject(doc.fields) as CorrectionRequest);
}

/**
 * 打刻修正申請を承認
 */
export async function approveCorrectionRequest(requestId: string): Promise<CorrectionRequest | null> {
  const docPath = `${COLLECTIONS.CORRECTION_REQUESTS}/${requestId}`;
  const doc = db().getDocument(docPath);
  if (!doc) return null;

  const request = fieldsToObject(doc.fields) as CorrectionRequest;
  const fields = objectToFields({ status: 'approved' });
  db().updateDocument(docPath, fields, true);

  return request;
}

/**
 * 打刻修正申請を却下
 */
export async function denyCorrectionRequest(requestId: string): Promise<void> {
  const docPath = `${COLLECTIONS.CORRECTION_REQUESTS}/${requestId}`;
  const fields = objectToFields({ status: 'denied' });
  db().updateDocument(docPath, fields, true);
}

/**
 * 打刻修正申請を削除
 */
export async function deleteCorrectionRequest(requestId: string): Promise<void> {
  const docPath = `${COLLECTIONS.CORRECTION_REQUESTS}/${requestId}`;
  db().deleteDocument(docPath);
}

/* ========== 日報 ========== */

/**
 * 日報を保存
 */
export async function saveDailyReport(input: DailyReportInput): Promise<void> {
  const report: DailyReport = {
    ...input,
    updatedAt: new Date(),
  };

  const collectionPath = `${COLLECTIONS.DAILY_REPORTS}/${input.uid}/${input.date}`;
  const docPath = `${collectionPath}/report`;
  const fields = objectToFields(report);

  // 既存ドキュメントをチェック
  const existingDoc = db().getDocument(docPath);
  if (existingDoc) {
    db().updateDocument(docPath, fields, false);
  } else {
    db().createDocument(collectionPath, fields, 'report');
  }
}

/**
 * 日報を取得
 */
export async function getDailyReport(uid: string, date: string): Promise<DailyReport | null> {
  const docPath = `${COLLECTIONS.DAILY_REPORTS}/${uid}/${date}/report`;
  const doc = db().getDocument(docPath);

  if (!doc) return null;
  return fieldsToObject(doc.fields) as DailyReport;
}
