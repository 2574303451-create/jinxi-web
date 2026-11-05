// Legacy identity or write contract is suspended until its trusted replacement is reviewed.
const {suspendedEndpoint}=require('./_shared/function-security');
exports.handler=suspendedEndpoint('checkin',process.env);
