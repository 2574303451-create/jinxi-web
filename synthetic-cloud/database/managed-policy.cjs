const { createHash } = require('node:crypto');
const tls = require('node:tls');

// Only the reviewed synthetic database, after renaming its existing database in place.
function managedTarget(target) {
  if (!target) return false;
  return createHash('sha256').update([target.projectId, target.branchId, target.endpointId,
    target.host, target.database, target.fingerprint].join('\0')).digest('hex') === 'dcafe9a7cf3886ec421ed831189acca996736f992a599a7d7a33caa6b7ba6f3a';
}

function verifiedManagedSocket(client, host) {
  const socket = client.connection?.stream;
  return socket instanceof tls.TLSSocket &&
    socket.encrypted === true && socket.authorized === true && socket.servername === host &&
    client.host === host && client.ssl?.rejectUnauthorized === true &&
    ['TLSv1.2','TLSv1.3'].includes(socket.getProtocol()) &&
    !tls.checkServerIdentity(host, socket.getPeerCertificate());
}

function transportVerified(client, target, backendTls) {
  if (!managedTarget(target)) return backendTls === true;
  return typeof backendTls === 'boolean' && verifiedManagedSocket(client, target.host);
}

function activationLoggingSafe(loggingSafe, parameters, managed) {
  if (!loggingSafe || !['fatal','panic'].includes(parameters.errors)) return false;
  if (!managed) return parameters.length === '0';
  return ['0','-1'].includes(parameters.length) && parameters.tx_sample === '0' &&
    parameters.duration_logging === 'off';
}

function managedRolePassword(target, value) {
  return managedTarget(target) && typeof value === 'string' && /^npg_[A-Za-z0-9]{12}$/.test(value);
}

module.exports = { managedRolePassword, managedTarget, transportVerified, verifiedManagedSocket, activationLoggingSafe };
