// Compatibility name only. All actual requests additionally verify real DB identity
// and role privileges through function-security; a URL alone never proves isolation.
const {databaseConfig}=require('./function-security');
function publicReadDatabaseUrl(env){return databaseConfig(env).url;}
module.exports = { publicReadDatabaseUrl };
