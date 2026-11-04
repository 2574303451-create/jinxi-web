// netlify/functions/auth-login.js
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

function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false

  // 当前系统采用 pbkdf2_sha256$iterations$salt$hash
  if (passwordHash.startsWith("pbkdf2_sha256$")) {
    const parts = passwordHash.split("$")
    if (parts.length !== 4) return false

    const iterations = Number(parts[1])
    const salt = parts[2]
    const expectedHash = parts[3]
    if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHash) {
      return false
    }
    if (expectedHash.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(expectedHash)) {
      return false
    }

    const actualHash = crypto
      .pbkdf2Sync(plainPassword, salt, iterations, expectedHash.length / 2, "sha256")
      .toString("hex")

    return safeCompareHex(actualHash, expectedHash)
  }

  return false
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
  const password = String(payload.password || "")

  if (!account || !password) {
    return resp(400, { error: "account and password are required" }, headers)
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const rows = await sql`
      SELECT
        a.login_account,
        a.password_hash,
        a.force_reset_password,
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
      return resp(401, { error: "账号或密码错误" }, headers)
    }

    const user = rows[0]
    if (user.is_locked) {
      return resp(423, { error: "账号已锁定，请联系管理员" }, headers)
    }

    const ok = verifyPassword(password, user.password_hash)
    if (!ok) {
      return resp(401, { error: "账号或密码错误" }, headers)
    }

    await sql`
      UPDATE guild_member_accounts
      SET last_login_at = NOW(),
          updated_at = NOW()
      WHERE login_account = ${account}
    `

    return resp(
      200,
      {
        success: true,
        account: user.login_account,
        employeeNo: user.employee_no,
        nickname: user.nickname || user.display_name || user.login_account,
        forceResetPassword: !!user.force_reset_password,
      },
      headers
    )
  } catch (error) {
    console.error("auth-login error:", error)
    return resp(500, { error: error.message || "登录失败，请稍后重试" }, headers)
  }
}
