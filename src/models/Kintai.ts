/**
 * 勤怠モデル
 */

export type AttendanceAction = '出勤' | '休憩' | '休憩戻り' | '退勤';
export type WorkLocation = 'オフィス' | 'リモート' | '';

export interface KintaiRecord {
  recordId: string;
  uid: string;
  userName: string;
  action: AttendanceAction;
  location: WorkLocation;
  timestamp: Date;
  date: string; // yyyy/MM/dd
}

export interface KintaiRecordInput {
  uid: string;
  userName: string;
  action: AttendanceAction;
  location: WorkLocation;
  timestamp: Date;
  date: string;
}

export interface TodayStatus {
  status: 'notClockedIn' | 'clockedIn' | 'onBreak';
  record: Array<{
    action: AttendanceAction;
    time: string; // HH:mm
  }>;
}

export interface WorkSummary {
  uid: string;
  date: string; // yyyy/MM/dd
  totalMin: number;
  officeMin: number;
  remoteMin: number;
  location: WorkLocation;
}

export interface MonthSummary {
  totalMin: number;
  officeMin: number;
  remoteMin: number;
}

export interface CorrectionRequest {
  requestId: string;
  uid: string;
  userName: string;
  date: string; // yyyy/MM/dd
  recordType: 'clock_in' | 'clock_out' | 'break' | 'resume';
  before: {
    time: string; // HH:mm
    location?: WorkLocation;
  };
  after: {
    time: string; // HH:mm
    location?: WorkLocation;
  };
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: Date;
}

export interface CorrectionRequestInput {
  uid: string;
  userName: string;
  date: string;
  recordType: 'clock_in' | 'clock_out' | 'break' | 'resume';
  before: {
    time: string;
    location?: WorkLocation;
  };
  after: {
    time: string;
    location?: WorkLocation;
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
