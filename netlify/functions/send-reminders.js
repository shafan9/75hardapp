/**
 * Reminders are optional.
 *
 * This function is intentionally NOT scheduled by default to avoid:
 * - burning Netlify credits
 * - sending emails/SMS during development
 * - surprising squads with background traffic
 *
 * If you want scheduled reminders, re-add:
 *
 * exports.config = { schedule: "* /15 * * * *" };
 */

exports.handler = async () => {
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
