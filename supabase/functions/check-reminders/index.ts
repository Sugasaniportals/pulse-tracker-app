// Supabase Edge Function: check-reminders
//
// Runs on a schedule (see the pg_cron snippet at the bottom of schema.sql).
// For each activity's checkpoints due today, if the current time is past
// the checkpoint's time and it hasn't been marked done, and the last
// reminder for it was sent more than `reminder_every_min` minutes ago,
// send an Expo push notification to every registered device.
//
// Deploy with: supabase functions deploy check-reminders

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date().toISOString().slice(0, 10);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const { data: activities } = await supabase
    .from("activities")
    .select("*, checkpoints(*)")
    .lte("start_date", today);

  const { data: tokens } = await supabase.from("push_tokens").select("token");
  const pushTokens = (tokens || []).map((t) => t.token);

  if (!activities || pushTokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const messages: any[] = [];

  for (const act of activities) {
    for (const cp of act.checkpoints || []) {
      const [h, m] = cp.time_of_day.split(":").map(Number);
      const dueMinutes = h * 60 + m;
      if (nowMinutes < dueMinutes) continue;

      const { data: completion } = await supabase
        .from("completions")
        .select("*")
        .eq("checkpoint_id", cp.id)
        .eq("date", today)
        .maybeSingle();

      if (completion?.done) continue;

      // throttle: only resend if enough minutes have passed since the last one.
      // last_notified_at is tracked via a lightweight upsert on this same row.
      const lastSent = completion?.last_notified_at ? new Date(completion.last_notified_at).getTime() : 0;
      const everyMs = (act.reminder_every_min || 30) * 60000;
      if (Date.now() - lastSent < everyMs) continue;

      for (const token of pushTokens) {
        messages.push({
          to: token,
          sound: "default",
          title: `${act.name}: ${cp.label} is overdue`,
          body: act.require_photo ? "Capture a photo to mark it done." : "Tap to mark it done.",
        });
      }

      await supabase.from("completions").upsert(
        {
          checkpoint_id: cp.id,
          activity_id: act.id,
          date: today,
          done: false,
          last_notified_at: new Date().toISOString(),
        },
        { onConflict: "checkpoint_id,date" }
      );
    }
  }

  if (messages.length > 0) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
