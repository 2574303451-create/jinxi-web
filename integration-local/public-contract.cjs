// Read-only translation into the existing website DTOs. No legacy writer is enabled.
async function publicContract(name, query, handlers) {
  const read = async (module, values) => {
    const r = await handlers['/api/' + module]({ httpMethod: 'GET', headers: {}, queryStringParameters: values });
    if (r.statusCode !== 200) throw Error('SYNTHETIC_READ_UNAVAILABLE');
    return JSON.parse(r.body);
  };
  if (name === 'messages') return (await read('community', { kind: 'message', scope: 'public' })).items;
  if (name === 'announcements') {
    const result = await read('operations', { kind: 'announcement', view: 'public', limit: '50' });
    return result.items;
  }
  if (name === 'sponsorship') {
    const result = await read('operations', { kind: 'sponsor', view: 'public', limit: '50' });
    return { success: true, entries: result.items };
  }
  if (name !== 'strategies' && name !== 'guide-video-stats') return null;
  let rows = (await read('community', { kind: 'guide', scope: 'public' })).items;
  if (name === 'guide-video-stats') return { contract: 'jinxi.guides.video-stats.v1', status: 'ready', countType: 'published-valid-url-video-attachments-v1', count: rows.reduce((n, r) => n + r.mediaFiles.filter(m => m.type === 'video').length, 0), calculatedAt: new Date().toISOString() };
  if (query.id) return { strategy: rows.find(row => row.id === query.id) || null };
  if (query.category) rows = rows.filter(r => r.category === query.category);
  if (query.difficulty) rows = rows.filter(r => r.difficulty === Number(query.difficulty));
  if (query.search) rows = rows.filter(r => (r.title + r.content).includes(query.search));
  if (query.feed === 'pinned') rows = rows.filter(r => r.isPinned);
  if (query.feed === 'video') rows = rows.filter(r => r.mediaFiles.some(m => m.type === 'video'));
  if (query.sortBy === 'likes') rows.sort((a,b) => b.likeCount - a.likeCount || a.id.localeCompare(b.id));
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12)), offset = Math.min(100, Math.max(0, Number(query.offset) || 0));
  const strategies = rows.slice(offset, offset + limit).map(r => ({ ...r, excerpt: r.content.slice(0,150), commentCount: r.comments.length, hasVideo: r.mediaFiles.some(m => m.type === 'video'), videoCount: r.mediaFiles.filter(m => m.type === 'video').length }));
  return { contract: 'jinxi.guides.summary.v2', appliedFeed: query.feed || null, strategies, pagination: { total: rows.length, limit, offset, hasMore: offset + limit < rows.length } };
}
module.exports = { publicContract };
