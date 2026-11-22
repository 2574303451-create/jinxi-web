const crypto = require('node:crypto');
const { hashPassword } = require('../../netlify/functions/_shared/password');
const { boundChange, transaction } = require('./initialize.cjs');
const { roleState } = require('./guard.cjs');

const definitions = [
  ['normal', false, false, true], ['same', false, false, true], ['reviewer', false, false, true],
  ['admin', false, false, true], ['first', true, false, true], ['locked', false, true, true],
  ['disabled', false, false, false],
];
function checkPasswords(passwords) {
  const values = definitions.map(([kind]) => passwords?.[kind]);
  if (values.some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) ||
      new Set(values).size !== values.length) throw Error('SYNTHETIC_FIXTURE_PASSWORDS_REQUIRED');
}

async function seed(client, target, schemaFingerprint, passwords, checkApproval) {
  if (passwords !== undefined) checkPasswords(passwords);
  return transaction(client, async () => {
    const accounts = {};
    await boundChange(client, target, schemaFingerprint);
    await roleState(client, false);
    checkApproval?.();
    for (const [kind, reset, locked, active] of definitions) {
      const account = 'synthetic-' + kind;
      const employeeNo = 'SYNTHETIC-' + kind;
      const password = passwords?.[kind] ?? crypto.randomBytes(24).toString('base64url') + 'A9!';
      const nickname = '合成伙伴 ' + (kind === 'same' ? 'normal' : kind);
      await client.query("INSERT INTO b2_lab.guild_member_profiles(employee_no,display_name,nickname,join_date,source,is_active) VALUES($1,$2,$3,'2018-02-10','synthetic-write-v1',$4)",
        [employeeNo, '合成档案 ' + kind, nickname, active]);
      const { rows: [login] } = await client.query('INSERT INTO b2_lab.guild_member_accounts(employee_no,login_account,password_hash,force_reset_password,is_locked) VALUES($1,$2,$3,$4,$5) RETURNING id',
        [employeeNo, account, await hashPassword(password), reset, locked]);
      const { rows: [member] } = await client.query('INSERT INTO b2_lab.member_account_security_v2(account_id) VALUES($1) RETURNING member_id', [login.id]);
      accounts[kind] = { kind, account, password, memberId: member.member_id, accountId: login.id, nickname };
      if (['reviewer', 'admin'].includes(kind)) await client.query('INSERT INTO community_lab.member_roles VALUES($1,$2)', [member.member_id, kind]);
    }
    await client.query("INSERT INTO community_lab.items(kind,owner_id,author_label,payload,status,legacy) VALUES('message',NULL,$1,$2,'published',true),('guide',NULL,$1,$3,'published',true)",
      [accounts.normal.nickname, { content: '待核实归属的合成历史留言', category: '闲聊', color: '#2360f5' },
        { title: '待核实合成历史攻略', content: '合成历史正文', category: 'PVE', difficulty: 1, tags: [], mediaFiles: [] }]);
    await client.query("SELECT set_config('points.actor',$1,true)", [accounts.admin.memberId]);
    await client.query("INSERT INTO points_lab.rules(code,version,day1,day3,day7,daily_cap,total_cap,starts_at,ends_at,status) VALUES('SYNTHETIC.checkin',1,1,2,3,100,1000,'1900-01-01T00:00Z','2199-12-31T00:00Z','enabled')");
    await client.query("INSERT INTO points_lab.catalogue(name,unit_cost,stock_total,available,per_member_limit,min_earned,starts_at,ends_at,status) VALUES('虚构纸星（仅合成）',2,3,3,2,0,'1900-01-01T00:00Z','2199-12-31T00:00Z','enabled'),('集成用虚构纸签（仅合成）',1,2,2,2,0,'1900-01-01T00:00Z','2199-12-31T00:00Z','enabled')");
    await client.query("INSERT INTO attendance_legacy.checkin_records VALUES(1,'synthetic-normal',$1,'2024-02-28','2024-02-28T00:00Z',3,true,9)", [accounts.normal.nickname]);
    await client.query("INSERT INTO operations_legacy.announcements VALUES(1,'合成旧公告','<p>仅用于旧结构验证</p>','合成旧署名','2020-01-01T00:00Z','2020-01-01T00:00Z')");
    await client.query("INSERT INTO operations_legacy.guild_sponsorship_entries VALUES(1,'同名合成感谢','2020-01-01T00:00Z','2020-01-01T00:00Z'),(2,'同名合成感谢','2020-01-02T00:00Z','2020-01-02T00:00Z')");
    return accounts;
  }, checkApproval);
}

module.exports = { seed, checkPasswords };
