// Browser-only maintained sanitizer. Loading is deferred until an announcement
// or its editor is actually opened; server rendering never returns raw HTML.
export type AnnouncementSanitizer = (input: string) => string;
export const MAX_ANNOUNCEMENT_HTML = 1_000_000;
let pending: Promise<AnnouncementSanitizer> | undefined;
const raster = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/]+={0,2}$/i;

export function safeAnnouncementUrl(value: string, image = false): boolean {
  if (!value || value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (image && raster.test(value)) return value.length <= 700_000;
  if (value.length > 2048) return false;
  if (value.startsWith('#')) return !image;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function loadAnnouncementSanitizer(): Promise<AnnouncementSanitizer> {
  if (typeof window === 'undefined') return Promise.reject(Error('Browser sanitizer unavailable'));
  if (!pending) pending = import('dompurify').then(({default: createDOMPurify}) => {
    const purify = createDOMPurify(window);
    if (!purify.isSupported) throw Error('HTML sanitization unsupported');
    purify.addHook('uponSanitizeAttribute', (node, data) => {
      if (data.attrName === 'src' && (node.nodeName !== 'IMG' || !safeAnnouncementUrl(data.attrValue, true))) data.keepAttr = false;
      if (data.attrName === 'href' && (node.nodeName !== 'A' || !safeAnnouncementUrl(data.attrValue))) data.keepAttr = false;
      if (data.attrName === 'start' && !/^[1-9]\d{0,3}$/.test(data.attrValue)) data.keepAttr = false;
    });
    return (input: string) => {
      if (typeof input !== 'string' || input.length > MAX_ANNOUNCEMENT_HTML) return '';
      return purify.sanitize(input, {
        ALLOWED_TAGS: ['p','div','span','br','b','strong','i','em','u','s','strike','h2','h3','h4','ul','ol','li','blockquote','pre','code','a','img'],
        ALLOWED_ATTR: ['href','title','src','alt','start'],
        FORBID_TAGS: ['svg','math','script','style','template','iframe','object','embed','form','input','button','textarea','select','link','meta','base','audio','video','source'],
        FORBID_ATTR: ['style','class','id','name','srcset'],
        ALLOW_ARIA_ATTR: false,
        ALLOW_DATA_ATTR: false,
        SANITIZE_NAMED_PROPS: true,
        RETURN_TRUSTED_TYPE: false,
      });
    };
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}
