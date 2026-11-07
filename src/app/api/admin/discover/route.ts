import { requireAdmin } from "@/app/api/dashboard/stats/route";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";

/** Admin: trigger a job discovery run across providers. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!(await requireAdmin(user.id))) return jsonError("Forbidden", 403);

    const { inngest } = await import("@/inngest/client");
    await inngest.send({
      name: "jobs/discovery.requested",
      data: { triggered_by: user.id },
    });
    return jsonOk({ queued: true });
  } catch (err) {
    return handleApiError(err);
  }
}
