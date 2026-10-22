/**
 * Reminders are optional.
 *
 * This function is intentionally NOT scheduled by default to avoid:
 * - burning Netlify credits
 * - sending emails/SMS during development
 * - surprising squads with background traffic
 *
 * An external scheduler must POST with the same bearer token required by
 * /api/cron/send-reminders. A schedule declaration is not caller authentication.
 */

const { timingSafeEqual } = require("node:crypto");

exports.handler = async (event = {}) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method not allowed" };
  }

  const siteUrl = process.env.SITE_URL || process.env.URL;
  const cronSecret = process.env.NOTIFICATION_CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Missing SITE_URL/URL or NOTIFICATION_CRON_SECRET environment variables.",
      }),
    };
  }

  const authorizationHeaders = Object.entries(event.headers || {}).filter(
    ([name]) => name.toLowerCase() === "authorization"
  );
  const authorization = authorizationHeaders.length === 1 ? authorizationHeaders[0][1] : null;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const supplied = typeof authorization === "string" ? Buffer.from(authorization) : Buffer.alloc(0);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Unauthorized" }) };
  }

  const endpoint = `${siteUrl.replace(/\/$/, "")}/api/cron/send-reminders`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const text = await response.text();

  return {
    statusCode: response.status,
    body: text,
  };
};
