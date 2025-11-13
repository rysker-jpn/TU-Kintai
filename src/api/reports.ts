/**
 * レポート・管理者機能API
 */

import { requireAuth, requireAdmin, updateDisplayName } from '../services/AuthService';
import { getMonthSummary } from '../services/KintaiService';
import { getCommonWorkingDays } from '../services/ShiftService';
import { getAllUsers } from '../repositories/FirestoreRepository';
import { ERROR_MESSAGES } from '../config/constants';
import { minutesToHHMM } from '../utils/date';

/**
 * 管理者向け：全ユーザーの月次実績レポートを取得
 */
export async function getMonthlyReport(
  idToken: string,
  year: number,
  month: number
) {
  try {
    await requireAdmin(idToken);

    const users = await getAllUsers();

    const report = await Promise.all(
      users.map(async (user) => {
        const summary = await getMonthSummary(user.uid, year, month);
        return {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          status: user.status,
          totalMin: summary.totalMin,
          totalHHMM: minutesToHHMM(summary.totalMin),
          officeMin: summary.officeMin,
          officeHHMM: minutesToHHMM(summary.officeMin),
          remoteMin: summary.remoteMin,
          remoteHHMM: minutesToHHMM(summary.remoteMin),
        };
      })
    );

    return {
      ok: true,
      report,
    };
  } catch (e: any) {
    Logger.log(`getMonthlyReport error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 日程調整ビュー：指定期間で全員が出勤している日を取得
 */
export async function getCommonWorkingDaysAPI(
  idToken: string,
  startISO: string,
  endISO: string,
  userIds?: string[]
) {
  try {
    await requireAuth(idToken);

    // yyyy-MM-dd 形式に変換
    const startDate = startISO.replace(/\//g, '-');
    const endDate = endISO.replace(/\//g, '-');

    const days = await getCommonWorkingDays(
      startDate,
      endDate,
      userIds || []
    );

    return {
      ok: true,
      days,
    };
  } catch (e: any) {
    Logger.log(`getCommonWorkingDays error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 全ユーザーを取得（日程調整用）
 */
export async function getAllUsersAPI(idToken: string) {
  try {
    await requireAuth(idToken);

    const users = await getAllUsers();

    return {
      ok: true,
      users: users.map((u) => ({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        status: u.status,
      })),
    };
  } catch (e: any) {
    Logger.log(`getAllUsers error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * 表示名を更新
 */
export async function upsertDisplayName(idToken: string, newName: string) {
  try {
    const user = await requireAuth(idToken);
    await updateDisplayName(user.uid, newName);

    return {
      ok: true,
      displayName: newName,
    };
  } catch (e: any) {
    Logger.log(`upsertDisplayName error: ${e}`);
    return {
      ok: false,
      error: e.message || ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}
