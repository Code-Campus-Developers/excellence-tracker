const LAGOS_TIME_ZONE = "Africa/Lagos";

export function formatNotificationDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(value));
}

function lagosDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(value));
}

function lagosTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(value));
}

export function formatChatTimestamp(value: string | Date) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const time = lagosTime(date);

  if (lagosDateKey(date) === lagosDateKey(now)) return `Today, ${time}`;
  if (lagosDateKey(date) === lagosDateKey(yesterday)) return `Yesterday, ${time}`;

  const day = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: LAGOS_TIME_ZONE,
  }).format(date);
  return `${day}, ${time}`;
}

export function formatLastSeen(value: string | null) {
  if (!value) return "offline";
  const timestamp = formatChatTimestamp(value);
  return `Last seen ${timestamp.charAt(0).toLowerCase()}${timestamp.slice(1)}`;
}
