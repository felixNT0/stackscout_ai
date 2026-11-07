import { z } from "zod";

export const jobSearchFiltersSchema = z.object({
  job_title: z.string().max(200).optional(),
  keywords: z.string().max(500).optional(),
  technology: z.string().max(200).optional(),
  skill: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  employment_type: z.array(z.string()).optional(),
  remote_status: z.array(z.string()).optional(),
  experience_level: z.array(z.string()).optional(),
  salary_min: z.number().nonnegative().optional(),
  salary_max: z.number().nonnegative().optional(),
  salary_currency: z.string().max(10).optional(),
  date_posted: z.string().optional(),
  visa_sponsorship: z.boolean().optional(),
  worldwide_remote: z.boolean().optional(),
  relocation_assistance: z.boolean().optional(),
  equity_opportunities: z.boolean().optional(),
  no_degree_requirement: z.boolean().optional(),
  english_speaking: z.boolean().optional(),
  easy_application: z.boolean().optional(),
});

export type JobSearchFiltersInput = z.infer<typeof jobSearchFiltersSchema>;

export const jobSearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  filters: jobSearchFiltersSchema.optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["relevance", "newest", "salary_desc", "salary_asc"]).default("relevance"),
  view: z.enum(["list", "grid"]).default("list"),
  save_search: z.boolean().default(false),
  natural_language: z.boolean().default(false),
});

export const discoverRequestSchema = z.object({
  queries: z.array(z.string().min(1).max(300)).max(10).optional(),
  filters: jobSearchFiltersSchema.optional(),
  max_results_per_query: z.number().int().min(1).max(50).default(20),
});

export const resumeUploadSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_type: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]),
  file_size: z.number().int().positive().max(10 * 1024 * 1024), // 10MB
});

export const candidateProfileUpdateSchema = z.object({
  full_name: z.string().max(200).optional(),
  professional_headline: z.string().max(300).optional(),
  location: z.string().max(200).optional(),
  portfolio_url: z.string().url().max(500).or(z.literal("")).optional(),
  github_url: z.string().url().max(500).or(z.literal("")).optional(),
  linkedin_url: z.string().url().max(500).or(z.literal("")).optional(),
  summary: z.string().max(5000).optional(),
  total_years_experience: z.number().nonnegative().optional(),
});

export const savedJobSchema = z.object({
  job_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const applicationCreateSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum([
    "interested", "saved", "preparing", "applied", "assessment",
    "interview", "technical_interview", "final_interview", "offer", "rejected", "withdrawn",
  ]).default("interested"),
  application_date: z.string().optional(),
  company_contact: z.string().max(300).optional(),
  recruiter_name: z.string().max(200).optional(),
  recruiter_email: z.string().email().max(200).optional().or(z.literal("")),
  interview_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
  salary_expected: z.number().nonnegative().optional(),
  application_url: z.string().url().max(1000).optional().or(z.literal("")),
});

export const applicationUpdateSchema = applicationCreateSchema.partial().extend({
  id: z.string().uuid().optional(),
});

export const searchAlertSchema = z.object({
  name: z.string().min(1).max(200),
  filters: jobSearchFiltersSchema,
  frequency: z.enum(["daily", "twice_daily", "weekly"]).default("daily"),
  minimum_match_score: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().default(true),
});

export const assistantMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

export const coverLetterSchema = z.object({
  job_id: z.string().uuid(),
  tone: z.enum(["professional", "enthusiastic", "concise"]).default("professional"),
  additional_instructions: z.string().max(1000).optional(),
});

export const tailorResumeSchema = z.object({
  job_id: z.string().uuid(),
  additional_instructions: z.string().max(1000).optional(),
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  email_notifications: z.boolean().optional(),
  in_app_notifications: z.boolean().optional(),
  search_alerts: z.boolean().optional(),
  resume_visibility: z.enum(["private", "public"]).optional(),
  ai_data_processing: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().max(200).optional(),
  professional_headline: z.string().max(300).optional(),
  location: z.string().max(200).optional(),
  portfolio_url: z.string().url().max(500).or(z.literal("")).optional(),
  github_url: z.string().url().max(500).or(z.literal("")).optional(),
  linkedin_url: z.string().url().max(500).or(z.literal("")).optional(),
  phone: z.string().max(50).optional(),
});

export const preferencesUpdateSchema = z.object({
  job_titles: z.array(z.string().max(200)).max(50).optional(),
  skills: z.array(z.string().max(100)).max(100).optional(),
  experience_level: z.string().max(50).optional(),
  employment_type: z.array(z.string().max(50)).max(10).optional(),
  salary_min: z.number().nonnegative().optional().nullable(),
  salary_max: z.number().nonnegative().optional().nullable(),
  salary_currency: z.string().max(10).optional(),
  remote_only: z.boolean().optional(),
  preferred_countries: z.array(z.string().max(100)).max(50).optional(),
  preferred_locations: z.array(z.string().max(200)).max(50).optional(),
});

export const notificationReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export const naturalLanguageSearchSchema = z.object({
  text: z.string().min(3).max(1000),
});
