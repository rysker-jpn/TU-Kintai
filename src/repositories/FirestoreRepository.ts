/**
 * Firestoreリポジトリ
 * データの永続化・取得を担当
 */

import { getFirestore } from '../config/firebase';
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
} from '../models/Kintai';
import {
  ShiftEntry,
  ShiftEntryInput,
  ShiftChangeRequest,
  ShiftChangeRequestInput,
  DailyReport,
  DailyReportInput,
} from '../models/Shift';

const db = () => getFirestore();

/* ========== ユーザー管理 ========== */

/**
 * ユーザーを作成または更新
 */
export async function upsertUser(input: UserCreateInput): Promise<User> {
  const now = new Date();
  const userRef = db().collection(COLLECTIONS.USERS).doc(input.uid);
  const doc = await userRef.get();

  if (doc.exists) {
    // 既存ユーザーの更新
    const existing = doc.data() as any;
    const updated: Partial<User> = {
      email: input.email || existing.email,
      displayName: input.displayName || existing.displayName,
      updatedAt: now,
    };
    await userRef.update(updated);
    return { ...existing, ...updated } as User;
  } else {
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
    await userRef.set(newUser);
    return newUser;
  }
}

/**
 * ユーザーを取得
 */
export async function getUser(uid: string): Promise<User | null> {
  const doc = await db().collection(COLLECTIONS.USERS).doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as User;
}

/**
 * ユーザーを更新
 */
export async function updateUser(uid: string, input: UserUpdateInput): Promise<void> {
  const userRef = db().collection(COLLECTIONS.USERS).doc(uid);
  await userRef.update({
    ...input,
    updatedAt: new Date(),
  });
}

/**
 * 全ユーザーを取得
 */
export async function getAllUsers(): Promise<User[]> {
  const snapshot = await db().collection(COLLECTIONS.USERS).get();
  return snapshot.docs.map((doc) => doc.data() as User);
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

  await db()
    .collection(COLLECTIONS.KINTAI)
    .doc(input.uid)
    .collection('records')
    .doc(recordId)
    .set(record);

  return recordId;
}

/**
 * 指定日の打刻記録を取得
 */
export async function getKintaiRecordsByDate(uid: string, date: string): Promise<KintaiRecord[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.KINTAI)
    .doc(uid)
    .collection('records')
    .where('date', '==', date)
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as KintaiRecord);
}

/**
 * 指定期間の打刻記録を取得
 */
export async function getKintaiRecordsByRange(
  uid: string,
  startDate: Date,
  endDate: Date
): Promise<KintaiRecord[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.KINTAI)
    .doc(uid)
    .collection('records')
    .where('timestamp', '>=', startDate)
    .where('timestamp', '<', endDate)
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as KintaiRecord);
}

/**
 * 最新N件の打刻記録を取得（今日の状態確認用）
 */
export async function getRecentKintaiRecords(uid: string, limit: number = 10): Promise<KintaiRecord[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.KINTAI)
    .doc(uid)
    .collection('records')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as KintaiRecord).reverse();
}

/* ========== 勤務時間サマリー ========== */

/**
 * 勤務時間サマリーを保存
 */
export async function saveWorkSummary(summary: WorkSummary): Promise<void> {
  const [year, month] = summary.date.split('/').map(Number);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  await db()
    .collection(COLLECTIONS.WORKSUM)
    .doc(summary.uid)
    .collection(monthKey)
    .doc('daily')
    .collection(summary.date)
    .doc('summary')
    .set(summary);
}

/**
 * 指定月の勤務時間サマリーを取得
 */
export async function getWorkSummaryByMonth(uid: string, year: number, month: number): Promise<WorkSummary[]> {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const snapshot = await db()
    .collection(COLLECTIONS.WORKSUM)
    .doc(uid)
    .collection(monthKey)
    .doc('daily')
    .listCollections();

  const summaries: WorkSummary[] = [];
  for (const collection of snapshot) {
    const doc = await collection.doc('summary').get();
    if (doc.exists) {
      summaries.push(doc.data() as WorkSummary);
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

  await db()
    .collection(COLLECTIONS.SHIFTS)
    .doc(input.uid)
    .collection('entries')
    .doc(entryId)
    .set(entry, { merge: true });

  return entryId;
}

/**
 * シフトエントリーを取得
 */
export async function getShiftEntry(uid: string, entryId: string): Promise<ShiftEntry | null> {
  const doc = await db()
    .collection(COLLECTIONS.SHIFTS)
    .doc(uid)
    .collection('entries')
    .doc(entryId)
    .get();

  if (!doc.exists) return null;
  return doc.data() as ShiftEntry;
}

/**
 * 指定期間のシフトエントリーを取得
 */
export async function getShiftEntriesByRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<ShiftEntry[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.SHIFTS)
    .doc(uid)
    .collection('entries')
    .where('date', '>=', startDate)
    .where('date', '<', endDate)
    .orderBy('date', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as ShiftEntry);
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
  await db()
    .collection(COLLECTIONS.SHIFTS)
    .doc(uid)
    .collection('entries')
    .doc(entryId)
    .delete();
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

  await db().collection(COLLECTIONS.SHIFT_REQUESTS).doc(requestId).set(request);
  return requestId;
}

/**
 * 保留中のシフト修正申請を取得
 */
export async function getPendingShiftChangeRequests(): Promise<ShiftChangeRequest[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.SHIFT_REQUESTS)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as ShiftChangeRequest);
}

/**
 * シフト修正申請を承認
 */
export async function approveShiftChangeRequest(requestId: string): Promise<ShiftChangeRequest | null> {
  const doc = await db().collection(COLLECTIONS.SHIFT_REQUESTS).doc(requestId).get();
  if (!doc.exists) return null;

  const request = doc.data() as ShiftChangeRequest;
  await doc.ref.update({ status: 'approved' });

  return request;
}

/**
 * シフト修正申請を却下
 */
export async function denyShiftChangeRequest(requestId: string): Promise<void> {
  await db().collection(COLLECTIONS.SHIFT_REQUESTS).doc(requestId).update({
    status: 'denied',
  });
}

/**
 * シフト修正申請を削除
 */
export async function deleteShiftChangeRequest(requestId: string): Promise<void> {
  await db().collection(COLLECTIONS.SHIFT_REQUESTS).doc(requestId).delete();
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

  await db().collection(COLLECTIONS.CORRECTION_REQUESTS).doc(requestId).set(request);
  return requestId;
}

/**
 * 保留中の打刻修正申請を取得
 */
export async function getPendingCorrectionRequests(): Promise<CorrectionRequest[]> {
  const snapshot = await db()
    .collection(COLLECTIONS.CORRECTION_REQUESTS)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as CorrectionRequest);
}

/**
 * 打刻修正申請を承認
 */
export async function approveCorrectionRequest(requestId: string): Promise<CorrectionRequest | null> {
  const doc = await db().collection(COLLECTIONS.CORRECTION_REQUESTS).doc(requestId).get();
  if (!doc.exists) return null;

  const request = doc.data() as CorrectionRequest;
  await doc.ref.update({ status: 'approved' });

  return request;
}

/**
 * 打刻修正申請を却下
 */
export async function denyCorrectionRequest(requestId: string): Promise<void> {
  await db().collection(COLLECTIONS.CORRECTION_REQUESTS).doc(requestId).update({
    status: 'denied',
  });
}

/**
 * 打刻修正申請を削除
 */
export async function deleteCorrectionRequest(requestId: string): Promise<void> {
  await db().collection(COLLECTIONS.CORRECTION_REQUESTS).doc(requestId).delete();
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

  await db()
    .collection(COLLECTIONS.DAILY_REPORTS)
    .doc(input.uid)
    .collection(input.date)
    .doc('report')
    .set(report);
}

/**
 * 日報を取得
 */
export async function getDailyReport(uid: string, date: string): Promise<DailyReport | null> {
  const doc = await db()
    .collection(COLLECTIONS.DAILY_REPORTS)
    .doc(uid)
    .collection(date)
    .doc('report')
    .get();

  if (!doc.exists) return null;
  return doc.data() as DailyReport;
}
