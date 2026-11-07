import { fetchText, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

export class WeWorkRemotelyProvider implements JobProvider {
  readonly name = "weworkremotely";

  isConfigured() {
    return true; // No API key needed — public RSS feed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    try {
      // Large RSS feed (~2.3MB) needs longer timeout
      const xml = await fetchText(
        "https://weworkremotely.com/remote-jobs.rss",
        undefined,
        { timeoutMs: 30000 },
      );
      const jobs = this.parseRss(xml, params);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (error) {
      return {
        provider: this.name,
        jobs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private parseRss(xml: string, params: ProviderSearchParams): ProviderJob[] {
    const jobs: ProviderJob[] = [];
    // Split by <item> tags for better performance on large XML
    const items = xml.split(/<item>/).slice(1);

    for (const item of items) {
      const endIdx = item.indexOf("</item>");
      if (endIdx === -1) continue;
      const content = item.slice(0, endIdx);

      const title = this.extractTag(content, "title");
      const link = this.extractTag(content, "link");
      const pubDate = this.extractTag(content, "pubDate");
      const description = this.extractTag(content, "description");
      const type = this.extractTag(content, "type");
      const region = this.extractTag(content, "region");
      const skills = this.extractTag(content, "skills");

      if (!title || !link) continue;

      // Title format: "Company: Job Title" or just "Job Title"
      const titleParts = title.split(":");
      const company = titleParts.length > 1 ? titleParts[0].trim() : "Unknown";
      const jobTitle =
        titleParts.length > 1 ? titleParts.slice(1).join(":").trim() : title;

      // Filter by query keywords if provided
      if (params.query) {
        const keywords = params.query
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const text = `${jobTitle} ${company} ${description}`.toLowerCase();
        // Match if ANY keyword appears
        if (!keywords.some((k) => text.includes(k))) {
          continue;
        }
      }

      jobs.push({
        external_id: link,
        title: jobTitle,
        company,
        description: stripHtml(description).slice(0, 5000),
        location: region || "Remote",
        remote_status: "remote",
        employment_type: type?.toLowerCase() ?? null,
        application_url: link,
        source_name: "weworkremotely",
        source_url: link,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        required_skills: skills ? skills.split(",").map((s) => s.trim()) : [],
        preferred_skills: [],
      });
    }

    return jobs.slice(0, 50);
  }

  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = regex.exec(xml);
    return match ? match[1].trim() : "";
  }
}
