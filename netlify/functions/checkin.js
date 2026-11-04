// netlify/functions/checkin.js
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
  const limit = Number.parseInt(String(raw || "30"), 10)
  if (!Number.isFinite(limit) || limit <= 0) return 30
  return Math.min(limit, 90)
}

function normalizeHeaderValue(value) {
  if (!value) return ""
  if (Array.isArray(value)) return String(value[0] || "")
  return String(value)
}

function getHeader(event, key) {
  const headers = event.headers || {}
  return normalizeHeaderValue(headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()])
}

function getClientIp(event) {
  const nfIp = getHeader(event, "x-nf-client-connection-ip").trim()
  if (nfIp) return nfIp

  const forwarded = getHeader(event, "x-forwarded-for")
  if (!forwarded) return null
  const first = forwarded.split(",")[0]?.trim()
  return first || null
}

function formatUserStats(stats) {
  return {
    id: String(stats.id),
    userId: stats.user_id,
    userName: stats.user_name,
    totalCheckins: Number(stats.total_checkins || 0),
    continuousCheckins: Number(stats.continuous_checkins || 0),
    maxContinuous: Number(stats.max_continuous || 0),
    totalPoints: Number(stats.total_points || 0),
    lastCheckinDate: stats.last_checkin_date,
    firstCheckinDate: stats.first_checkin_date,
    thisMonthCheckins: Number(stats.this_month_checkins || 0),
    thisYearCheckins: Number(stats.this_year_checkins || 0),
    updatedAt: new Date(stats.updated_at),
  }
}

function formatCheckinRecord(record) {
  return {
    id: String(record.id),
    userId: record.user_id,
    userName: record.user_name,
    checkinDate: record.checkin_date,
    checkinTime: new Date(record.checkin_time),
    rewardPoints: Number(record.reward_points || 1),
    isContinuous: !!record.is_continuous,
    continuousDays: Number(record.continuous_days || 1),
    createdAt: new Date(record.created_at),
  }
}

function formatCheckinResult(result) {
  return {
    success: !!result?.success,
    message: String(result?.message || ""),
    rewardPoints: Number(result?.reward_points ?? result?.rewardPoints ?? 0),
    continuousDays: Number(result?.continuous_days ?? result?.continuousDays ?? 1),
    alreadyChecked: !!(result?.already_checked ?? result?.alreadyChecked),
    bizId: String(result?.biz_id ?? result?.bizId ?? ""),
    currentBalance: Number(result?.current_balance ?? result?.balance_after ?? result?.currentBalance ?? 0),
    riskDecision: String(result?.risk_decision ?? result?.riskDecision ?? ""),
  }
}

function formatPointAccount(account) {
  return {
    userId: account.user_id,
    balance: Number(account.balance || 0),
    totalEarned: Number(account.total_earned || 0),
    totalSpent: Number(account.total_spent || 0),
    updatedAt: new Date(account.updated_at),
  }
}

async function performCheckin(sql, profile, { bizId = null, deviceId = null, ip = null } = {}) {
  try {
    const rows = await sql`
      SELECT perform_checkin_v2(
        ${profile.userId},
        ${profile.userName},
        ${bizId},
        ${deviceId},
        ${ip}
      ) AS result
    `
    return rows?.[0]?.result || {}
  } catch (error) {
    const message = String(error?.message || "")
    // Backward compatibility: if DB is not migrated yet, use legacy function.
    if (message.includes("perform_checkin_v2")) {
      const rows = await sql`SELECT perform_checkin(${profile.userId}, ${profile.userName}) AS result`
      return rows?.[0]?.result || {}
    }
    throw error
  }
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
    if (event.httpMethod === "GET") {
      const { userId = "", account = "" } = event.queryStringParameters || {}
      const rawId = String(userId || account).trim()
      if (!rawId) {
        return resp(400, { error: "userId is required" })
      }

      // 中文注释：签到状态读取时，统一先从账号体系解析登录身份
      const profile = await resolveAccountProfile(sql, rawId)
      if (!profile) {
        return resp(401, { error: "请先登录有效账号" })
      }

      const [todayRecord] = await sql`
        SELECT *
        FROM checkin_records
        WHERE user_id = ${profile.userId}
          AND checkin_date = CURRENT_DATE
      `

      const [userStats] = await sql`
        SELECT *
        FROM user_checkin_stats
        WHERE user_id = ${profile.userId}
      `

      let pointAccount = null
      try {
        const rows = await sql`
          SELECT user_id, balance, total_earned, total_spent, updated_at
          FROM point_account
          WHERE user_id = ${profile.userId}
          LIMIT 1
        `
        pointAccount = rows?.[0] || null
      } catch {
        // backward compatible for environments without points schema
      }

      return resp(200, {
        hasCheckedToday: !!todayRecord,
        userStats: userStats ? formatUserStats(userStats) : null,
        todayRecord: todayRecord ? formatCheckinRecord(todayRecord) : null,
        pointAccount: pointAccount ? formatPointAccount(pointAccount) : null,
        account: {
          userId: profile.userId,
          userName: profile.userName,
          employeeNo: profile.employeeNo,
        },
      })
    }

    if (event.httpMethod === "POST") {
      let body = {}
      try {
        body = JSON.parse(event.body || "{}")
      } catch {
        return resp(400, { error: "invalid JSON body" })
      }
      const action = String(body.action || "checkin")
      const rawId = String(body.userId || body.account || "").trim()

      if (!rawId) {
        return resp(400, { error: "userId is required" })
      }

      // 中文注释：所有签到写操作都必须绑定已登录账号
      const profile = await resolveAccountProfile(sql, rawId)
      if (!profile) {
        return resp(401, { error: "请先登录有效账号" })
      }

      if (action === "checkin") {
        const result = await performCheckin(sql, profile, {
          bizId: body.bizId || null,
          deviceId: body.deviceId || null,
          ip: getClientIp(event),
        })
        const normalized = formatCheckinResult(result)
        return resp(200, {
          ...normalized,
          userId: profile.userId,
          userName: profile.userName,
        })
      }

      if (action === "history") {
        const limit = normalizeLimit(body.limit)
        const records = await sql`
          SELECT *
          FROM checkin_records
          WHERE user_id = ${profile.userId}
          ORDER BY checkin_date DESC
          LIMIT ${limit}
        `

        return resp(200, {
          records: records.map(formatCheckinRecord),
        })
      }

      return resp(400, { error: "invalid action" })
    }

    return resp(405, { error: "Method not allowed" })
  } catch (error) {
    console.error("Checkin API error:", error)
    return resp(500, { error: error.message || String(error) })
  }
}
