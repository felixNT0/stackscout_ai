/**
 * Detect the submission channel for a job application URL.
 * Returns the channel type and parsed identifiers needed for submission.
 */

export type ApplyChannel =
  | { type: "greenhouse"; board: string; jobId: string; applyUrl: string }
  | { type: "lever"; company: string; postingId: string; applyUrl: string }
  | { type: "email"; applyUrl: string }
  | { type: "manual"; applyUrl: string };

/**
 * Greenhouse URLs:
 * - https://boards.greenhouse.io/{board}/jobs/{job_id}
 * - https://job-boards.greenhouse.io/{board}/jobs/{job_id}
 * - https://boards.greenhouse.io/embed/job_app?for={board}&token={job_id}
 */
function parseGreenhouse(url: string): ApplyChannel | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
      // Path format: /{board}/jobs/{job_id}
      const match = u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
      if (match) {
        return {
          type: "greenhouse",
          board: match[1],
          jobId: match[2],
          applyUrl: url,
        };
      }
      // Embed format: /embed/job_app?for={board}&token={job_id}
      if (u.pathname === "/embed/job_app") {
        const board = u.searchParams.get("for");
        const token = u.searchParams.get("token");
        if (board && token) {
          return {
            type: "greenhouse",
            board,
            jobId: token,
            applyUrl: url,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lever URLs:
 * - https://jobs.lever.co/{company}/{posting_id}
 * - https://jobs.lever.co/{company}/{posting_id}/apply
 * - https://hire.lever.co/{company}/{posting_id}
 */
function parseLever(url: string): ApplyChannel | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host === "jobs.lever.co" || host === "hire.lever.co") {
      const match = u.pathname.match(/^\/([^/]+)\/([a-f0-9-]+)(?:\/apply)?\/?$/i);
      if (match) {
        return {
          type: "lever",
          company: match[1],
          postingId: match[2],
          applyUrl: url,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Detect the best submission channel for a job.
 * Priority: greenhouse > lever > email > manual
 */
export function detectApplyChannel(
  applicationUrl: string,
  sourceName?: string | null,
): ApplyChannel {
  // Try URL-based detection first
  const gh = parseGreenhouse(applicationUrl);
  if (gh) return gh;

  const lever = parseLever(applicationUrl);
  if (lever) return lever;

  // Fall back to source_name for known ATS providers
  if (sourceName === "greenhouse") {
    // Try to extract board/job from URL even if format is unusual
    const gh2 = parseGreenhouse(applicationUrl);
    if (gh2) return gh2;
  }
  if (sourceName === "lever") {
    const lv = parseLever(applicationUrl);
    if (lv) return lv;
  }

  // Check if it's a mailto: link or has email in the URL
  if (applicationUrl.startsWith("mailto:")) {
    return { type: "email", applyUrl: applicationUrl };
  }

  return { type: "manual", applyUrl: applicationUrl };
}
