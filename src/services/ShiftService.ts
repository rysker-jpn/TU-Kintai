/**
 * シフトサービス
 * シフト管理・修正申請を担当
 */

import {
  saveShiftEntry,
  getShiftEntry,
  getShiftEntriesByRange,
  getAllShiftEntriesByRange,
  deleteShiftEntry as deleteShiftEntryFromFirestore,
  createShiftChangeRequest,
  getPendingShiftChangeRequests,
  approveShiftChangeRequest,
  denyShiftChangeRequest,
  deleteShiftChangeRequest,
} from '../repositories/FirestoreRepository';
import {
  backupShiftEntry,
  deleteShiftEntryFromBackup,
  backupShiftChangeRequest,
  deleteShiftChangeRequestFromBackup,
} from '../repositories/SpreadsheetRepository';
import { ERROR_MESSAGES } from '../config/constants';
import { parseYmd, isShiftLocked, toYmd } from '../utils/date';
import {
  ShiftEntry,
  ShiftEntryInput,
  ShiftChangeRequestInput,
  ShiftChangeRequest,
} from '../models/Shift';
import { User } from '../models/User';

/**
 * シフトエントリーを保存（作成/更新）
 */
export async function saveShift(
  user: User,
  input: ShiftEntryInput
): Promise<string> {
  const now = new Date();
  const targetDate = parseYmd(input.date);

  if (!targetDate) {
    throw new Error('無効な日付です');
  }

  if (!input.start || !input.end) {
    throw new Error(ERROR_MESSAGES.MISSING_FIELDS);
  }

  // 既存エントリーの場合、ロックチェック
  if (input.entryId) {
    const existing = await getShiftEntry(user.uid, input.entryId);
    if (existing) {
      const locked = isShiftLocked(targetDate, existing.createdAt, now);
      if (locked) {
        throw new Error(ERROR_MESSAGES.LOCKED);
      }
    }
  }

  const entryId = await saveShiftEntry({
    ...input,
    uid: user.uid,
    userName: user.displayName,
  });

  // バックアップ
  const entry = await getShiftEntry(user.uid, entryId);
  if (entry) {
    backupShiftEntry(entry);
  }

  return entryId;
}

/**
 * シフトエントリーを削除
 */
export async function deleteShift(
  user: User,
  entryId: string
): Promise<void> {
  const entry = await getShiftEntry(user.uid, entryId);
  if (!entry) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND);
  }

  const now = new Date();
  const targetDate = parseYmd(entry.date);
  if (!targetDate) {
    throw new Error('無効な日付です');
  }

  // ロックチェック
  const locked = isShiftLocked(targetDate, entry.createdAt, now);
  if (locked) {
    throw new Error(ERROR_MESSAGES.LOCKED);
  }

  await deleteShiftEntryFromFirestore(user.uid, entryId);
  deleteShiftEntryFromBackup(entryId);
}

/**
 * 指定期間のシフトエントリーを取得（自分のみ）
 */
export async function getMyShifts(
  uid: string,
  startDate: string,
  endDate: string
): Promise<ShiftEntry[]> {
  const entries = await getShiftEntriesByRange(uid, startDate, endDate);

  // ロック状態と申請中状態を付与
  const now = new Date();
  const pendingRequests = await getPendingShiftChangeRequests();
  const pendingMap = new Map(
    pendingRequests.map((req) => [
      req.entryId,
      {
        kind: req.after.kind,
        start: req.after.start,
        end: req.after.end,
        reason: req.reason,
      },
    ])
  );

  return entries.map((entry) => {
    const targetDate = parseYmd(entry.date);
    const locked = targetDate
      ? isShiftLocked(targetDate, entry.createdAt, now)
      : false;

    const pending = pendingMap.has(entry.entryId);
    const pendingDiff = pending ? pendingMap.get(entry.entryId) || null : null;

    return {
      ...entry,
      locked,
      pending,
      pendingDiff,
    };
  });
}

/**
 * 指定期間のシフトエントリーを取得（全ユーザー）
 */
export async function getAllShifts(
  startDate: string,
  endDate: string
): Promise<ShiftEntry[]> {
  return await getAllShiftEntriesByRange(startDate, endDate);
}

/**
 * シフト修正申請を作成
 */
export async function createShiftModificationRequest(
  user: User,
  input: Omit<ShiftChangeRequestInput, 'uid' | 'userName'>
): Promise<string> {
  if (!input.reason || !input.reason.trim()) {
    throw new Error('理由は必須です');
  }

  // 対象エントリーが存在するか確認
  const entry = await getShiftEntry(user.uid, input.entryId);
  if (!entry) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND);
  }

  // before情報はエントリーから取得
  const requestInput: ShiftChangeRequestInput = {
    entryId: input.entryId,
    uid: user.uid,
    userName: user.displayName,
    date: entry.date,
    before: {
      kind: entry.kind,
      start: entry.start,
      end: entry.end,
    },
    after: input.after,
    reason: input.reason,
  };

  const requestId = await createShiftChangeRequest(requestInput);

  // バックアップ
  backupShiftChangeRequest(requestId, {
    ...requestInput,
    createdAt: new Date(),
  });

  return requestId;
}

/**
 * 保留中のシフト修正申請を取得（管理者用）
 */
export async function getPendingRequests(): Promise<ShiftChangeRequest[]> {
  return await getPendingShiftChangeRequests();
}

/**
 * シフト修正申請を承認（管理者用）
 */
export async function approveRequest(requestId: string): Promise<void> {
  const request = await approveShiftChangeRequest(requestId);
  if (!request) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND);
  }

  // シフトエントリーを更新
  await saveShiftEntry({
    entryId: request.entryId,
    uid: request.uid,
    userName: request.userName,
    date: request.date,
    kind: request.after.kind,
    start: request.after.start,
    end: request.after.end,
    memo: '', // 既存のmemoは保持したいが、ここでは取得できないので空欄
  });

  // 申請を削除
  await deleteShiftChangeRequest(requestId);
  deleteShiftChangeRequestFromBackup(requestId);

  // 更新されたエントリーをバックアップ
  const updatedEntry = await getShiftEntry(request.uid, request.entryId);
  if (updatedEntry) {
    backupShiftEntry(updatedEntry);
  }
}

/**
 * シフト修正申請を却下（管理者用）
 */
export async function denyRequest(requestId: string): Promise<void> {
  await denyShiftChangeRequest(requestId);
  await deleteShiftChangeRequest(requestId);
  deleteShiftChangeRequestFromBackup(requestId);
}

/**
 * 日程調整ビュー：指定期間で全員が出勤している日を抽出
 */
export async function getCommonWorkingDays(
  startDate: string,
  endDate: string,
  userIds: string[]
): Promise<
  Array<{
    date: string;
    users: Array<{ uid: string; userName: string; kind: string; start: string; end: string }>;
  }>
> {
  const allShifts = await getAllShiftEntriesByRange(startDate, endDate);

  // 日付ごとにグループ化
  const byDate: { [date: string]: ShiftEntry[] } = {};
  allShifts.forEach((entry) => {
    // 指定されたユーザーのみフィルタ
    if (userIds.length > 0 && !userIds.includes(entry.uid)) {
      return;
    }

    if (!byDate[entry.date]) {
      byDate[entry.date] = [];
    }
    byDate[entry.date].push(entry);
  });

  // 全員が出勤している日を抽出
  const result: Array<{
    date: string;
    users: Array<{ uid: string; userName: string; kind: string; start: string; end: string }>;
  }> = [];

  Object.keys(byDate)
    .sort()
    .forEach((date) => {
      const entries = byDate[date];
      const uniqueUsers = new Set(entries.map((e) => e.uid));

      // 指定されたユーザー全員が出勤している場合のみ追加
      if (userIds.length === 0 || uniqueUsers.size === userIds.length) {
        result.push({
          date,
          users: entries.map((e) => ({
            uid: e.uid,
            userName: e.userName,
            kind: e.kind,
            start: e.start,
            end: e.end,
          })),
        });
      }
    });

  return result;
}
