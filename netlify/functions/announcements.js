const { neon } = require("@neondatabase/serverless")
const crypto = require("crypto")

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultTempPassword123!"
const MAX_TITLE_LENGTH = 120
const MAX_CONTENT_LENGTH = 50000
const FORCED_AUTHOR = "\u6267\u624b"
let tableReady = false

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

function resp(statusCode, data) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(data),
  }
}

function verifyAdminToken(token) {
  if (!token || typeof token !== "string") {
    return false
  }

  const hashedInput = crypto.createHash("sha256").update(token).digest("hex")
  const hashedAdmin = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest("hex")
  return hashedInput === hashedAdmin
}

function parseBody(rawBody) {
  try {
    return JSON.parse(rawBody || "{}")
  } catch {
    return {}
  }
}

function getToken(event, body) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization
  const headerToken = event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"]

  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim()
  }

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim()
  }

  if (typeof body?.token === "string" && body.token.trim()) {
    return body.token.trim()
  }

  return ""
}

async function ensureAnnouncementsTable(sql) {
  if (tableReady) {
    return
  }

  await sql`
    CREATE TABLE IF NOT EXISTS announcements (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      content_html TEXT NOT NULL,
      author VARCHAR(80) NOT NULL DEFAULT '\u6267\u624b',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_announcements_created_at
    ON announcements (created_at DESC)
  `

  await sql`
    UPDATE announcements
    SET author = '\u6267\u624b'
    WHERE author IS DISTINCT FROM '\u6267\u624b'
  `

  tableReady = true
}

function normalizeRow(row) {
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    author: FORCED_AUTHOR,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function validateAnnouncementInput(title, contentHtml) {
  if (!title) {
    return "Title is required"
  }
  if (!contentHtml) {
    return "Content is required"
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title exceeds ${MAX_TITLE_LENGTH} characters`
  }
  if (contentHtml.length > MAX_CONTENT_LENGTH) {
    return `Content exceeds ${MAX_CONTENT_LENGTH} characters`
  }
  return ""
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return resp(200, {})
  }

  if (!process.env.DATABASE_URL) {
    return resp(500, { error: "DATABASE_URL not configured" })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    await ensureAnnouncementsTable(sql)

    if (event.httpMethod === "GET") {
      const rows = await sql`
        SELECT id, title, content_html, author, created_at, updated_at
        FROM announcements
        ORDER BY created_at DESC
        LIMIT 100
      `
      return resp(200, rows.map(normalizeRow))
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event.body)
      const token = getToken(event, body)
      const isValidAdmin = verifyAdminToken(token)

      if (body.action === "verify") {
        return resp(200, { valid: isValidAdmin })
      }

      if (!isValidAdmin) {
        return resp(401, { error: "Admin authentication failed" })
      }

      const title = String(body.title || "").trim()
      const contentHtml = String(body.contentHtml || "").trim()
      const validationError = validateAnnouncementInput(title, contentHtml)
      if (validationError) {
        return resp(400, { error: validationError })
      }

      const inserted = await sql`
        INSERT INTO announcements (title, content_html, author)
        VALUES (${title}, ${contentHtml}, '\u6267\u624b')
        RETURNING id, title, content_html, author, created_at, updated_at
      `

      return resp(201, normalizeRow(inserted[0]))
    }

    if (event.httpMethod === "PUT") {
      const body = parseBody(event.body)
      const token = getToken(event, body)

      if (!verifyAdminToken(token)) {
        return resp(401, { error: "Admin authentication failed" })
      }

      const id = Number.parseInt(String(body.id || ""), 10)
      const title = String(body.title || "").trim()
      const contentHtml = String(body.contentHtml || "").trim()

      if (!Number.isInteger(id) || id <= 0) {
        return resp(400, { error: "Invalid announcement ID" })
      }

      const validationError = validateAnnouncementInput(title, contentHtml)
      if (validationError) {
        return resp(400, { error: validationError })
      }

      const updated = await sql`
        UPDATE announcements
        SET title = ${title},
            content_html = ${contentHtml},
            author = '\u6267\u624b',
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, title, content_html, author, created_at, updated_at
      `

      if (!updated.length) {
        return resp(404, { error: "Announcement not found" })
      }

      return resp(200, normalizeRow(updated[0]))
    }

    if (event.httpMethod === "DELETE") {
      const body = parseBody(event.body)
      const token = getToken(event, body)

      if (!verifyAdminToken(token)) {
        return resp(401, { error: "Admin authentication failed" })
      }

      const id = Number.parseInt(String(body.id || ""), 10)
      if (!Number.isInteger(id) || id <= 0) {
        return resp(400, { error: "Invalid announcement ID" })
      }

      const deleted = await sql`
        DELETE FROM announcements
        WHERE id = ${id}
        RETURNING id
      `

      if (!deleted.length) {
        return resp(404, { error: "Announcement not found" })
      }

      return resp(200, { success: true })
    }

    return resp(405, { error: "Method not allowed" })
  } catch (error) {
    console.error("Announcements function error:", error)
    return resp(500, { error: error.message || String(error) })
  }
}
