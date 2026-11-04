// netlify/functions/points.js
const { neon } = require("@neondatabase/serverless")

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  }
}

function normalizeLimit(raw) {
  const limit = Number.parseInt(String(raw || "20"), 10)
  if (!Number.isFinite(limit) || limit <= 0) return 20
  return Math.min(limit, 100)
}

function normalizeToken(raw, maxLength = 80) {
  return String(raw || "").trim().slice(0, maxLength)
}

function normalizePointDelta(raw) {
  const num = Number(raw)
  if (!Number.isFinite(num)) return 0
  return Math.trunc(num)
}

function isSafeToken(value) {
  return /^[A-Za-z0-9._:-]+$/.test(value)
}

async function resolveAccountProfile(sql, loginAccount) {
  const rows = await sql`
    SELECT
      a.login_account,
      p.employee_no,
      p.display_name,
      p.nickname
    FROM guild_member_accounts a
    JOIN guild_member_profiles p
      ON p.employee_no = a.employee_no
    WHERE a.login_account = ${loginAccount}
      AND p.is_active = TRUE
      AND a.is_locked = FALSE
    LIMIT 1
  `

  if (!rows || rows.length === 0) return null
  const row = rows[0]
  return {
    userId: row.login_account,
    userName: row.nickname || row.display_name || row.login_account,
    employeeNo: row.employee_no,
  }
}

async function ensurePointsSchema(sql) {
  const rows = await sql`
    SELECT
      to_regclass('public.point_account') AS point_account_table,
      to_regclass('public.point_ledger') AS point_ledger_table,
      to_regclass('public.point_redeem_order') AS point_redeem_order_table
  `
  const row = rows?.[0] || {}
  return {
    ready: !!row.point_account_table && !!row.point_ledger_table && !!row.point_redeem_order_table,
    tables: row,
  }
}

function formatPointAccount(account) {
  if (!account) return null
  return {
    userId: account.user_id,
    balance: Number(account.balance || 0),
    totalEarned: Number(account.total_earned || 0),
    totalSpent: Number(account.total_spent || 0),
    status: Number(account.status || 1),
    updatedAt: new Date(account.updated_at),
  }
}

function formatLedger(entry) {
  return {
    id: String(entry.id),
    userId: entry.user_id,
    bizId: entry.biz_id,
    scene: entry.scene,
    eventType: entry.event_type,
    ruleCode: entry.rule_code,
    direction: Number(entry.direction), // 1=earn,2=spend
    pointDelta: Number(entry.point_delta || 0),
    balanceBefore: Number(entry.balance_before || 0),
    balanceAfter: Number(entry.balance_after || 0),
    ext: entry.ext_json || {},
    createdAt: new Date(entry.created_at),
  }
}

async function fetchSummary(sql, userId, limit) {
  const [accountRow] = await sql`
    SELECT user_id, balance, total_earned, total_spent, status, updated_at
    FROM point_account
    WHERE user_id = ${userId}
    LIMIT 1
  `

  const ledgerRows = await sql`
    SELECT id, user_id, biz_id, scene, event_type, rule_code, direction, point_delta,
           balance_before, balance_after, ext_json, created_at
    FROM point_ledger
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const [todayEarnedRow] = await sql`
    SELECT COALESCE(SUM(point_delta), 0) AS total
    FROM point_ledger
    WHERE user_id = ${userId}
      AND direction = 1
      AND created_at::date = CURRENT_DATE
  `

  return {
    account: formatPointAccount(accountRow || null),
    ledger: ledgerRows.map(formatLedger),
    todayEarned: Number(todayEarnedRow?.total || 0),
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    }
  }

  if (!process.env.DATABASE_URL) {
    return resp(500, { error: "DATABASE_URL not configured" })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    const schema = await ensurePointsSchema(sql)
    if (!schema.ready) {
      return resp(503, {
        error: "points schema is not ready",
        hint: "Run database-points-activity-schema.sql before calling points APIs",
      })
    }

    if (event.httpMethod === "GET") {
      const query = event.queryStringParameters || {}
      const rawId = String(query.userId || query.account || "").trim()
      const action = String(query.action || "summary").trim()
      const limit = normalizeLimit(query.limit)

      if (!rawId) {
        return resp(400, { error: "userId is required" })
      }

      const profile = await resolveAccountProfile(sql, rawId)
      if (!profile) {
        return resp(401, { error: "请先登录有效账号" })
      }

      const summary = await fetchSummary(sql, profile.userId, limit)

      if (action === "balance") {
        return resp(200, {
          account: summary.account,
          todayEarned: summary.todayEarned,
          accountInfo: profile,
        })
      }

      if (action === "ledger" || action === "history") {
        return resp(200, {
          ledger: summary.ledger,
          accountInfo: profile,
        })
      }

      return resp(200, {
        ...summary,
        accountInfo: profile,
      })
    }

    if (event.httpMethod === "POST") {
      let body = {}
      try {
        body = JSON.parse(event.body || "{}")
      } catch {
        return resp(400, { error: "invalid JSON body" })
      }

      const action = String(body.action || "").trim()
      const rawId = String(body.userId || body.account || "").trim()

      if (!rawId) {
        return resp(400, { error: "userId is required" })
      }

      const profile = await resolveAccountProfile(sql, rawId)
      if (!profile) {
        return resp(401, { error: "请先登录有效账号" })
      }

      if (action === "history") {
        const limit = normalizeLimit(body.limit)
        const summary = await fetchSummary(sql, profile.userId, limit)
        return resp(200, {
          ledger: summary.ledger,
          accountInfo: profile,
        })
      }

      if (action === "award") {
        const scene = normalizeToken(body.scene, 40)
        const eventType = normalizeToken(body.eventType, 60)
        const bizId = normalizeToken(body.bizId, 120)
        const pointDelta = normalizePointDelta(body.pointDelta)

        if (!scene || !eventType || !bizId) {
          return resp(400, { error: "scene, eventType and bizId are required" })
        }
        if (!isSafeToken(scene) || !isSafeToken(eventType) || !isSafeToken(bizId)) {
          return resp(400, { error: "scene/eventType/bizId format is invalid" })
        }
        if (pointDelta <= 0 || pointDelta > 5000) {
          return resp(400, { error: "pointDelta must be between 1 and 5000" })
        }

        let extRaw = "{}"
        try {
          extRaw = JSON.stringify(body.ext && typeof body.ext === "object" ? body.ext : {})
        } catch {
          extRaw = "{}"
        }

        const rows = await sql`
          SELECT point_award(
            ${profile.userId},
            ${scene},
            ${eventType},
            ${bizId},
            ${pointDelta},
            ${extRaw}::jsonb
          ) AS result
        `

        return resp(200, {
          ...(rows?.[0]?.result || {}),
          accountInfo: profile,
        })
      }

      if (action === "redeem") {
        const itemCode = String(body.itemCode || "").trim()
        const pointCost = Number(body.pointCost || 0)
        const orderNo = String(body.orderNo || body.bizId || "").trim() || null

        if (!itemCode) {
          return resp(400, { error: "itemCode is required" })
        }
        if (!Number.isFinite(pointCost) || pointCost <= 0) {
          return resp(400, { error: "pointCost must be > 0" })
        }

        const rows = await sql`
          SELECT point_create_redeem_order(
            ${profile.userId},
            ${itemCode},
            ${Math.trunc(pointCost)},
            ${orderNo}
          ) AS result
        `

        return resp(200, {
          ...(rows?.[0]?.result || {}),
          accountInfo: profile,
        })
      }

      return resp(400, { error: "invalid action" })
    }

    return resp(405, { error: "Method not allowed" })
  } catch (error) {
    console.error("Points API error:", error)
    return resp(500, { error: error.message || String(error) })
  }
}
