function syntheticHistory(count=208){
 if(!Number.isInteger(count)||count<1||count>208)throw Error('SYNTHETIC_COUNT_REJECTED');
 const data={kind:'jinxi-synthetic-history-v1',profiles:[],accounts:[],messages:[],strategies:[],checkins:[],pointAccounts:[],ledger:[],orders:[],rules:[],announcements:[],sponsorships:[]},anchors={kind:'jinxi-synthetic-bindings-v1',proofSource:'synthetic-authoritative-fixture',members:[],users:[],records:[]};
 for(let i=1;i<=count;i++){const employeeNo='SYN'+String(i).padStart(4,'0'),accountId=String(9007199254740992n+BigInt(i)),memberId='00000000-0000-4000-8000-'+String(i).padStart(12,'0'),userId='synthetic-old-user-'+i;
  data.profiles.push({employee_no:employeeNo,archive_member_id:'synthetic-archive-'+i,nickname:i<=2?'同名合成成员':'合成成员'+i});data.accounts.push({id:accountId,employee_no:employeeNo});anchors.members.push({accountId,employeeNo,memberId,openingBalance:'0'});anchors.users.push({userId,accountId});data.pointAccounts.push({user_id:userId,balance:'0',total_earned:'0',total_spent:'0'});
 }
 data.messages.push({id:'1',name:'同名合成成员',content:'历史昵称不能证明作者'});
 data.strategies.push({id:'1',author:'同名合成成员',category:'PVE',difficulty:1,media_files:[]});anchors.records.push({kind:'strategies',id:'1',accountId:anchors.members[0].accountId});
 return {data,anchors};
}
module.exports={syntheticHistory};
