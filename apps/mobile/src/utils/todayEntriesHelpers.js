export function getHeaderTitle(date) {
  if (!date) {
    return "Today's Water";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function calculateDateString(date) {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateTotalOz(entries) {
  return entries.reduce((sum, entry) => sum + parseFloat(entry.ounces || 0), 0);
}

export function calculatePercentComplete(totalOz, dailyGoal) {
  return Math.min(Math.round((totalOz / dailyGoal) * 100), 100);
}
