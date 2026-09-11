import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyToken } from "./auth";
import prisma from "./prisma";

let io: Server | null = null;

const roomFor = (userId: string) => `user:${userId}`;

export function initializeMessagingSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:8080",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) return next(new Error("Unauthorized"));
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.user.userId as string;
    const role = socket.data.user.role as string;
    const room = roomFor(userId);
    socket.join(room);
    socket.join(`role:${role}`);

    try {
      const pending = await prisma.message.findMany({
        where: { receiverId: userId, deliveredAt: null },
        select: { id: true, senderId: true },
      });
      if (pending.length > 0) {
        const deliveredAt = new Date();
        await prisma.message.updateMany({
          where: { id: { in: pending.map((message) => message.id) } },
          data: { deliveredAt },
        });
        for (const senderId of new Set(pending.map((message) => message.senderId))) {
          io?.to(roomFor(senderId)).emit("messages:delivered", {
            messageIds: pending.filter((message) => message.senderId === senderId).map((message) => message.id),
            deliveredAt: deliveredAt.toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Failed to update delivered messages", error);
    }

    io?.emit("presence:changed", { userId, online: true });

    socket.on("typing", (payload: { receiverId?: string; isTyping?: boolean }) => {
      if (!payload?.receiverId) return;
      io?.to(roomFor(payload.receiverId)).emit("typing", {
        userId,
        isTyping: Boolean(payload.isTyping),
      });
    });

    socket.on("presence:check", (targetUserId: string, reply: (online: boolean) => void) => {
      reply(Boolean(io?.sockets.adapter.rooms.get(roomFor(targetUserId))?.size));
    });

    socket.on("disconnect", () => {
      setTimeout(() => {
        if (!io?.sockets.adapter.rooms.get(room)?.size) {
          io?.emit("presence:changed", { userId, online: false });
        }
      }, 250);
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(roomFor(userId)).emit(event, payload);
}

export function emitToRole(role: string, event: string, payload: unknown) {
  io?.to(`role:${role}`).emit(event, payload);
}

export function isUserOnline(userId: string) {
  return Boolean(io?.sockets.adapter.rooms.get(roomFor(userId))?.size);
}
