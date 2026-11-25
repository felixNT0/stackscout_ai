import { detectApplyChannel, type ApplyChannel } from "./channels";
import { submitGreenhouse } from "./greenhouse";
import { submitLever } from "./lever";
import { submitEmail } from "./email";
import type { ApplicationPackage, SubmissionResult } from "./greenhouse";

export type { ApplyChannel, ApplicationPackage, SubmissionResult };
export { detectApplyChannel };

/**
 * Submit an application through the detected channel.
 */
export async function submitApplication(
  channel: ApplyChannel,
  pkg: ApplicationPackage,
  opts?: {
    jobTitle?: string;
    company?: string;
    recruiterEmail?: string;
  },
): Promise<SubmissionResult> {
  switch (channel.type) {
    case "greenhouse":
      return submitGreenhouse(channel, pkg);
    case "lever":
      return submitLever(channel, pkg);
    case "email": {
      // Extract email from mailto: URL or use recruiter email
      let to = opts?.recruiterEmail;
      if (!to && channel.applyUrl.startsWith("mailto:")) {
        to = channel.applyUrl.replace("mailto:", "").split("?")[0];
      }
      if (!to) {
        return {
          ok: false,
          status: 400,
          message: "No recipient email found for this application",
        };
      }
      return submitEmail(
        to,
        `Application: ${opts?.jobTitle ?? "Position"} at ${opts?.company ?? "Company"}`,
        pkg,
        opts?.jobTitle ?? "Position",
        opts?.company ?? "Company",
      );
    }
    case "manual":
      return {
        ok: false,
        status: 0,
        message: `Manual application required. Visit: ${channel.applyUrl}`,
      };
  }
}
