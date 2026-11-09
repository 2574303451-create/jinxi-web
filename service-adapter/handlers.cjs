const {createMemberHandler}=require('../member-local/identity.cjs');
const factories={community:require('../community-local/handler.cjs').createCommunityHandler,attendance:require('../attendance-local/handler.cjs').createAttendanceHandler,points:require('../points-local/handler.cjs').createPointsHandler,operations:require('../operations-local/handler.cjs').createOperationsHandler};
function handlers({settings,connections,env,clientAddress}){
 const identity=createMemberHandler({settings,connect:connections.member,env,clientAddress});
 return {member:identity,...Object.fromEntries(Object.entries(factories).map(([name,create])=>[name,create({settings,identity,connect:connections[name],env})]))};
}
module.exports={handlers};
