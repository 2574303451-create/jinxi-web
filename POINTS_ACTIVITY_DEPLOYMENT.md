# 积分活动体系上线说明

## 1. 目标范围

本次上线包含以下能力：

- 积分核心账本：`point_account`、`point_ledger`
- 规则与风控：`point_rule`、`risk_event_log`
- 兑换体系：`point_redeem_order`
- 统一函数：`point_award`、`point_spend`、`point_create_redeem_order`
- 签到联动：`perform_checkin_v2`（并保留 `perform_checkin` 兼容入口）
- API：`/.netlify/functions/points`、升级后的 `/.netlify/functions/checkin`

## 2. 数据库上线

在 Neon SQL Editor 中执行：

`database-points-activity-schema.sql`

执行完成后，建议用以下 SQL 快速验证：

```sql
SELECT to_regclass('public.point_account') AS point_account_table;
SELECT to_regclass('public.point_ledger') AS point_ledger_table;
SELECT to_regclass('public.point_rule') AS point_rule_table;
SELECT to_regclass('public.point_redeem_order') AS point_redeem_order_table;
SELECT to_regclass('public.risk_event_log') AS risk_event_log_table;
SELECT to_regprocedure('perform_checkin_v2(text,text,text,text,text)') AS checkin_v2_fn;
```

## 3. 应用部署

1. 确认 Netlify 环境变量 `DATABASE_URL` 已配置。  
2. 部署代码（本地）：

```bash
npm run build
netlify deploy --prod --dir=out
```

## 4. 上线后回归

### 4.1 签到

1. 登录账号后调用签到：`POST /.netlify/functions/checkin`  
2. 预期返回 `rewardPoints`、`currentBalance`、`bizId`。  
3. 同日重复签到：预期 `alreadyChecked=true` 或提示已签到，不重复加分。  

### 4.2 积分查询

1. 查询摘要：`GET /.netlify/functions/points?userId=<账号>&action=summary`  
2. 预期返回 `account.balance`、`todayEarned`、`ledger[]`。  

### 4.3 积分兑换

1. 扣分兑换：`POST /.netlify/functions/points`，body:

```json
{
  "userId": "demo_account",
  "action": "redeem",
  "itemCode": "gift_coupon_10",
  "pointCost": 30,
  "orderNo": "redeem-demo-001"
}
```

2. 预期返回 `success=true`，并在 `point_redeem_order` 生成订单。  

## 5. 回滚方案

如果应用代码已发布但数据库未迁移：

- `checkin` 仍可回落旧函数（兼容处理已内置）。
- `points` API 会返回 `503 points schema is not ready`，不会写入脏数据。

如果需完全回滚：

1. 回滚 Netlify 到上一版代码。  
2. 数据库层面仅新增表与函数，不影响旧签到结构，可保留不删。  

