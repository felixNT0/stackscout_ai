import type { Prisma } from "@/generated/prisma/client";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applicationUpdateSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";

const eventSchema = z.object({
  event_type: z.string().min(1).max(100),
  event_date: z.string(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const input = await parseBody(req, applicationUpdateSchema);

    const updates: Record<string, unknown> = {
      ...input,
      updated_at: new Date(),
    };
    delete updates.id;
    // empty strings → null for optional text fields
    for (const k of [
      "company_contact",
      "recruiter_name",
      "recruiter_email",
      "interview_date",
      "notes",
      "application_url",
      "application_date",
    ]) {
      if (updates[k] === "") updates[k] = null;
    }

    const existing = await prisma.application.findFirst({
      where: { id, user_id: user.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Application not found", 404);

    const data = await prisma.application.update({
      where: { id },
      data: updates as Prisma.ApplicationUncheckedUpdateInput,
    });

    // If status changed, log an event
    if (input.status) {
      await prisma.applicationEvent.create({
        data: {
          application_id: id,
          event_type: "status_change",
          event_date: new Date().toISOString().slice(0, 10),
          notes: `Status updated to "${input.status}"`,
        },
      });
    }
    return jsonOk({ application: data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const { count } = await prisma.application.deleteMany({
      where: { id, user_id: user.id },
    });
    if (count === 0) return jsonError("Application not found", 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Add a manual event (note/interview/etc.) to an application. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const input = await parseBody(req, eventSchema);

    const app = await prisma.application.findFirst({
      where: { id, user_id: user.id },
      select: { id: true },
    });
    if (!app) return jsonError("Application not found", 404);

    const data = await prisma.applicationEvent.create({
      data: {
        application_id: id,
        event_type: input.event_type,
        event_date: input.event_date,
        notes: input.notes ?? null,
      },
    });
    return jsonOk({ event: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
