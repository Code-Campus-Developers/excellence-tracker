const LAGOS_TIME_ZONE = "Africa/Lagos";

export function formatNotificationDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(value));
}
