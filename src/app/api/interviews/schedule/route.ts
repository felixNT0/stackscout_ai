import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const scheduleSchema = z.object({
  application_id: z.string().uuid(),
  interview_date: z.string().datetime(),
  interview_type: z.enum(["phone", "video", "onsite", "technical", "final"]).default("video"),
  interviewer_name: z.string().optional(),
  interviewer_email: z.string().email().optional(),
  location: z.string().optional(),
  meeting_link: z.string().url().optional(),
  notes: z.string().optional(),
});

/**
 * Schedule an interview for an application.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = scheduleSchema.parse(body);

    // Verify application belongs to user
    const application = await prisma.application.findFirst({
      where: {
        id: input.application_id,
        user_id: user.id,
      },
      include: {
        job: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update application with interview details
    const updated = await prisma.application.update({
      where: { id: input.application_id },
      data: {
        status: "interview",
        interview_date: new Date(input.interview_date),
        notes: input.notes
          ? `${application.notes ?? ""}\n\nInterview: ${input.interview_type}${input.interviewer_name ? ` with ${input.interviewer_name}` : ""}${input.location ? ` at ${input.location}` : ""}${input.meeting_link ? `\nMeeting: ${input.meeting_link}` : ""}`
          : application.notes,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        user_id: user.id,
        type: "interview_scheduled",
        title: `Interview scheduled: ${application.job?.title ?? "Job"}`,
        message: `Interview on ${new Date(input.interview_date).toLocaleDateString()} at ${new Date(input.interview_date).toLocaleTimeString()}`,
        data: {
          application_id: input.application_id,
          job_id: application.job_id,
          interview_type: input.interview_type,
          interview_date: input.interview_date,
        },
      },
    });

    // Generate calendar invite link (Google Calendar)
    const jobTitle = application.job?.title ?? "Interview";
    const company = application.job?.company ?? "";
    const startDate = new Date(input.interview_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${jobTitle} Interview at ${company}`)}&dates=${startDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${endDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z&details=${encodeURIComponent(`Interview for ${jobTitle} at ${company}${input.meeting_link ? `\n\nMeeting link: ${input.meeting_link}` : ""}`)}&location=${encodeURIComponent(input.location ?? input.meeting_link ?? "")}`;

    return NextResponse.json({
      success: true,
      application: updated,
      calendar_url: calendarUrl,
    });
  } catch (err) {
    console.error("Schedule interview error:", err);
    return NextResponse.json(
      { error: "Failed to schedule interview" },
      { status: 500 },
    );
  }
}
