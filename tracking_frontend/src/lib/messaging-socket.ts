import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketToken: string | null = null;

function getToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("excellence_auth");
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
  } catch {
    return null;
  }
}

export function getMessagingSocket() {
  const token = getToken();
  if (!token || typeof window === "undefined") return null;
  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket?.disconnect();
  socketToken = token;
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
  socket = io(base, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}
