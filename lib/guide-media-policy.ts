// Explicit, shared by rendering and submission. Do not widen script-src to support media.
export const GUIDE_VIDEO_ORIGIN =
  "https://interactive-examples.mdn.mozilla.net";
export function safeMediaUrl(value: string) {
  if (typeof value !== "string" || !value.trim()) return null;
  value = value.trim();
  if (/^data:image\/(?:jpeg|png|gif|webp);base64,[a-z\d+/=\s]+$/i.test(value))
    return value;
  try {
    const url = new URL(value, "https://jinxi.invalid");
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? value
      : null;
  } catch {
    return null;
  }
}
export function canEmbedVideo(value: string, base: string) {
  try {
    const url = new URL(value, base);
    return (
      (url.origin === new URL(base).origin &&
        ["http:", "https:"].includes(url.protocol)) ||
      url.origin === GUIDE_VIDEO_ORIGIN
    );
  } catch {
    return false;
  }
}
