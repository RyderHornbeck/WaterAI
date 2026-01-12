import useUserSettingsStore from "@/stores/useUserSettingsStore";

// Get REAL local date string in YYYY-MM-DD format (ignores time travel for saving data)
export function getLocalDate() {
  // Use real current date, not time-travel date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get time-travel adjusted date for DISPLAY purposes
export function getDisplayDate() {
  const { getCurrentDate } = useUserSettingsStore.getState();
  const date = getCurrentDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get time-travel adjusted Date object
export function getCurrentDateObject() {
  const { getCurrentDate } = useUserSettingsStore.getState();
  return getCurrentDate();
}

export function getWeekStart(date) {
  const d = new Date(date);
  // Set to midnight local time to avoid timezone issues
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0); // Ensure midnight local time
    dates.push(date);
  }
  return dates;
}

export function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startMonth = weekStart.toLocaleString("en-US", { month: "short" });
  const endMonth = weekEnd.toLocaleString("en-US", { month: "short" });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}`;
  } else {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  }
}

export function formatDayLabel(date, index) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels[index];
}

export function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(0, 0, 0, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday = 0

  const days = [];
  for (let i = 0; i < offset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    day.setHours(0, 0, 0, 0);
    days.push(day);
  }
  return days;
}

export function getDateString(date) {
  // Always use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
