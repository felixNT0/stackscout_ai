import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getJobById } from "@/lib/jobs/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) return jsonError("Job not found", 404);
    return jsonOk({ job });
  } catch (err) {
    return handleApiError(err);
  }
}
