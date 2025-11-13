/**
 * 定数定義
 */

// Slackチャンネル
export const SLACK_CHANNEL_ID = 'C08RX98AZN3';

// 名言スプレッドシート
export const QUOTE_SHEET_ID = '14Tpz6Z8Y_6bpvInbSOWvXwV4mZtlm091QjuQcPUOyL8';
export const QUOTE_SHEET_NAME = '名言DB';

// バックアップスプレッドシート
export const BACKUP_SHEET_ID = '1b8yd4dMtR-kpfsy6oemB9RXZgQ3zbQWzjwwbQ9B2AZ4';

// シート名
export const SHEET_NAMES = {
  USERS: 'users',
  KINTAI: '打刻履歴',
  WORKSUM: '出勤時間_db',
  DAILY_REPORT: '日報',
  SHIFT: 'シフト提出',
  SHIFT_REQUESTS: 'シフト修正依頼',
  CORRECTION_REQUESTS: '打刻修正依頼',
} as const;

// キャッシュ時間（秒）
export const CACHE_DURATION = {
  USER: 300,           // 5分
  TODAY_STATUS: 30,    // 30秒
  WORKSUM: 300,        // 5分
  SHIFTS: 60,          // 1分
} as const;

// シフトロック設定
export const SHIFT_LOCK = {
  LOCK_DAY: 26,                    // 前月26日からロック
  EDIT_WINDOW_MINUTES: 10,         // 作成後10分以内は編集可
} as const;

// 打刻リマインダー設定
export const REMINDER = {
  DELAY_MINUTES: 10,               // シフト時刻から10分遅延で通知
} as const;

// 勤務区分
export const WORK_TYPES = {
  OFFICE: 'オフィス',
  REMOTE: 'リモート',
} as const;

// 打刻アクション
export const ACTIONS = {
  CLOCK_IN: '出勤',
  BREAK: '休憩',
  RESUME: '休憩戻り',
  CLOCK_OUT: '退勤',
} as const;

// ユーザーロール
export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

// ユーザーステータス
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

// リクエストステータス
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
} as const;

// Firestore コレクション名
export const COLLECTIONS = {
  USERS: 'users',
  KINTAI: 'kintai',
  WORKSUM: 'worksum',
  SHIFTS: 'shifts',
  SHIFT_REQUESTS: 'shift_requests',
  CORRECTION_REQUESTS: 'correction_requests',
  DAILY_REPORTS: 'daily_reports',
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  UNAUTHORIZED: '認証が必要です',
  INVALID_TOKEN: 'IDトークンが無効です',
  ACCOUNT_SUSPENDED: 'アカウントは停止中です',
  PERMISSION_DENIED: '権限がありません',
  NOT_FOUND: '対象が見つかりません',
  LOCKED: 'ロック中のため編集できません（作成後10分以内のみ可）',
  MISSING_FIELDS: '必須項目が不足しています',
  SERVER_ERROR: 'サーバーエラーが発生しました',
  TIMEOUT: '処理中です。少し待ってから再試行してください',
} as const;
