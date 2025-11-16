/**
 * 勤怠サービス
 * 打刻処理・集計を担当
 */

import {
  createKintaiRecord,
  getRecentKintaiRecords,
  getKintaiRecordsByDate,
  saveWorkSummary,
  getWorkSummaryByMonth,
  saveDailyReport,
  getKintaiRecordsByRange,
} from '../repositories/FirestoreRepository';
import {
  backupKintaiRecord,
  backupWorkSummary,
  backupDailyReport,
} from '../repositories/SpreadsheetRepository';
import { notifyAttendance, notifyDailyReport } from './NotificationService';
import { ACTIONS, CACHE_DURATION } from '../config/constants';
import { cacheGet, cachePut, cacheRemove, CacheKeys } from '../utils/cache';
import {
  formatDate,
  toYmd,
} from '../utils/date';
import {
  AttendanceAction,
  WorkLocation,
  TodayStatus,
  MonthSummary,
  KintaiRecordInput,
  KintaiRecord,
  DailyReportInput,
} from '../models/Kintai';
import { User } from '../models/User';

/**
 * 今日の勤怠状態を取得（キャッシュ対応）
 */
export async function getTodayStatus(uid: string): Promise<TodayStatus> {
  const cacheKey = CacheKeys.todayStatus(uid);
  const cached = cacheGet<TodayStatus>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const todayStr = toYmd(now);

  // 最新10件の打刻記録を取得
  const records = await getRecentKintaiRecords(uid, 10);

  // 今日の記録のみフィルタ
  const todayRecords = records.filter((r) => r.date === todayStr);

  if (!todayRecords.length) {
    const result: TodayStatus = {
      status: 'notClockedIn',
      record: [],
    };
    cachePut(cacheKey, result, CACHE_DURATION.TODAY_STATUS);
    return result;
  }

  // 記録を構築
  const record = todayRecords.map((r) => ({
    action: r.action,
    time: formatDate(r.timestamp, 'HH:mm'),
  }));

  // 最新のアクションから状態を判定
  const lastAction = todayRecords[todayRecords.length - 1].action;
  Logger.log(`[DEBUG] getTodayStatus: lastAction="${lastAction}"`);
  Logger.log(`[DEBUG] getTodayStatus: ACTIONS.CLOCK_IN="${ACTIONS.CLOCK_IN}"`);
  Logger.log(`[DEBUG] getTodayStatus: ACTIONS.RESUME="${ACTIONS.RESUME}"`);
  Logger.log(`[DEBUG] getTodayStatus: ACTIONS.BREAK="${ACTIONS.BREAK}"`);
  Logger.log(`[DEBUG] getTodayStatus: ACTIONS.CLOCK_OUT="${ACTIONS.CLOCK_OUT}"`);

  let status: TodayStatus['status'] = 'notClockedIn';

  if (lastAction === ACTIONS.CLOCK_IN || lastAction === ACTIONS.RESUME) {
    status = 'clockedIn';
    Logger.log(`[DEBUG] getTodayStatus: status設定 -> clockedIn`);
  } else if (lastAction === ACTIONS.BREAK) {
    status = 'onBreak';
    Logger.log(`[DEBUG] getTodayStatus: status設定 -> onBreak`);
  } else if (lastAction === ACTIONS.CLOCK_OUT) {
    Logger.log(`[DEBUG] getTodayStatus: status設定 -> notClockedIn (退勤済み)`);
    // 退勤済み → 未出勤扱い
    const result: TodayStatus = {
      status: 'notClockedIn',
      record: [],
    };
    cachePut(cacheKey, result, CACHE_DURATION.TODAY_STATUS);
    return result;
  }

  Logger.log(`[DEBUG] getTodayStatus: 最終status="${status}", record.length=${record.length}`);
  const result: TodayStatus = { status, record };
  cachePut(cacheKey, result, CACHE_DURATION.TODAY_STATUS);
  return result;
}

/**
 * 打刻処理
 */
export async function recordAttendance(
  user: User,
  action: AttendanceAction,
  location: WorkLocation,
  dailyReportContent?: string
): Promise<TodayStatus> {
  const now = new Date();
  const todayStr = toYmd(now);

  // 打刻記録を作成
  const input: KintaiRecordInput = {
    uid: user.uid,
    userName: user.displayName,
    action,
    location,
    timestamp: now,
    date: todayStr,
  };

  const recordId = await createKintaiRecord(input);

  // スプレッドシートにバックアップ
  backupKintaiRecord({
    recordId,
    ...input,
  });

  // キャッシュをクリア
  cacheRemove(CacheKeys.todayStatus(user.uid));

  // 退勤の場合：勤務時間を集計
  if (action === ACTIONS.CLOCK_OUT) {
    await calculateAndSaveWorkSummary(user.uid, todayStr);

    // 日報を保存
    if (dailyReportContent && dailyReportContent.trim()) {
      await saveDailyReportWithNotification(
        user.uid,
        user.displayName,
        todayStr,
        dailyReportContent
      );
    }

    // Slack通知（退勤）
    const threadTs = notifyAttendance(user.displayName, action, '');

    // 日報をスレッドに投稿
    if (threadTs && dailyReportContent && dailyReportContent.trim()) {
      notifyDailyReport(user.displayName, dailyReportContent, todayStr, threadTs);
    }

    return {
      status: 'notClockedIn',
      record: [],
    };
  }

  // 出勤・休憩・休憩戻りの通知
  notifyAttendance(user.displayName, action, location);

  // 最新状態を返す
  return await getTodayStatus(user.uid);
}

/**
 * 勤務時間を計算して保存
 */
async function calculateAndSaveWorkSummary(
  uid: string,
  dateStr: string
): Promise<void> {
  const records = await getKintaiRecordsByDate(uid, dateStr);

  if (!records.length) return;

  let checkIn: Date | null = null;
  let checkOut: Date | null = null;
  let breakStart: Date | null = null;
  let breakTotalMs = 0;
  let location: WorkLocation = '';

  // 逆順でスキャン（最新から過去へ）
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i];

    if (rec.action === ACTIONS.CLOCK_OUT && !checkOut) {
      checkOut = rec.timestamp;
    } else if (rec.action === ACTIONS.RESUME && !breakStart) {
      breakStart = rec.timestamp;
    } else if (rec.action === ACTIONS.BREAK && breakStart) {
      breakTotalMs += breakStart.getTime() - rec.timestamp.getTime();
      breakStart = null;
    } else if (rec.action === ACTIONS.CLOCK_IN) {
      checkIn = rec.timestamp;
      location = rec.location;
      break;
    }
  }

  if (!checkIn || !checkOut) return;

  // 勤務時間を計算（ミリ秒 → 分）
  const workMs = checkOut.getTime() - checkIn.getTime() - breakTotalMs;
  const totalMin = Math.max(0, Math.floor(workMs / 60000));

  // 場所別集計
  let officeMin = 0;
  let remoteMin = 0;

  if (location === 'オフィス') {
    officeMin = totalMin;
  } else if (location === 'リモート') {
    remoteMin = totalMin;
  }

  // Firestoreに保存
  await saveWorkSummary({
    uid,
    date: dateStr,
    totalMin,
    officeMin,
    remoteMin,
    location,
  });

  // スプレッドシートにバックアップ
  backupWorkSummary({
    uid,
    date: dateStr,
    totalMin,
    officeMin,
    remoteMin,
    location,
  });
}

/**
 * 日報を保存して通知
 */
async function saveDailyReportWithNotification(
  uid: string,
  userName: string,
  date: string,
  content: string
): Promise<void> {
  const input: DailyReportInput = {
    uid,
    date,
    content,
  };

  await saveDailyReport(input);

  backupDailyReport(
    {
      ...input,
      updatedAt: new Date(),
    },
    userName
  );
}

/**
 * 月次サマリーを取得（キャッシュ対応）
 */
export async function getMonthSummary(
  uid: string,
  year: number,
  month: number
): Promise<MonthSummary> {
  const cacheKey = CacheKeys.worksum(uid, year, month);
  const cached = cacheGet<MonthSummary>(cacheKey);
  if (cached) return cached;

  const summaries = await getWorkSummaryByMonth(uid, year, month);

  let totalMin = 0;
  let officeMin = 0;
  let remoteMin = 0;

  summaries.forEach((s) => {
    totalMin += s.totalMin;
    officeMin += s.officeMin;
    remoteMin += s.remoteMin;
  });

  const result: MonthSummary = {
    totalMin,
    officeMin,
    remoteMin,
  };

  cachePut(cacheKey, result, CACHE_DURATION.WORKSUM);

  return result;
}

/**
 * 指定期間のサマリーを取得
 */
export async function getRangeSummary(
  uid: string,
  startDate: Date,
  endDate: Date
): Promise<MonthSummary> {
  // 期間内の打刻記録を取得して集計
  const records = await getKintaiRecordsByRange(uid, startDate, endDate);

  // 日付ごとにグループ化
  const byDate: { [date: string]: KintaiRecord[] } = {};
  records.forEach((rec) => {
    if (!byDate[rec.date]) {
      byDate[rec.date] = [];
    }
    byDate[rec.date].push(rec);
  });

  let totalMin = 0;
  let officeMin = 0;
  let remoteMin = 0;

  // 各日付ごとに勤務時間を計算
  Object.keys(byDate).forEach((dateStr) => {
    const dayRecords = byDate[dateStr];
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    let breakStart: Date | null = null;
    let breakTotalMs = 0;
    let location: WorkLocation = '';

    for (let i = dayRecords.length - 1; i >= 0; i--) {
      const rec = dayRecords[i];

      if (rec.action === ACTIONS.CLOCK_OUT && !checkOut) {
        checkOut = rec.timestamp;
      } else if (rec.action === ACTIONS.RESUME && !breakStart) {
        breakStart = rec.timestamp;
      } else if (rec.action === ACTIONS.BREAK && breakStart) {
        breakTotalMs += breakStart.getTime() - rec.timestamp.getTime();
        breakStart = null;
      } else if (rec.action === ACTIONS.CLOCK_IN) {
        checkIn = rec.timestamp;
        location = rec.location;
        break;
      }
    }

    if (checkIn && checkOut) {
      const workMs = checkOut.getTime() - checkIn.getTime() - breakTotalMs;
      const dayMin = Math.max(0, Math.floor(workMs / 60000));

      totalMin += dayMin;

      if (location === 'オフィス') {
        officeMin += dayMin;
      } else if (location === 'リモート') {
        remoteMin += dayMin;
      }
    }
  });

  return {
    totalMin,
    officeMin,
    remoteMin,
  };
}

/**
 * 指定日の打刻履歴を取得（モーダル表示用）
 */
export async function getKintaiHistoryForDate(
  uid: string,
  date: string
): Promise<{
  events: Array<{
    timeISO: string;
    timeDisp: string;
    action: AttendanceAction;
    location: WorkLocation;
  }>;
  totalMin: number;
}> {
  const records = await getKintaiRecordsByDate(uid, date);

  if (!records.length) {
    return { events: [], totalMin: 0 };
  }

  // セッションを構築
  let checkIn: Date | null = null;
  let breakStart: Date | null = null;
  let breakTotalMs = 0;
  const session: typeof records = [];

  for (const rec of records) {
    if (rec.action === ACTIONS.CLOCK_IN) {
      checkIn = rec.timestamp;
      breakStart = null;
      breakTotalMs = 0;
      session.length = 0;
      session.push(rec);
    } else if (rec.action === ACTIONS.BREAK) {
      if (checkIn && !breakStart) {
        breakStart = rec.timestamp;
        session.push(rec);
      }
    } else if (rec.action === ACTIONS.RESUME) {
      if (checkIn && breakStart) {
        breakTotalMs += rec.timestamp.getTime() - breakStart.getTime();
        session.push(rec);
        breakStart = null;
      }
    } else if (rec.action === ACTIONS.CLOCK_OUT) {
      if (checkIn) {
        if (breakStart) {
          breakTotalMs += rec.timestamp.getTime() - breakStart.getTime();
          breakStart = null;
        }
        session.push(rec);
        break;
      }
    }
  }

  // イベントを整形
  const events = session.map((rec) => ({
    timeISO: rec.timestamp.toISOString(),
    timeDisp: formatDate(rec.timestamp, 'HH:mm'),
    action: rec.action,
    location: rec.location,
  }));

  // 合計時間を計算
  let totalMin = 0;
  if (checkIn && session.length > 0) {
    const lastRec = session[session.length - 1];
    if (lastRec.action === ACTIONS.CLOCK_OUT) {
      const workMs = lastRec.timestamp.getTime() - checkIn.getTime() - breakTotalMs;
      totalMin = Math.max(0, Math.floor(workMs / 60000));
    }
  }

  return {
    events,
    totalMin,
  };
}
