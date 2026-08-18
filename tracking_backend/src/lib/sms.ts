import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.TERMII_API_KEY;
const SENDER_ID = process.env.TERMII_SENDER_ID ?? "N-Alert";
const TERMII_URL = "https://v4.api.termii.com/api/sms/send";

/** Normalize a Nigerian phone number to international format (2348XXXXXXXXX) */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

/** Send a single SMS via Termii. Silent on failure. */
export async function sendSMS(to: string, message: string): Promise<void> {
  if (!API_KEY) return; // SMS not configured — skip silently
  const normalized = normalizePhone(to);
  if (!normalized) return; // Invalid number — skip silently
  try {
    await fetch(TERMII_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEY,
        to: normalized,
        from: SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
  } catch { /* silent — SMS is best-effort */ }
}

/** Send SMS to multiple recipients. All silent on failure. */
export async function sendSMSToMany(numbers: (string | null | undefined)[], message: string): Promise<void> {
  const valid = numbers.filter(Boolean) as string[];
  await Promise.allSettled(valid.map((n) => sendSMS(n, message)));
}
