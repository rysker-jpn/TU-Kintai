/**
 * TU勤怠管理システム v2.0
 * メインエントリーポイント - すべてのAPI関数をエクスポート
 */

// API層
import * as AttendanceAPI from './api/attendance';
import * as ShiftsAPI from './api/shifts';
import * as ReportsAPI from './api/reports';

// Google Apps Scriptのグローバルスコープにエクスポート
declare const global: any;

// ========== Web App エントリーポイント ==========

/**
 * Webアプリケーションのエントリーポイント
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('TU勤怠')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== 勤怠API ==========

/**
 * ユーザー状態を取得
 */
async function getUserStatus(idToken: string) {
  return await AttendanceAPI.getUserStatus(idToken);
}

/**
 * 打刻処理
 */
async function recordAction(
  idToken: string,
  action: string,
  location: string,
  reportText?: string
) {
  return await AttendanceAPI.recordAction(idToken, action as any, location as any, reportText);
}

/**
 * 今月のサマリーを取得
 */
async function getWorksumMonth(idToken: string, year: number, month: number) {
  return await AttendanceAPI.getWorksumMonth(idToken, year, month);
}

/**
 * 指定期間のサマリーを取得
 */
async function getWorksumRange(idToken: string, startISO: string, endISO: string) {
  return await AttendanceAPI.getWorksumRange(idToken, startISO, endISO);
}

/**
 * 指定日の打刻履歴を取得
 */
async function getKintaiHistoryForDate(
  idToken: string,
  dateYmd: string,
  uidOpt?: string
) {
  return await AttendanceAPI.getKintaiHistoryForDateAPI(idToken, dateYmd, uidOpt);
}

// ========== シフトAPI ==========

/**
 * 指定期間のシフトエントリーを取得
 */
async function listShiftsRange(
  idToken: string,
  startISO: string,
  endISO: string,
  scope: string
) {
  return await ShiftsAPI.listShiftsRange(idToken, startISO, endISO, scope as any);
}

/**
 * シフトエントリーを保存
 */
async function saveShiftEntry(idToken: string, entry: any) {
  return await ShiftsAPI.saveShiftEntry(idToken, entry);
}

/**
 * シフトエントリーを削除
 */
async function deleteShiftEntry(idToken: string, entryId: string) {
  return await ShiftsAPI.deleteShiftEntry(idToken, entryId);
}

/**
 * シフト修正申請を作成
 */
async function createShiftChangeRequest(idToken: string, payload: any) {
  return await ShiftsAPI.createShiftChangeRequest(idToken, payload);
}

/**
 * 保留中のシフト修正申請を取得
 */
async function listPendingRequests(idToken: string) {
  return await ShiftsAPI.listPendingRequests(idToken);
}

/**
 * シフト修正申請を承認
 */
async function approveShiftChange(idToken: string, requestId: string) {
  return await ShiftsAPI.approveShiftChange(idToken, requestId);
}

/**
 * シフト修正申請を却下
 */
async function denyShiftChange(idToken: string, requestId: string) {
  return await ShiftsAPI.denyShiftChange(idToken, requestId);
}

// ========== レポート・管理者API ==========

/**
 * 管理者向け：全ユーザーの月次実績レポートを取得
 */
async function getMonthlyReport(idToken: string, year: number, month: number) {
  return await ReportsAPI.getMonthlyReport(idToken, year, month);
}

/**
 * 日程調整ビュー：指定期間で全員が出勤している日を取得
 */
async function getCommonWorkingDays(
  idToken: string,
  startISO: string,
  endISO: string,
  userIds?: string[]
) {
  return await ReportsAPI.getCommonWorkingDaysAPI(idToken, startISO, endISO, userIds);
}

/**
 * 全ユーザーを取得
 */
async function getAllUsers(idToken: string) {
  return await ReportsAPI.getAllUsersAPI(idToken);
}

/**
 * 表示名を更新
 */
async function upsertDisplayName(idToken: string, newName: string) {
  return await ReportsAPI.upsertDisplayName(idToken, newName);
}

// ========== グローバルエクスポート ==========

global.doGet = doGet;

// 勤怠API
global.getUserStatus = getUserStatus;
global.recordAction = recordAction;
global.getWorksumMonth = getWorksumMonth;
global.getWorksumRange = getWorksumRange;
global.getKintaiHistoryForDate = getKintaiHistoryForDate;

// シフトAPI
global.listShiftsRange = listShiftsRange;
global.saveShiftEntry = saveShiftEntry;
global.deleteShiftEntry = deleteShiftEntry;
global.createShiftChangeRequest = createShiftChangeRequest;
global.listPendingRequests = listPendingRequests;
global.approveShiftChange = approveShiftChange;
global.denyShiftChange = denyShiftChange;

// レポート・管理者API
global.getMonthlyReport = getMonthlyReport;
global.getCommonWorkingDays = getCommonWorkingDays;
global.getAllUsers = getAllUsers;
global.upsertDisplayName = upsertDisplayName;
