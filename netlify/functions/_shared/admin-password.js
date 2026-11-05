const crypto = require("crypto");

// No fallback secret. Resolve configuration for each invocation and fail closed.
function verifyAdminPassword(input) {
  const configured = process.env.ADMIN_PASSWORD;
  if (
    typeof configured !== "string" ||
    !configured.trim() ||
    typeof input !== "string" ||
    !input ||
    input.length > 1024
  )
    return false;
  const digest = (value) => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(input), digest(configured));
}

module.exports = { verifyAdminPassword };
