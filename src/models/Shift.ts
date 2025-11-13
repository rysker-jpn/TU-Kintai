/**
 * シフトモデル
 */

export type ShiftKind = 'オフィス' | 'リモート';

export interface ShiftEntry {
  entryId: string;
  uid: string;
  userName: string;
  date: string; // yyyy/MM/dd
  kind: ShiftKind;
  start: string; // HH:mm
  end: string; // HH:mm
  memo: string;
  createdAt: Date;
  updatedAt: Date;
  locked?: boolean;
  pending?: boolean;
  pendingDiff?: {
    kind: ShiftKind;
    start: string;
    end: string;
    reason: string;
  } | null;
}

export interface ShiftEntryInput {
  entryId?: string;
  uid: string;
  userName: string;
  date: string;
  kind: ShiftKind;
  start: string;
  end: string;
  memo?: string;
}

export interface ShiftChangeRequest {
  requestId: string;
  entryId: string;
  uid: string;
  userName: string;
  date: string;
  before: {
    kind: ShiftKind;
    start: string;
    end: string;
  };
  after: {
    kind: ShiftKind;
    start: string;
    end: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: Date;
}

export interface ShiftChangeRequestInput {
  entryId: string;
  uid: string;
  userName: string;
  date: string;
  before: {
    kind: ShiftKind;
    start: string;
    end: string;
  };
  after: {
    kind: ShiftKind;
    start: string;
    end: string;
  };
  reason: string;
}

export interface DailyReport {
  uid: string;
  date: string; // yyyy/MM/dd
  content: string;
  updatedAt: Date;
}

export interface DailyReportInput {
  uid: string;
  date: string;
  content: string;
}
