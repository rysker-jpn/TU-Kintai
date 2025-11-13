/**
 * シフトAPI
 * フロントエンドから呼ばれるエンドポイント
 */

import { requireAuth, requireAdmin } from '../services/AuthService';
import {
  saveShift,
  deleteShift,
  getMyShifts,
  getAllShifts,
  createShiftModificationRequest,
  getPendingRequests,
  approveRequest,
  denyRequest,
} from '../services/ShiftService';
import { ShiftEntryInput } from '../models/Shift';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * 指定期間のシフトエントリーを取得
 */
export async function listShiftsRange(
  idToken: string,
  startISO: string,
  endISO: string,
  scope: 'mine' | 'all'
) {
  try {
    const user = await requireAuth(idToken);

    // yyyy-MM-dd 形式に変換
    const startDate = startISO.replace(/\//g, '-');
    const endDate = endISO.replace(/\//g, '-');

    if (scope === 'all') {
      const entries = await getAllShifts(startDate, endDate);
      return {
        ok: true,
        entries,
        role: user.role,
      };
    } else {
      const entries = await getMyShifts(user.uid, startDate, endDate);
      return {
        ok: true,
        entries,
        role: user.role,
      };
    }
  } catch (e: any) {
    Logger.log(`listShiftsRange error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * シフトエントリーを保存（作成/更新）
 */
export async function saveShiftEntry(idToken: string, entry: any) {
  try {
    const user = await requireAuth(idToken);

    // yyyy-MM-dd → yyyy/MM/dd に変換
    const dateFormatted = entry.date.replace(/-/g, '/');

    const input: ShiftEntryInput = {
      entryId: entry.entryId,
      uid: user.uid,
      userName: user.displayName,
      date: dateFormatted,
      kind: entry.kind,
      start: entry.start,
      end: entry.end,
      memo: entry.memo || '',
    };

    const entryId = await saveShift(user, input);

    return {
      ok: true,
      entryId,
    };
  } catch (e: any) {
    Logger.log(`saveShiftEntry error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * シフトエントリーを削除
 */
export async function deleteShiftEntry(idToken: string, entryId: string) {
  try {
    const user = await requireAuth(idToken);
    await deleteShift(user, entryId);

    return {
      ok: true,
    };
  } catch (e: any) {
    Logger.log(`deleteShiftEntry error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * シフト修正申請を作成
 */
export async function createShiftChangeRequest(idToken: string, payload: any) {
  try {
    const user = await requireAuth(idToken);

    const requestId = await createShiftModificationRequest(user, {
      entryId: payload.entryId,
      after: {
        kind: payload.kind,
        start: payload.start,
        end: payload.end,
      },
      reason: payload.reason,
    });

    return {
      ok: true,
      requestId,
    };
  } catch (e: any) {
    Logger.log(`createShiftChangeRequest error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 保留中のシフト修正申請を取得（管理者用）
 */
export async function listPendingRequests(idToken: string) {
  try {
    await requireAdmin(idToken);

    const requests = await getPendingRequests();

    const items = requests.map((req) => ({
      requestId: req.requestId,
      entryId: req.entryId,
      date: req.date,
      uid: req.uid,
      user: req.userName,
      before: {
        kind: req.before.kind,
        start: req.before.start,
        end: req.before.end,
      },
      after: {
        kind: req.after.kind,
        start: req.after.start,
        end: req.after.end,
      },
      reason: req.reason,
      createdAt: req.createdAt.toISOString(),
    }));

    return {
      ok: true,
      items,
    };
  } catch (e: any) {
    Logger.log(`listPendingRequests error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * シフト修正申請を承認（管理者用）
 */
export async function approveShiftChange(idToken: string, requestId: string) {
  try {
    await requireAdmin(idToken);
    await approveRequest(requestId);

    return {
      ok: true,
    };
  } catch (e: any) {
    Logger.log(`approveShiftChange error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * シフト修正申請を却下（管理者用）
 */
export async function denyShiftChange(idToken: string, requestId: string) {
  try {
    await requireAdmin(idToken);
    await denyRequest(requestId);

    return {
      ok: true,
    };
  } catch (e: any) {
    Logger.log(`denyShiftChange error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}
