/**
 * 日付・時刻処理ユーティリティ
 */

/**
 * 日付をフォーマット
 * @param date 日付
 * @param format フォーマット（デフォルト: yyyy/MM/dd HH:mm:ss）
 */
export function formatDate(date: Date, format: string = 'yyyy/MM/dd HH:mm:ss'): string {
  if (!date || !(date instanceof Date)) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', String(y))
    .replace('MM', m)
    .replace('dd', d)
    .replace('HH', hh)
    .replace('mm', mm)
    .replace('ss', ss);
}

/**
 * 文字列を正規化（全角スペース→半角、連続スペース削除、trim）
 */
export function normalize(s: string | null | undefined): string {
  return String(s || '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * yyyy/MM/dd または yyyy-MM-dd 形式の文字列を Date に変換
 */
export function parseYmd(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = String(ymd).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

/**
 * Date を yyyy/MM/dd 形式の文字列に変換
 */
export function toYmd(date: Date): string {
  return formatDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()), 'yyyy/MM/dd');
}

/**
 * スプレッドシートの日付セルを正規化
 */
export function normalizeSheetDate(cell: any): Date | null {
  if (cell instanceof Date) {
    return new Date(cell.getFullYear(), cell.getMonth(), cell.getDate());
  }
  return parseYmd(String(cell));
}

/**
 * 時刻を HH:MM 形式に変換
 */
export function toHHMM(cell: any): string {
  if (cell == null || cell === '') return '';

  // 文字列の場合
  if (typeof cell === 'string') {
    const m = cell.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  }

  // Date型の場合
  if (cell instanceof Date) {
    const h = String(cell.getHours()).padStart(2, '0');
    const m = String(cell.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // シリアル値の場合（1.0 = 24時間）
  if (typeof cell === 'number') {
    const totalMinutes = Math.round(cell * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }

  return '';
}

/**
 * 勤務時間セルを分単位に変換（HH:MM / HH:MM:SS / シリアル値対応）
 */
export function parseDurationToMinutes(value: any): number {
  if (value == null || value === '') return 0;

  // 数値シリアル（1.0 = 24時間 = 1440分）
  if (typeof value === 'number') {
    return Math.max(0, Math.round(value * 24 * 60));
  }

  // Date型
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  // 文字列（HH:MM:SS または HH:MM）
  const s = String(value).trim();
  let m = s.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);
  if (m) {
    const h = +m[1];
    const mm = +m[2];
    return Math.max(0, h * 60 + mm);
  }

  m = s.match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) {
    const h = +m[1];
    const mm = +m[2];
    return Math.max(0, h * 60 + mm);
  }

  return 0;
}

/**
 * 分を HH:MM 形式に変換
 */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * タイムスタンプを柔軟にパース
 */
export function parseTimestampFlexible(value: any): Date | null {
  if (value instanceof Date) return value;
  if (!value) return null;

  const s = String(value).trim();
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;

  const Y = +m[1];
  const M = +m[2] - 1;
  const D = +m[3];
  const h = +(m[4] || 0);
  const mi = +(m[5] || 0);
  const se = +(m[6] || 0);

  return new Date(Y, M, D, h, mi, se);
}

/**
 * 月の開始日を取得
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 月の終了日を取得
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * シフトロック開始日を取得（前月26日）
 */
export function getLockStartDate(targetDate: Date): Date {
  return new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 26, 0, 0, 0);
}

/**
 * シフトがロックされているか判定
 */
export function isShiftLocked(targetDate: Date, createdAt: Date | null, now: Date): boolean {
  const lockStart = getLockStartDate(targetDate);
  const isInLockedPeriod = now >= lockStart;

  if (!isInLockedPeriod) return false;

  // 作成後10分以内は編集可能
  if (createdAt && (now.getTime() - createdAt.getTime()) <= 10 * 60 * 1000) {
    return false;
  }

  return true;
}

/**
 * 同じ日付かどうか判定
 */
export function isSameDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 同じ月かどうか判定
 */
export function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}
