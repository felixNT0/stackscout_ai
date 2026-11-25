import { handleApiError, jsonError, jsonOk, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  access_token: z.string().min(1, "Access token is required"),
});

/**
 * Import LinkedIn profile data after OAuth.
 * Fetches profile info and updates user profile.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`linkedin-import:${user.id}`, 5, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { access_token } = await parseBody(req, importSchema);

    // Fetch LinkedIn profile
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!profileResponse.ok) {
      return jsonError("Failed to fetch LinkedIn profile", 400);
    }

    const profileData = await profileResponse.json();

    // Fetch email if not in profile
    let email = profileData.emailAddress;
    if (!email) {
      const emailResponse = await fetch(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        },
      );
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        email = emailData.elements?.[0]?.["handle~"]?.emailAddress;
      }
    }

    // Update user profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: profileData.localizedFirstName
          ? `${profileData.localizedFirstName} ${profileData.localizedLastName}`
          : profileData.name,
        email: email ?? user.email,
        image: profileData.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier,
      },
    });

    // Create or update profile with LinkedIn data
    const existingProfile = await prisma.profile.findUnique({
      where: { user_id: user.id },
    });

    const profileUpdate = {
      linkedin_url: `https://www.linkedin.com/in/${profileData.id ?? ""}`,
      professional_headline: profileData.headline ?? null,
      location: profileData.location?.name ?? null,
      summary: profileData.summary ?? null,
    };

    if (existingProfile) {
      await prisma.profile.update({
        where: { user_id: user.id },
        data: profileUpdate,
      });
    } else {
      await prisma.profile.create({
        data: {
          user_id: user.id,
          ...profileUpdate,
        },
      });
    }

    return jsonOk({
      message: "LinkedIn profile imported successfully",
      profile: {
        name: profileData.localizedFirstName
          ? `${profileData.localizedFirstName} ${profileData.localizedLastName}`
          : profileData.name,
        headline: profileData.headline,
        location: profileData.location?.name,
        linkedin_url: `https://www.linkedin.com/in/${profileData.id ?? ""}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function parseBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}
