/**
 * スプレッドシートバックアップリポジトリ
 * Firestoreのデータをスプレッドシートにも記録（バックアップ・閲覧用）
 */

import { BACKUP_SHEET_ID, SHEET_NAMES } from '../config/constants';
import { formatDate } from '../utils/date';
import { User } from '../models/User';
import { KintaiRecord, WorkSummary, DailyReport } from '../models/Kintai';
import { ShiftEntry } from '../models/Shift';

/**
 * スプレッドシートを取得
 */
function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  try {
    return SpreadsheetApp.openById(BACKUP_SHEET_ID);
  } catch (e) {
    throw new Error(`バックアップスプレッドシートが見つかりません: ${BACKUP_SHEET_ID}`);
  }
}

/**
 * シートを取得または作成
 */
function ensureSheet(
  name: string,
  headers?: string[]
): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  } else if (headers && headers.length) {
    // ヘッダーが不足している場合は追加
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const missing = headers.filter((h) => !existingHeaders.includes(h));
    if (missing.length) {
      sheet
        .getRange(1, lastCol + 1, 1, missing.length)
        .setValues([missing]);
    }
  }

  return sheet;
}

/* ========== ユーザー ========== */

/**
 * ユーザーをバックアップ
 */
export function backupUser(user: User): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.USERS, [
      'uid',
      'email',
      'displayName',
      'role',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const uids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const rowIndex = uids.findIndex((row) => row[0] === user.uid);
      if (rowIndex !== -1) {
        // 既存ユーザーの更新
        sheet.getRange(rowIndex + 2, 1, 1, 7).setValues([
          [
            user.uid,
            user.email,
            user.displayName,
            user.role,
            user.status,
            formatDate(user.createdAt),
            formatDate(user.updatedAt),
          ],
        ]);
        return;
      }
    }

    // 新規ユーザーの追加
    sheet.appendRow([
      user.uid,
      user.email,
      user.displayName,
      user.role,
      user.status,
      formatDate(user.createdAt),
      formatDate(user.updatedAt),
    ]);
  } catch (e) {
    Logger.log(`User backup error: ${e}`);
  }
}

/* ========== 勤怠打刻 ========== */

/**
 * 打刻記録をバックアップ
 */
export function backupKintaiRecord(record: KintaiRecord): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.KINTAI, [
      '日時',
      'uid',
      'ユーザー',
      'アクション',
      '場所',
    ]);

    sheet.appendRow([
      formatDate(record.timestamp),
      record.uid,
      record.userName,
      record.action,
      record.location,
    ]);
  } catch (e) {
    Logger.log(`Kintai record backup error: ${e}`);
  }
}

/* ========== 勤務時間サマリー ========== */

/**
 * 勤務時間サマリーをバックアップ
 */
export function backupWorkSummary(summary: WorkSummary): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.WORKSUM, [
      '日付',
      'uid',
      'ユーザー',
      '合計時間(分)',
      'オフィス(分)',
      'リモート(分)',
      '場所',
    ]);

    sheet.appendRow([
      summary.date,
      summary.uid,
      '', // ユーザー名は後で補完可能
      summary.totalMin,
      summary.officeMin,
      summary.remoteMin,
      summary.location,
    ]);
  } catch (e) {
    Logger.log(`Work summary backup error: ${e}`);
  }
}

/* ========== シフト ========== */

/**
 * シフトエントリーをバックアップ
 */
export function backupShiftEntry(entry: ShiftEntry): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.SHIFT, [
      'entryId',
      '日付',
      'uid',
      'ユーザー',
      '勤務区分',
      '開始',
      '終了',
      '備考',
      '作成At',
      '更新At',
    ]);

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const rowIndex = ids.findIndex((row) => row[0] === entry.entryId);
      if (rowIndex !== -1) {
        // 既存エントリーの更新
        sheet.getRange(rowIndex + 2, 1, 1, 10).setValues([
          [
            entry.entryId,
            entry.date,
            entry.uid,
            entry.userName,
            entry.kind,
            entry.start,
            entry.end,
            entry.memo,
            formatDate(entry.createdAt),
            formatDate(entry.updatedAt),
          ],
        ]);
        return;
      }
    }

    // 新規エントリーの追加
    sheet.appendRow([
      entry.entryId,
      entry.date,
      entry.uid,
      entry.userName,
      entry.kind,
      entry.start,
      entry.end,
      entry.memo,
      formatDate(entry.createdAt),
      formatDate(entry.updatedAt),
    ]);
  } catch (e) {
    Logger.log(`Shift entry backup error: ${e}`);
  }
}

/**
 * シフトエントリーをバックアップから削除
 */
export function deleteShiftEntryFromBackup(entryId: string): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.SHIFT);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowIndex = ids.findIndex((row) => row[0] === entryId);
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 2);
    }
  } catch (e) {
    Logger.log(`Shift entry delete error: ${e}`);
  }
}

/* ========== 日報 ========== */

/**
 * 日報をバックアップ
 */
export function backupDailyReport(report: DailyReport, userName: string): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.DAILY_REPORT, [
      '日付',
      'uid',
      'ユーザー',
      '日報',
      '最終更新',
    ]);

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      const rowIndex = data.findIndex(
        (row) => row[0] === report.date && row[1] === report.uid
      );
      if (rowIndex !== -1) {
        // 既存日報の更新
        sheet.getRange(rowIndex + 2, 1, 1, 5).setValues([
          [
            report.date,
            report.uid,
            userName,
            report.content,
            formatDate(report.updatedAt),
          ],
        ]);
        return;
      }
    }

    // 新規日報の追加
    sheet.appendRow([
      report.date,
      report.uid,
      userName,
      report.content,
      formatDate(report.updatedAt),
    ]);
  } catch (e) {
    Logger.log(`Daily report backup error: ${e}`);
  }
}

/* ========== シフト修正依頼 ========== */

/**
 * シフト修正依頼をバックアップ
 */
export function backupShiftChangeRequest(requestId: string, request: any): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.SHIFT_REQUESTS, [
      'requestId',
      'entryId',
      '日付',
      'uid',
      'ユーザー',
      '旧_勤務区分',
      '旧_開始',
      '旧_終了',
      '新_勤務区分',
      '新_開始',
      '新_終了',
      '理由',
      '作成At',
    ]);

    sheet.appendRow([
      requestId,
      request.entryId,
      request.date,
      request.uid,
      request.userName,
      request.before.kind,
      request.before.start,
      request.before.end,
      request.after.kind,
      request.after.start,
      request.after.end,
      request.reason,
      formatDate(request.createdAt),
    ]);
  } catch (e) {
    Logger.log(`Shift change request backup error: ${e}`);
  }
}

/**
 * シフト修正依頼をバックアップから削除
 */
export function deleteShiftChangeRequestFromBackup(requestId: string): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.SHIFT_REQUESTS);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowIndex = ids.findIndex((row) => row[0] === requestId);
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 2);
    }
  } catch (e) {
    Logger.log(`Shift change request delete error: ${e}`);
  }
}

/* ========== 打刻修正依頼 ========== */

/**
 * 打刻修正依頼をバックアップ
 */
export function backupCorrectionRequest(requestId: string, request: any): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.CORRECTION_REQUESTS, [
      'requestId',
      '日付',
      'uid',
      'ユーザー',
      '修正前_JSON',
      '修正後_JSON',
      '理由',
      'status',
      '作成At',
    ]);

    const oldJson = JSON.stringify(request.oldPunches || []);
    const newJson = JSON.stringify(request.newPunches || []);

    sheet.appendRow([
      requestId,
      request.date,
      request.uid,
      request.userName,
      oldJson,
      newJson,
      request.reason,
      'pending',
      formatDate(request.createdAt),
    ]);
  } catch (e) {
    Logger.log(`Correction request backup error: ${e}`);
  }
}

/**
 * 打刻修正依頼をバックアップから削除
 */
export function deleteCorrectionRequestFromBackup(requestId: string): void {
  try {
    const sheet = ensureSheet(SHEET_NAMES.CORRECTION_REQUESTS);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowIndex = ids.findIndex((row) => row[0] === requestId);
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 2);
    }
  } catch (e) {
    Logger.log(`Correction request delete error: ${e}`);
  }
}
