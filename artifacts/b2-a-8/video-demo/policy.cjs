const { isPublicAttachmentUrl } = require('../../../lib/guide-attachment-policy');

const guideVideoPath = /^\/guide-videos\/[a-z0-9][a-z0-9_-]*\.(?:mp4|webm)$/;

function platformWatchUrl(url) {
  if (url.origin === 'https://www.bilibili.com' && /^\/video\/(?:BV[A-Za-z0-9]{10}|av[1-9]\d{0,12})\/?$/.test(url.pathname)) {
    return url.origin + url.pathname.replace(/\/$/, '');
  }
  if (url.origin === 'https://www.youtube.com' && url.pathname === '/watch') {
    const ids = url.searchParams.getAll('v');
    if (ids.length === 1 && /^[A-Za-z0-9_-]{11}$/.test(ids[0])) {
      return `${url.origin}/watch?v=${ids[0]}`;
    }
  }
  return null;
}

// Demo-only projection. The caller supplies its own origin and curated asset paths.
// Existing detail DTOs and the B1 SQL aggregate still consume the untouched rows.
function resolvePlayback(item, origin, approvedNativePaths) {
  if (item?.type !== 'video' || !isPublicAttachmentUrl(item.url, true)) return null;
  const url = URL.parse(item.url, origin);
  if (!url || url.username || url.password) return null;
  const legacy = !Object.hasOwn(item, 'playbackMode');
  if ((legacy || item.playbackMode === 'native') && url.origin === origin && !url.search && !url.hash &&
    guideVideoPath.test(url.pathname) && approvedNativePaths.has(url.pathname)) {
    return { mode: 'native', url: url.pathname };
  }
  if (legacy || item.playbackMode === 'external') {
    const watch = platformWatchUrl(url);
    if (watch) return { mode: 'external', url: watch };
  }
  return null;
}

module.exports = { resolvePlayback };
