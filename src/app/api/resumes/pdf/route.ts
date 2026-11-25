import { getCurrentUser } from "@/lib/auth-helpers";
import { generateResumePdf } from "@/lib/resume/pdf";
import { getTemplate } from "@/lib/resume/templates";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resumeSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
  summary: z.string(),
  sections: z.array(z.object({
    id: z.string(),
    type: z.enum(["experience", "education", "skills", "summary"]),
    title: z.string(),
    content: z.string(),
    items: z.array(z.string()).optional(),
  })),
  template: z.string(),
});

/**
 * Generate resume PDF from builder data.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const resume = resumeSchema.parse(body);
    const template = getTemplate(resume.template);

    // Generate PDF
    const pdfBuffer = await generateResumePdf({
      name: resume.name,
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
      linkedin: resume.linkedin,
      website: resume.website,
      summary: resume.summary,
      sections: resume.sections.map((s) => ({
        ...s,
        items: s.items ?? [],
      })),
      template,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resume.name || "resume"}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Resume PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
