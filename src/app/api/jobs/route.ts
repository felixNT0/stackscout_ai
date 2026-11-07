import type { Prisma } from "@/generated/prisma/client";
import {handleApiError, jsonOk, jsonError} from "@/lib/api";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

/** List jobs visible to the user: all active jobs, newest first, paginated. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10)),
    );
    const q = searchParams.get("q") ?? "";
    const source = searchParams.get("source") ?? "";
    const remote = searchParams.get("remote") ?? "";

    const where: Prisma.JobWhereInput = {
      status: "active",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { company: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(source ? { source_name: source } : {}),
      ...(remote ? { remote_status: remote } : {}),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { discovered_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    return jsonOk({ jobs, total, page, page_size: pageSize });
  } catch (err) {
    return handleApiError(err);
  }
}
