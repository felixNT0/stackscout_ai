import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Server-Sent Events endpoint for real-time notifications.
 * Streams new notifications to the client as they arrive.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`),
      );

      // Poll for new notifications every 30 seconds
      const interval = setInterval(async () => {
        try {
          const notifications = await prisma.notification.findMany({
            where: {
              user_id: user.id,
              created_at: {
                gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
              },
            },
            orderBy: { created_at: "desc" },
            take: 10,
          });

          if (notifications.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "notifications",
                  notifications: notifications.map((n) => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    data: n.data,
                    created_at: n.created_at,
                    read: n.read,
                  })),
                })}\n\n`,
              ),
            );
          }
        } catch (err) {
          console.error("SSE notification error:", err);
        }
      }, 30000); // 30 seconds

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering for nginx
    },
  });
}
