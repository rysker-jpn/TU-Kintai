/**
 * 通知サービス（Slack連携）
 */

import { getSlackBotToken } from '../config/firebase';
import {
  SLACK_CHANNEL_ID,
  QUOTE_SHEET_ID,
  QUOTE_SHEET_NAME,
} from '../config/constants';
import { AttendanceAction } from '../models/Kintai';

interface Quote {
  quote: string;
  place: string;
  person: string;
}

/**
 * ランダムな名言を取得
 */
export function getRandomQuote(): Quote | null {
  try {
    const sheet = SpreadsheetApp.openById(QUOTE_SHEET_ID).getSheetByName(
      QUOTE_SHEET_NAME
    );
    if (!sheet) return null;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    const rows = sheet
      .getRange(2, 1, lastRow - 1, 3)
      .getValues()
      .filter((r) => r[0]);

    if (!rows.length) return null;

    const randomRow = rows[Math.floor(Math.random() * rows.length)];
    return {
      quote: String(randomRow[0]),
      place: String(randomRow[1] || ''),
      person: String(randomRow[2] || ''),
    };
  } catch (e) {
    Logger.log(`名言取得失敗: ${e}`);
    return null;
  }
}

/**
 * Slackにメッセージを投稿
 */
export function postSlackMessage(
  text: string,
  threadTs?: string | null
): string | null {
  try {
    const token = getSlackBotToken();
    if (!token) {
      Logger.log('Slack token 未設定');
      return null;
    }

    const payload: any = {
      channel: SLACK_CHANNEL_ID,
      text,
    };

    if (threadTs) {
      payload.thread_ts = threadTs;
    }

    const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const json = JSON.parse(response.getContentText() || '{}');
    if (!json.ok) {
      Logger.log(`Slack送信失敗: ${response.getContentText()}`);
      return null;
    }

    return json.ts || null;
  } catch (e) {
    Logger.log(`Slack送信エラー: ${e}`);
    return null;
  }
}

/**
 * SlackにDMを送信
 */
export function postSlackDM(userId: string, text: string): boolean {
  try {
    const token = getSlackBotToken();
    if (!token) {
      Logger.log('Slack token 未設定');
      return false;
    }

    const payload = {
      channel: userId,
      text,
    };

    const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const json = JSON.parse(response.getContentText() || '{}');
    if (!json.ok) {
      Logger.log(`Slack DM送信失敗: ${response.getContentText()}`);
      return false;
    }

    return true;
  } catch (e) {
    Logger.log(`Slack DM送信エラー: ${e}`);
    return false;
  }
}

/**
 * 勤怠打刻をSlackに通知（出勤・休憩・休憩戻り・退勤）
 * ⚠️ 通知無効化中 - 復活させる場合は以下のコメントを解除
 */
export function notifyAttendance(
  _userName: string,
  _action: AttendanceAction,
  _location: string
): string | null {
  // テスト中のため通知を無効化
  return null;

  /* 通知を復活させる場合は上の return null; を削除して以下のコメントを解除
  try {
    let text = `＊勤怠＊ ${userName} が `;

    if (location) {
      text += `(${location}) `;
    }

    text += `${action} しました。`;

    // 出勤時のみ名言を追加
    if (action === ACTIONS.CLOCK_IN) {
      const quote = getRandomQuote();
      if (quote) {
        text += `\n\`\`\`\n今日の名言\n「${quote.quote}」\n${quote.place}、${quote.person}\n\`\`\``;
      }
    }

    return postSlackMessage(text);
  } catch (e) {
    Logger.log(`勤怠通知エラー: ${e}`);
    return null;
  }
  */
}

/**
 * 日報をSlackに通知
 * ⚠️ 通知無効化中 - 復活させる場合は以下のコメントを解除
 */
export function notifyDailyReport(
  _userName: string,
  _reportText: string,
  _date: string,
  _threadTs?: string | null
): string | null {
  // テスト中のため通知を無効化
  return null;

  /* 通知を復活させる場合は上の return null; を削除して以下のコメントを解除
  try {
    if (!reportText || !reportText.trim()) return null;

    const text = `【日報】${date} / ${userName}\n\`\`\`\n${reportText}\n\`\`\``;

    return postSlackMessage(text, threadTs || null);
  } catch (e) {
    Logger.log(`日報通知エラー: ${e}`);
    return null;
  }
  */
}

/**
 * 打刻リマインダーをSlack DMで送信
 * ⚠️ 通知無効化中 - 復活させる場合は以下のコメントを解除
 */
export function sendClockInReminder(
  _slackUserId: string,
  _userName: string
): boolean {
  // テスト中のため通知を無効化
  return false;

  /* 通知を復活させる場合は上の return false; を削除して以下のコメントを解除
  const text = `⏰ ${userName}さん、シフト上の出勤時刻から10分経過しましたが、まだ出勤打刻がされていません。打刻をお忘れではないでしょうか？`;
  return postSlackDM(slackUserId, text);
  */
}

/**
 * 退勤リマインダーをSlack DMで送信
 * ⚠️ 通知無効化中 - 復活させる場合は以下のコメントを解除
 */
export function sendClockOutReminder(
  _slackUserId: string,
  _userName: string
): boolean {
  // テスト中のため通知を無効化
  return false;

  /* 通知を復活させる場合は上の return false; を削除して以下のコメントを解除
  const text = `⏰ ${userName}さん、シフト上の退勤時刻から10分経過しましたが、まだ退勤打刻がされていません。打刻をお忘れではないでしょうか？`;
  return postSlackDM(slackUserId, text);
  */
}
