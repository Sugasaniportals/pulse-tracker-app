import { BADGE_THRESHOLDS } from "../theme";

const toDate = (s) => new Date(s + "T00:00:00");
const addDays = (dateStr, n) => {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const startOfWeek = (dateStr) => {
  const d = toDate(dateStr);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

// completionsByDate: { "YYYY-MM-DD": { checkpointId: true/false } }
// checkpointIds: array of checkpoint ids belonging to this activity
// graceUsedByWeek: { "week_start_date": true } — weeks that already spent their grace day
export function calculateStreak({ startDate, checkpointIds, completionsByDate, graceUsedByWeek = {}, today }) {
  const isFullDay = (dateStr) => {
    const rec = completionsByDate[dateStr];
    if (!rec) return false;
    return checkpointIds.length > 0 && checkpointIds.every((id) => rec[id]);
  };

  let streak = 0;
  let cursor = today;
  const usedGraceThisPass = {};

  // today counts if complete; if not, it's simply "not yet" and doesn't break anything
  if (isFullDay(today)) {
    streak++;
    cursor = addDays(today, -1);
  } else {
    cursor = addDays(today, -1);
  }

  while (cursor >= startDate) {
    if (isFullDay(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
      continue;
    }
    // missed day — check if this week's grace day is still available
    const week = startOfWeek(cursor);
    const alreadyUsed = graceUsedByWeek[week] || usedGraceThisPass[week];
    if (!alreadyUsed) {
      usedGraceThisPass[week] = true;
      streak++; // grace covers the miss, streak continues
      cursor = addDays(cursor, -1);
      continue;
    }
    break; // no grace left, streak ends here
  }

  return streak;
}

export function badgesEarned(streak) {
  return BADGE_THRESHOLDS.filter((t) => streak >= t);
}

export function nextBadge(streak) {
  return BADGE_THRESHOLDS.find((t) => t > streak) || null;
}
