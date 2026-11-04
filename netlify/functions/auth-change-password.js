// netlify/functions/auth-change-password.js
const crypto = require("crypto")
const { neon } = require("@neondatabase/serverless")

function resp(statusCode, body, headers) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  }
}

function safeCompareHex(leftHex, rightHex) {
  try {
    const left = Buffer.from(leftHex, "hex")
    const right = Buffer.from(rightHex, "hex")
    if (left.length !== right.length) return false
    return crypto.timingSafeEqual(left, right)
  } catch {
    return false
  }
}

function parsePbkdf2Hash(passwordHash) {
  if (typeof passwordHash !== "string" || !passwordHash.startsWith("pbkdf2_sha256$")) {
    return null
  }

  const parts = passwordHash.split("$")
  if (parts.length !== 4) return null

  const iterations = Number(parts[1])
  const salt = parts[2]
  const expectedHash = parts[3]
  if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHash) {
    return null
  }
  if (expectedHash.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(expectedHash)) {
    return null
  }

  return {
    iterations,
    salt,
    expectedHash,
    dkLen: expectedHash.length / 2,
  }
}

function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false
  const parsed = parsePbkdf2Hash(passwordHash)
  if (!parsed) return false

  const actualHash = crypto
    .pbkdf2Sync(plainPassword, parsed.salt, parsed.iterations, parsed.dkLen, "sha256")
    .toString("hex")

  return safeCompareHex(actualHash, parsed.expectedHash)
}

function buildPasswordHash(plainPassword) {
  const iterations = 200000
  const salt = crypto.randomBytes(16).toString("hex")
  const digest = crypto.pbkdf2Sync(plainPassword, salt, iterations, 32, "sha256").toString("hex")
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    }
  }

  if (event.httpMethod !== "POST") {
    return resp(405, { error: "Method not allowed" }, headers)
  }

  if (!process.env.DATABASE_URL) {
    return resp(500, { error: "DATABASE_URL not configured" }, headers)
  }

  let payload
  try {
    payload = JSON.parse(event.body || "{}")
  } catch {
    return resp(400, { error: "Invalid JSON body" }, headers)
  }

  const account = String(payload.account || "").trim()
  const currentPassword = String(payload.currentPassword || "")
  const newPassword = String(payload.newPassword || "")

  if (!account || !currentPassword || !newPassword) {
    return resp(400, { error: "account, currentPassword and newPassword are required" }, headers)
  }
  if (newPassword.length < 8) {
    return resp(400, { error: "新密码至少需要 8 位" }, headers)
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return resp(400, { error: "新密码需包含字母和数字" }, headers)
  }
  if (newPassword === currentPassword) {
    return resp(400, { error: "新密码不能与当前密码相同" }, headers)
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const rows = await sql`
      SELECT
        a.login_account,
        a.password_hash,
        a.is_locked,
        p.employee_no,
        p.display_name,
        p.nickname
      FROM guild_member_accounts a
      JOIN guild_member_profiles p
        ON p.employee_no = a.employee_no
      WHERE a.login_account = ${account}
        AND p.is_active = TRUE
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return resp(404, { error: "账号不存在或已停用" }, headers)
    }

    const user = rows[0]
    if (user.is_locked) {
      return resp(423, { error: "账号已锁定，请联系管理员" }, headers)
    }

    const verifyOk = verifyPassword(currentPassword, user.password_hash)
    if (!verifyOk) {
      return resp(401, { error: "当前密码错误" }, headers)
    }

    const nextHash = buildPasswordHash(newPassword)
    const updatedRows = await sql`
      UPDATE guild_member_accounts
      SET
        password_hash = ${nextHash},
        hash_algorithm = 'pbkdf2_sha256',
        force_reset_password = FALSE,
        password_updated_at = NOW(),
        updated_at = NOW()
      WHERE login_account = ${account}
      RETURNING login_account, employee_no
    `

    if (!updatedRows || updatedRows.length === 0) {
      return resp(500, { error: "修改密码失败，请稍后重试" }, headers)
    }

    return resp(
      200,
      {
        success: true,
        account: updatedRows[0].login_account,
        employeeNo: updatedRows[0].employee_no || user.employee_no,
        nickname: user.nickname || user.display_name || updatedRows[0].login_account,
      },
      headers
    )
  } catch (error) {
    console.error("auth-change-password error:", error)
    return resp(500, { error: error.message || "修改密码失败，请稍后重试" }, headers)
  }
}
