// The build replaces this null binding only after validating the deployment.
import entry from '../../entry.cjs';
const receipt = null; // JINXI_BUILD_RECEIPT

export const config = {
  path: [
    '/api/member', '/api/community', '/api/attendance', '/api/points', '/api/operations',
    '/.netlify/functions/messages', '/.netlify/functions/strategies', '/.netlify/functions/guide-video-stats',
    '/.netlify/functions/announcements', '/.netlify/functions/sponsorship',
  ],
  method: ['GET', 'POST'],
};

export default entry.createEntry(receipt);
