import prisma from "./prisma";
import { Request } from "express";
import { AuthRequest } from "../middleware/authenticate";

export async function audit(
  req: Request | AuthRequest,
  action: string,
  details: Record<string, unknown> = {}
) {
  try {
    const authReq = req as AuthRequest;
    let userId: string | null = null;
    let userName = "System";
    let userRole = "";

    if (authReq.user?.userId) {
      userId = authReq.user.userId;
      userRole = authReq.user.role;
      // Look up name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      userName = user?.name ?? "Unknown";
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";

    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userRole,
        action,
        details: details as object,
        ipAddress: ip,
      },
    });
  } catch (err) {
    // Never break the main request flow
    console.error("Audit log failed:", err);
  }
}
