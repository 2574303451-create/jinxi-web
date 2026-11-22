// Provider site metadata may use HTTP; the request/build origin stays HTTPS.
export function matchesSiteMetadata(approvedOrigin, siteUrl) {
  return typeof approvedOrigin === 'string' &&
    /^https:\/\/[a-z0-9][a-z0-9-]{1,62}\.netlify\.app$/.test(approvedOrigin) &&
    (siteUrl === approvedOrigin || siteUrl === approvedOrigin.replace('https:', 'http:'));
}
