export const ATTACHMENT_URL_PATTERN: string;
export const EXTRA_WHITESPACE_PATTERN: string;
export const SITE_ORIGIN_PATTERN: string;
export const PATH_ESCAPES: string[][];
export function isPublicAttachmentUrl(
  value: unknown,
  excludePromos?: boolean,
): boolean;
