/**
 * 認証サービス
 */

import { getFirebaseApiKey } from '../config/firebase';
import { ERROR_MESSAGES, ROLES, USER_STATUS, CACHE_DURATION } from '../config/constants';
import { upsertUser, getUser, getAllUsers } from '../repositories/FirestoreRepository';
import { backupUser } from '../repositories/SpreadsheetRepository';
import { cacheGet, cachePut, cacheRemove, CacheKeys } from '../utils/cache';
import { User, FirebaseAuthUser, UserUpdateInput } from '../models/User';

/**
 * IDトークンを検証し、Firebase認証ユーザー情報を取得
 */
export async function verifyIdToken(idToken: string): Promise<FirebaseAuthUser> {
  try {
    const apiKey = getFirebaseApiKey();

    // デバッグログ: API Keyの有無を確認
    if (!apiKey || apiKey.trim() === '') {
      Logger.log('[ERROR] FIREBASE_API_KEY が Script Properties に設定されていません');
      throw new Error('FIREBASE_API_KEY が設定されていません。GASのプロジェクト設定 > スクリプトプロパティ で設定してください。');
    }

    Logger.log('[DEBUG] IDトークン検証開始');
    Logger.log(`[DEBUG] API Key: ${apiKey.substring(0, 10)}...`);

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken }),
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText() || '{}';

    Logger.log(`[DEBUG] Firebase API レスポンスコード: ${statusCode}`);
    Logger.log(`[DEBUG] Firebase API レスポンス: ${responseText.substring(0, 200)}`);

    const json = JSON.parse(responseText);

    if (statusCode !== 200) {
      Logger.log(`[ERROR] Firebase API エラー: ${JSON.stringify(json)}`);
      throw new Error(`Firebase認証エラー (${statusCode}): ${json.error?.message || 'Unknown error'}`);
    }

    if (!json.users || !json.users[0]) {
      Logger.log('[ERROR] IDトークンが無効です（ユーザー情報なし）');
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const user = json.users[0];
    Logger.log(`[DEBUG] 認証成功: UID=${user.localId}, Email=${user.email}`);

    return {
      uid: user.localId,
      email: user.email || '',
      displayName:
        user.displayName || (user.email ? user.email.split('@')[0] : 'ユーザー'),
    };
  } catch (error) {
    Logger.log(`[ERROR] verifyIdToken エラー: ${error}`);
    throw error;
  }
}

/**
 * アプリケーションユーザーを取得または作成（キャッシュ対応）
 */
export async function getOrCreateAppUser(
  authUser: FirebaseAuthUser
): Promise<User> {
  // キャッシュチェック
  const cacheKey = CacheKeys.user(authUser.uid);
  const cached = cacheGet<User>(cacheKey);
  if (cached) return cached;

  // Firestoreから取得
  let user = await getUser(authUser.uid);

  if (user) {
    // 既存ユーザー：メールアドレスまたは表示名が変更されていれば更新
    let needsUpdate = false;
    const updates: UserUpdateInput = {};

    if (authUser.email && authUser.email !== user.email) {
      updates.displayName = authUser.email;
      needsUpdate = true;
    }
    if (authUser.displayName && authUser.displayName !== user.displayName) {
      updates.displayName = authUser.displayName;
      needsUpdate = true;
    }

    if (needsUpdate) {
      user = {
        ...user,
        ...updates,
        updatedAt: new Date(),
      };
      await upsertUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
      });
      backupUser(user);
    }
  } else {
    // 新規ユーザーの作成（初回ユーザーはadmin、以降はmember）
    // Firestoreから実際に全ユーザーを取得して判定
    Logger.log('[DEBUG] getOrCreateAppUser: ユーザーが存在しないため新規作成します');
    Logger.log(`[DEBUG] authUser: ${JSON.stringify(authUser)}`);

    Logger.log('[DEBUG] getAllUsers() を呼び出します');
    const allUsers = await getAllUsers();
    Logger.log(`[DEBUG] getAllUsers() 完了: ${allUsers.length}件`);

    const isFirstUser = !allUsers || allUsers.length === 0;
    Logger.log(`[DEBUG] isFirstUser: ${isFirstUser}`);

    Logger.log('[DEBUG] upsertUser() を呼び出します');
    user = await upsertUser({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      role: isFirstUser ? ROLES.ADMIN : ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
    });
    Logger.log('[DEBUG] upsertUser() 完了');

    Logger.log('[DEBUG] backupUser() を呼び出します');
    backupUser(user);
    Logger.log('[DEBUG] backupUser() 完了');
  }

  // キャッシュに保存
  cachePut(cacheKey, user, CACHE_DURATION.USER);

  return user;
}

/**
 * 認証が必要なAPIで使用：認証チェック + ユーザー情報取得
 */
export async function requireAuth(idToken: string): Promise<User> {
  const authUser = await verifyIdToken(idToken);
  const appUser = await getOrCreateAppUser(authUser);

  if (appUser.status === USER_STATUS.SUSPENDED) {
    throw new Error(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
  }

  return appUser;
}

/**
 * 管理者権限が必要なAPIで使用
 */
export async function requireAdmin(idToken: string): Promise<User> {
  const user = await requireAuth(idToken);

  if (user.role !== ROLES.ADMIN) {
    throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
  }

  return user;
}

/**
 * 表示名を更新
 */
export async function updateDisplayName(
  uid: string,
  newName: string
): Promise<void> {
  const trimmed = newName.trim().slice(0, 64);
  if (!trimmed) {
    throw new Error('表示名を入力してください');
  }

  await upsertUser({
    uid,
    email: '', // メールは変更しない
    displayName: trimmed,
  });

  // キャッシュを削除
  cacheRemove(CacheKeys.user(uid));

  // バックアップ
  const user = await getUser(uid);
  if (user) {
    backupUser(user);
  }
}
