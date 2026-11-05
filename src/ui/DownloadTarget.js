/** Browser platform detection for choosing the appropriate download prompt. */
export function detectDownloadTarget(navigatorLike = (typeof navigator !== 'undefined' ? navigator : null)) {
  if (!navigatorLike) return 'OTHER';
  const platform = String(navigatorLike.userAgentData?.platform || navigatorLike.platform || '');
  const agent = String(navigatorLike.userAgent || '');
  if (/android/i.test(`${platform} ${agent}`)) return 'ANDROID';
  if (/iphone|ipad|ipod/i.test(agent) || (/mac/i.test(platform) && Number(navigatorLike.maxTouchPoints) > 1)) return 'IOS';
  if (/win/i.test(platform) || /windows/i.test(agent)) return 'WINDOWS';
  return 'OTHER';
}
