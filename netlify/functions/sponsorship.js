// netlify/functions/sponsorship.js
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
  const limit = Number.parseInt(String(raw || "50"), 10)
  if (!Number.isFinite(limit) || limit <= 0) return 50
  return Math.min(limit, 200)
}

function formatShanghaiTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const token = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${token.year}-${token.month}-${token.day} ${token.hour}:${token.minute}`
}

async function ensureSponsorshipTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS guild_sponsorship_entries (
      id BIGSERIAL PRIMARY KEY,
      sponsor_name TEXT NOT NULL,
      sponsor_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_guild_sponsorship_entries_time
    ON guild_sponsorship_entries (sponsor_time DESC, id DESC)
  `
}

function formatEntry(row) {
  return {
    id: Number(row.id),
    sponsor: String(row.sponsor_name || ""),
    time: formatShanghaiTime(row.sponsor_time || row.created_at || new Date()),
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
    await ensureSponsorshipTable(sql)

    if (event.httpMethod === "GET") {
      const query = event.queryStringParameters || {}
      const limit = normalizeLimit(query.limit)
      const rows = await sql`
        SELECT id, sponsor_name, sponsor_time, created_at
        FROM guild_sponsorship_entries
        ORDER BY sponsor_time DESC, id DESC
        LIMIT ${limit}
      `

      return resp(200, {
        success: true,
        entries: rows.map(formatEntry),
      })
    }

    if (event.httpMethod === "POST") {
      let body = {}
      try {
        body = JSON.parse(event.body || "{}")
      } catch {
        return resp(400, { error: "invalid JSON body" })
      }

      const sponsor = String(body.nickname || body.sponsor || "").trim()
      if (!sponsor) {
        return resp(400, { error: "nickname is required" })
      }
      if (sponsor.length > 40) {
        return resp(400, { error: "nickname is too long (max 40 chars)" })
      }

      const inserted = await sql`
        INSERT INTO guild_sponsorship_entries (sponsor_name)
        VALUES (${sponsor})
        RETURNING id, sponsor_name, sponsor_time, created_at
      `

      return resp(200, {
        success: true,
        entry: formatEntry(inserted[0]),
      })
    }

    return resp(405, { error: "Method not allowed" })
  } catch (error) {
    console.error("sponsorship API error:", error)
    return resp(500, { error: error.message || String(error) })
  }
}
