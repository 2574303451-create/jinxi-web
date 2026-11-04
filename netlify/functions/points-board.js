// netlify/functions/points-board.js
const { neon } = require("@neondatabase/serverless")

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  return Math.min(limit, 100)
}

async function ensureSchema(sql) {
  const rows = await sql`
    SELECT
      to_regclass('public.point_account') AS point_account_table,
      to_regclass('public.point_ledger') AS point_ledger_table
  `
  const row = rows?.[0] || {}
  return {
    ready: !!row.point_account_table && !!row.point_ledger_table,
    tables: row,
  }
}

function toNum(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    }
  }

  if (event.httpMethod !== "GET") {
    return resp(405, { error: "Method not allowed" })
  }

  if (!process.env.DATABASE_URL) {
    return resp(500, { error: "DATABASE_URL not configured" })
  }

  const sql = neon(process.env.DATABASE_URL)
  const query = event.queryStringParameters || {}
  const limit = normalizeLimit(query.limit)

  try {
    const schema = await ensureSchema(sql)
    if (!schema.ready) {
      return resp(503, {
        error: "points schema is not ready",
        hint: "Run database-points-activity-schema.sql before calling points-board API",
      })
    }

    const rankingRows = await sql`
      WITH profile AS (
        SELECT
          a.login_account AS user_id,
          COALESCE(NULLIF(TRIM(p.nickname), ''), NULLIF(TRIM(p.display_name), ''), a.login_account) AS user_name
        FROM guild_member_accounts a
        JOIN guild_member_profiles p
          ON p.employee_no = a.employee_no
        WHERE p.is_active = TRUE
          AND a.is_locked = FALSE
      ),
      earned_totals AS (
        SELECT
          user_id,
          COALESCE(SUM(CASE WHEN direction = 1 THEN point_delta ELSE 0 END), 0)::BIGINT AS total_activity_points,
          COALESCE(SUM(CASE WHEN direction = 1 AND scene = 'daily_behavior' AND event_type = 'checkin' THEN point_delta ELSE 0 END), 0)::BIGINT AS checkin_points
        FROM point_ledger
        GROUP BY user_id
      )
      SELECT
        p.user_id,
        p.user_name,
        COALESCE(et.total_activity_points, pa.total_earned, 0)::BIGINT AS total_activity_points,
        COALESCE(et.checkin_points, 0)::BIGINT AS checkin_points,
        GREATEST(COALESCE(et.total_activity_points, pa.total_earned, 0) - COALESCE(et.checkin_points, 0), 0)::BIGINT AS other_activity_points,
        COALESCE(pa.balance, 0)::BIGINT AS balance
      FROM profile p
      LEFT JOIN point_account pa
        ON pa.user_id = p.user_id
      LEFT JOIN earned_totals et
        ON et.user_id = p.user_id
      WHERE COALESCE(et.total_activity_points, pa.total_earned, 0) > 0
      ORDER BY total_activity_points DESC, checkin_points DESC, p.user_id ASC
      LIMIT ${limit}
    `

    const sceneRows = await sql`
      SELECT
        scene,
        COALESCE(SUM(CASE WHEN direction = 1 THEN point_delta ELSE 0 END), 0)::BIGINT AS points
      FROM point_ledger
      GROUP BY scene
      HAVING COALESCE(SUM(CASE WHEN direction = 1 THEN point_delta ELSE 0 END), 0) > 0
      ORDER BY points DESC, scene ASC
    `

    const [overviewRow] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN direction = 1 THEN point_delta ELSE 0 END), 0)::BIGINT AS total_activity_points,
        COALESCE(SUM(CASE WHEN direction = 1 AND scene = 'daily_behavior' AND event_type = 'checkin' THEN point_delta ELSE 0 END), 0)::BIGINT AS checkin_points,
        COALESCE(SUM(CASE WHEN direction = 1 AND NOT (scene = 'daily_behavior' AND event_type = 'checkin') THEN point_delta ELSE 0 END), 0)::BIGINT AS other_activity_points
      FROM point_ledger
    `

    return resp(200, {
      success: true,
      entries: rankingRows.map((row) => ({
        userId: row.user_id,
        userName: row.user_name,
        totalActivityPoints: toNum(row.total_activity_points),
        checkinPoints: toNum(row.checkin_points),
        otherActivityPoints: toNum(row.other_activity_points),
        balance: toNum(row.balance),
      })),
      sceneSummary: sceneRows.map((row) => ({
        scene: row.scene,
        points: toNum(row.points),
      })),
      overview: {
        totalActivityPoints: toNum(overviewRow?.total_activity_points),
        checkinPoints: toNum(overviewRow?.checkin_points),
        otherActivityPoints: toNum(overviewRow?.other_activity_points),
      },
      includes: {
        checkinLeaderboardPoints: true,
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("points-board error:", error)
    return resp(500, { error: error.message || String(error) })
  }
}
