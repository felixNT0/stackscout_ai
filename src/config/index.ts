export const config = {
  app: {
    name: "StackScout AI",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "",
    // Optional OpenAI-compatible base URL (e.g. Gemini:
    // https://generativelanguage.googleapis.com/v1beta/openai/)
    baseUrl: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "",
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL ||
      process.env.AI_EMBEDDING_MODEL ||
      "text-embedding-3-small",
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || "",
  },
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || "",
    apiKey: process.env.ADZUNA_API_KEY || "",
  },
  jooble: {
    apiKey: process.env.JOOBLE_API_KEY || "",
  },
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY || "",
    signingKey: process.env.INNGEST_SIGNING_KEY || "",
    apiUrl: process.env.INNGEST_EVENT_API_URL || "https://api.inngest.com",
  },
  email: {
    from: process.env.EMAIL_FROM || "noreply@stackscout.ai",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587"),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
};
