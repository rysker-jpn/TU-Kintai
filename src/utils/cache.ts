/**
 * キャッシュユーティリティ
 */

/**
 * キャッシュから値を取得
 */
export function cacheGet<T>(key: string): T | null {
  try {
    const cache = CacheService.getScriptCache();
    const value = cache.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (e) {
    Logger.log(`Cache get error: ${e}`);
    return null;
  }
}

/**
 * キャッシュに値を保存
 */
export function cachePut<T>(key: string, value: T, expirationInSeconds: number = 300): void {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(value), expirationInSeconds);
  } catch (e) {
    Logger.log(`Cache put error: ${e}`);
  }
}

/**
 * キャッシュから値を削除
 */
export function cacheRemove(key: string): void {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(key);
  } catch (e) {
    Logger.log(`Cache remove error: ${e}`);
  }
}

/**
 * キャッシュをクリア
 */
export function cacheClear(): void {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll([]);
  } catch (e) {
    Logger.log(`Cache clear error: ${e}`);
  }
}

/**
 * キャッシュキー生成ヘルパー
 */
export const CacheKeys = {
  user: (uid: string) => `user_${uid}`,
  todayStatus: (uid: string) => `today_${uid}`,
  worksum: (uid: string, year: number, month: number) => `worksum_${year}_${month}_${uid}`,
  shifts: (uid: string, start: string, end: string) => `shifts_${uid}_${start}_${end}`,
} as const;
