/**
 * 勤怠API
 * フロントエンドから呼ばれるエンドポイント
 */

import { requireAuth } from '../services/AuthService';
import {
  recordAttendance,
  getTodayStatus,
  getMonthSummary,
  getRangeSummary,
  getKintaiHistoryForDate,
} from '../services/KintaiService';
import { AttendanceAction, WorkLocation } from '../models/Kintai';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * ユーザー状態を取得
 */
export async function getUserStatus(idToken: string) {
  try {
    const user = await requireAuth(idToken);
    const status = await getTodayStatus(user.uid);

    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      status: status.status,
      record: status.record,
    };
  } catch (e: any) {
    Logger.log(`getUserStatus error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 打刻処理
 */
export async function recordAction(
  idToken: string,
  action: AttendanceAction,
  location: WorkLocation,
  reportText?: string
) {
  // ロック取得
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      return {
        ok: false,
        error: ERROR_MESSAGES.TIMEOUT,
      };
    }

    Logger.log(`[DEBUG] recordAction: action=${action}, location=${location}`);
    const user = await requireAuth(idToken);
    Logger.log(`[DEBUG] recordAction: user認証成功 uid=${user.uid}`);

    const status = await recordAttendance(user, action, location, reportText);
    Logger.log(`[DEBUG] recordAction: recordAttendance完了 status=${status.status}, record.length=${status.record.length}`);
    Logger.log(`[DEBUG] recordAction: record=${JSON.stringify(status.record)}`);

    const response = {
      ok: true,
      status: status.status,
      record: status.record,
    };
    Logger.log(`[DEBUG] recordAction: レスポンス=${JSON.stringify(response)}`);

    return response;
  } catch (e: any) {
    Logger.log(`recordAction error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 今月のサマリーを取得
 */
export async function getWorksumMonth(
  idToken: string,
  year: number,
  month: number
) {
  try {
    const user = await requireAuth(idToken);
    const summary = await getMonthSummary(user.uid, year, month);

    return {
      ok: true,
      totalMin: summary.totalMin,
      officeMin: summary.officeMin,
      remoteMin: summary.remoteMin,
    };
  } catch (e: any) {
    Logger.log(`getWorksumMonth error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 指定期間のサマリーを取得
 */
export async function getWorksumRange(
  idToken: string,
  startISO: string,
  endISO: string
) {
  try {
    const user = await requireAuth(idToken);
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);

    const summary = await getRangeSummary(user.uid, startDate, endDate);

    return {
      ok: true,
      totalMin: summary.totalMin,
      officeMin: summary.officeMin,
      remoteMin: summary.remoteMin,
    };
  } catch (e: any) {
    Logger.log(`getWorksumRange error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 指定日の打刻履歴を取得（モーダル表示用）
 */
export async function getKintaiHistoryForDateAPI(
  idToken: string,
  dateYmd: string,
  uidOpt?: string
) {
  try {
    const user = await requireAuth(idToken);
    const targetUid = uidOpt || user.uid;

    // 管理者以外は自分の履歴のみ閲覧可能
    if (targetUid !== user.uid && user.role !== 'admin') {
      return {
        ok: false,
        error: ERROR_MESSAGES.PERMISSION_DENIED,
      };
    }

    const history = await getKintaiHistoryForDate(targetUid, dateYmd);

    return {
      ok: true,
      events: history.events,
      totalMin: history.totalMin,
    };
  } catch (e: any) {
    Logger.log(`getKintaiHistoryForDate error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}
