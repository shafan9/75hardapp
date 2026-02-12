import "server-only";

import webpush from "web-push";
import { DEFAULT_TASK_KEYS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationChannel } from "@/lib/types";
import { getDailyMotivationalQuote } from "@/lib/utils";

interface ReminderUserContext {
  userId: string;
  name: string;
  email: string | null;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneE164: string | null;
  timezone: string;
  reminderTime: string;
  localDate: string;
  localMinutes: number;
  reminderMinutes: number;
  completedRequiredCount: number;
  remainingRequiredCount: number;
}

interface DispatchCounts {
  in_app: number;
  push: number;
  email: number;
  sms: number;
}

export interface ReminderDispatchSummary {
  processedUsers: number;
  dueUsers: number;
  sent: DispatchCounts;
  failed: DispatchCounts;
  skipped: DispatchCounts;
  errors: string[];
}

function emptyCounts(): DispatchCounts {
  return { in_app: 0, push: 0, email: 0, sms: 0 };
}

function parseTimeToMinutes(timeValue: string | null | undefined): number {
  const value = (timeValue ?? "21:00").trim();
  const [hhRaw, mmRaw] = value.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return 21 * 60;
  }
  return hh * 60 + mm;
}

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getLocalClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = map.year ?? "1970";
  const month = map.month ?? "01";
  const day = map.day ?? "01";
  const hour = Number(map.hour ?? "0");
  const minute = Number(map.minute ?? "0");

  return {
    localDate: `${year}-${month}-${day}`,
    localMinutes: hour * 60 + minute,
  };
}

function isDue(localMinutes: number, reminderMinutes: number): boolean {
  return localMinutes >= reminderMinutes && localMinutes < reminderMinutes + 15;
}

function getReminderMessage(remainingRequiredCount: number) {
  const quote = getDailyMotivationalQuote();
  const taskWord = remainingRequiredCount === 1 ? "task" : "tasks";
  const body = `You still have ${remainingRequiredCount} ${taskWord} left today. ${quote.text}`;
  return {
    title: "75 Squad Reminder",
    body,
  };
}

function getTestMessage(channel: NotificationChannel) {
  return {
    title: `75 Squad ${channel.toUpperCase()} Test`,
    body: `This is a live test for ${channel} notifications.`,
  };
}

function getPushVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:notifications@75squad.local";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

let webPushInitialized = false;

function ensureWebPushConfigured() {
  if (webPushInitialized) return true;
  const config = getPushVapidConfig();
  if (!config) return false;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  webPushInitialized = true;
  return true;
}

async function reserveDelivery(
  userId: string,
  channel: NotificationChannel,
  reminderDate: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_deliveries")
    .insert({
      user_id: userId,
      channel,
      reminder_date: reminderDate,
      status: "skipped",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data.id as string;
}

async function finalizeDelivery(
  id: string,
  status: "sent" | "failed" | "skipped",
  fields?: { providerMessageId?: string | null; errorMessage?: string | null }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notification_deliveries")
    .update({
      status,
      provider_message_id: fields?.providerMessageId ?? null,
      error_message: fields?.errorMessage ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update notification_deliveries row:", error.message);
  }
}

async function sendInApp(userId: string, title: string, body: string, metadata: Record<string, unknown>) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("in_app_notifications").insert({
    user_id: userId,
    type: "reminder",
    title,
    body,
    metadata,
  });
  if (error) throw error;
  return null;
}

async function sendPush(userId: string, title: string, body: string) {
  if (!ensureWebPushConfigured()) {
    throw new Error("Push is not configured. Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY.");
  }

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) {
    throw new Error("No push subscriptions found for this user.");
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icons/icon-192.png",
    url: "/dashboard/notifications",
  });

  let delivered = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint as string,
          keys: {
            p256dh: subscription.p256dh as string,
            auth: subscription.auth as string,
          },
        },
        payload
      );
      delivered += 1;
    } catch (pushError: unknown) {
      const statusCode = Number((pushError as { statusCode?: unknown })?.statusCode ?? 0);
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id as string);
      }
      console.error("Push send failed for subscription:", subscription.id, pushError);
    }
  }

  if (delivered === 0) {
    throw new Error("All push deliveries failed.");
  }

  return String(delivered);
}

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

function isValidE164(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    throw new Error("SMS is not configured. Missing Twilio credentials.");
  }

  const authHeader = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", from);
  form.set("Body", body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio API failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { sid?: string };
  return payload.sid ?? null;
}

async function getUserContexts(userFilter?: string) {
  const supabase = createAdminClient();
  const now = new Date();

  let progressQuery = supabase
    .from("challenge_progress")
    .select("user_id, current_day")
    .eq("is_active", true)
    .lt("current_day", 75);

  if (userFilter) {
    progressQuery = progressQuery.eq("user_id", userFilter);
  }

  const { data: progressRows, error: progressError } = await progressQuery;
  if (progressError) throw progressError;

  const userIds = [...new Set((progressRows ?? []).map((row) => row.user_id as string))];
  if (userIds.length === 0) return [];

  const [{ data: settingsRows, error: settingsError }, { data: profileRows, error: profileError }] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select(
          "user_id, in_app_enabled, push_enabled, email_enabled, sms_enabled, phone_e164, timezone, reminder_time"
        )
        .in("user_id", userIds),
      supabase.from("profiles").select("id, display_name").in("id", userIds),
    ]);

  if (settingsError) throw settingsError;
  if (profileError) throw profileError;

  const timeByUser = new Map<string, { localDate: string; localMinutes: number; reminderMinutes: number; timezone: string }>();
  const settingsByUser = new Map<string, Record<string, unknown>>();

  for (const userId of userIds) {
    const row = (settingsRows ?? []).find((item) => item.user_id === userId);
    const rawTimezone = (row?.timezone as string | undefined) ?? "UTC";
    const timezone = isValidTimezone(rawTimezone) ? rawTimezone : "UTC";
    const reminderTime = (row?.reminder_time as string | undefined) ?? "21:00";
    const reminderMinutes = parseTimeToMinutes(reminderTime);
    const { localDate, localMinutes } = getLocalClock(now, timezone);
    timeByUser.set(userId, { localDate, localMinutes, reminderMinutes, timezone });
    settingsByUser.set(userId, row ?? {});
  }

  const uniqueDates = [...new Set(Array.from(timeByUser.values()).map((v) => v.localDate))];

  const { data: completionRows, error: completionError } = await supabase
    .from("task_completions")
    .select("user_id, task_key, date")
    .in("user_id", userIds)
    .in("task_key", [...DEFAULT_TASK_KEYS] as string[])
    .in("date", uniqueDates);

  if (completionError) throw completionError;

  const completionMap = new Map<string, Set<string>>();
  for (const row of completionRows ?? []) {
    const userId = row.user_id as string;
    const time = timeByUser.get(userId);
    if (!time || (row.date as string) !== time.localDate) continue;
    if (!completionMap.has(userId)) completionMap.set(userId, new Set());
    completionMap.get(userId)?.add(row.task_key as string);
  }

  const authUsers: Record<string, string | null> = {};
  const listResponse = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of listResponse.data.users ?? []) {
    if (userIds.includes(user.id)) {
      authUsers[user.id] = user.email ?? null;
    }
  }

  return userIds.map((userId) => {
    const settings = settingsByUser.get(userId) ?? {};
    const clock = timeByUser.get(userId) ?? {
      localDate: new Date().toISOString().slice(0, 10),
      localMinutes: 0,
      reminderMinutes: 21 * 60,
      timezone: "UTC",
    };
    const completed = completionMap.get(userId)?.size ?? 0;
    const remaining = Math.max(DEFAULT_TASK_KEYS.length - completed, 0);
    const profile = (profileRows ?? []).find((p) => p.id === userId);

    return {
      userId,
      name: (profile?.display_name as string | null) ?? "Squad Member",
      email: authUsers[userId] ?? null,
      inAppEnabled: Boolean(settings.in_app_enabled ?? true),
      pushEnabled: Boolean(settings.push_enabled ?? false),
      emailEnabled: Boolean(settings.email_enabled ?? true),
      smsEnabled: Boolean(settings.sms_enabled ?? false),
      phoneE164: (settings.phone_e164 as string | null) ?? null,
      timezone: clock.timezone,
      reminderTime: String(settings.reminder_time ?? "21:00"),
      localDate: clock.localDate,
      localMinutes: clock.localMinutes,
      reminderMinutes: clock.reminderMinutes,
      completedRequiredCount: completed,
      remainingRequiredCount: remaining,
    } satisfies ReminderUserContext;
  });
}

async function sendChannelReminder(
  user: ReminderUserContext,
  channel: NotificationChannel,
  title: string,
  body: string,
  metadata: Record<string, unknown>,
  isTest: boolean
) {
  const reminderDate = user.localDate;
  const deliveryId = isTest ? null : await reserveDelivery(user.userId, channel, reminderDate);
  if (!isTest && !deliveryId) {
    return { status: "skipped" as const };
  }

  try {
    let providerMessageId: string | null = null;

    if (channel === "in_app") {
      await sendInApp(user.userId, title, body, metadata);
    } else if (channel === "push") {
      providerMessageId = await sendPush(user.userId, title, body);
    } else if (channel === "email") {
      if (!user.email) throw new Error("No email address found for user.");
      providerMessageId = await sendEmail(user.email, title, body);
    } else if (channel === "sms") {
      if (!isValidE164(user.phoneE164)) {
        throw new Error("User phone number missing or invalid E.164 format.");
      }
      providerMessageId = await sendSms(user.phoneE164, body);
    }

    if (deliveryId) {
      await finalizeDelivery(deliveryId, "sent", { providerMessageId });
    }

    return { status: "sent" as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (deliveryId) {
      await finalizeDelivery(deliveryId, "failed", { errorMessage: message });
    }
    return { status: "failed" as const, error: message };
  }
}

export async function dispatchScheduledReminders(): Promise<ReminderDispatchSummary> {
  const summary: ReminderDispatchSummary = {
    processedUsers: 0,
    dueUsers: 0,
    sent: emptyCounts(),
    failed: emptyCounts(),
    skipped: emptyCounts(),
    errors: [],
  };

  const users = await getUserContexts();
  summary.processedUsers = users.length;

  for (const user of users) {
    const dueNow = isDue(user.localMinutes, user.reminderMinutes);
    const hasPendingRequiredTasks = user.remainingRequiredCount > 0;
    if (!dueNow || !hasPendingRequiredTasks) continue;

    summary.dueUsers += 1;
    const { title, body } = getReminderMessage(user.remainingRequiredCount);
    const metadata = {
      kind: "daily_reminder",
      remainingRequiredCount: user.remainingRequiredCount,
      timezone: user.timezone,
      reminderTime: user.reminderTime,
    };

    const channelStates: Array<[NotificationChannel, boolean]> = [
      ["in_app", user.inAppEnabled],
      ["push", user.pushEnabled],
      ["email", user.emailEnabled],
      ["sms", user.smsEnabled],
    ];

    for (const [channel, enabled] of channelStates) {
      if (!enabled) {
        summary.skipped[channel] += 1;
        continue;
      }

      const result = await sendChannelReminder(user, channel, title, body, metadata, false);
      if (result.status === "sent") {
        summary.sent[channel] += 1;
      } else if (result.status === "skipped") {
        summary.skipped[channel] += 1;
      } else {
        summary.failed[channel] += 1;
        summary.errors.push(`user=${user.userId} channel=${channel} error=${result.error}`);
      }
    }
  }

  return summary;
}

export async function dispatchTestNotification(userId: string, channel: NotificationChannel) {
  const users = await getUserContexts(userId);
  if (users.length === 0) {
    throw new Error("No active challenge progress found for this user. Join a squad first.");
  }

  const user = users[0];
  const { title, body } = getTestMessage(channel);
  const metadata = { kind: "test", channel };

  const result = await sendChannelReminder(user, channel, title, body, metadata, true);
  if (result.status === "failed") {
    throw new Error(result.error ?? "Failed to send test notification.");
  }

  return { ok: true };
}
