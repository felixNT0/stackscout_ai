// User & Profile
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  professional_headline: string | null
  location: string | null
  portfolio_url: string | null
  github_url: string | null
  linkedin_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface JobPreferences {
  id: string
  user_id: string
  job_titles: string[]
  skills: string[]
  experience_level: string | null
  employment_type: string[]
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  remote_only: boolean
  preferred_countries: string[]
  preferred_locations: string[]
  created_at: string
  updated_at: string
}

// Resume
export interface Resume {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  extracted_text: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface CandidateProfile {
  id: string
  user_id: string
  resume_id: string | null
  full_name: string | null
  professional_headline: string | null
  email: string | null
  phone: string | null
  location: string | null
  portfolio_url: string | null
  github_url: string | null
  linkedin_url: string | null
  summary: string | null
  total_years_experience: number | null
  created_at: string
  updated_at: string
}

export interface CandidateSkill {
  id: string
  candidate_profile_id: string
  skill_name: string
  skill_category: 'programming_language' | 'framework' | 'library' | 'database' | 'cloud_platform' | 'dev_tool' | 'testing_tool' | 'ai_tool' | 'soft_skill' | 'other'
  proficiency: 'learning' | 'junior' | 'intermediate' | 'senior' | 'expert'
  years_experience: number | null
  is_professional: boolean
  evidence: string | null
  created_at: string
}

export interface WorkExperience {
  id: string
  candidate_profile_id: string
  job_title: string
  company: string
  location: string | null
  start_date: string | null
  end_date: string | null
  is_current: boolean
  responsibilities: string[]
  achievements: string[]
  created_at: string
}

export interface Education {
  id: string
  candidate_profile_id: string
  institution: string
  degree: string
  field_of_study: string | null
  start_date: string | null
  end_date: string | null
  gpa: string | null
  created_at: string
}

export interface CandidateProject {
  id: string
  candidate_profile_id: string
  name: string
  description: string | null
  technologies: string[]
  url: string | null
  start_date: string | null
  end_date: string | null
  is_personal: boolean
  created_at: string
}

// Jobs
export interface Job {
  id: string
  external_id: string | null
  title: string
  company: string
  company_logo: string | null
  description: string
  responsibilities: string[]
  required_skills: string[]
  preferred_skills: string[]
  location: string | null
  country: string | null
  remote_status: 'remote' | 'hybrid' | 'on-site' | null
  employment_type: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'temporary' | null
  experience_level: 'internship' | 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'director' | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_period: 'hourly' | 'monthly' | 'annual' | null
  application_url: string
  source_name: string
  source_url: string | null
  published_at: string | null
  discovered_at: string
  last_verified_at: string | null
  expiration_date: string | null
  status: 'active' | 'expired' | 'closed' | 'suspicious'
  raw_source_data: any
  created_at: string
  updated_at: string
}

export interface JobSource {
  id: string
  name: string
  provider_type: 'tavily' | 'adzuna' | 'jooble' | 'greenhouse' | 'lever' | 'custom'
  base_url: string | null
  api_key_required: boolean
  is_active: boolean
  last_sync_at: string | null
  sync_frequency_hours: number | null
  created_at: string
  updated_at: string
}

export interface JobSearch {
  id: string
  user_id: string
  query: string
  filters: JobSearchFilters
  results_count: number
  saved: boolean
  created_at: string
}

export interface JobSearchFilters {
  job_title?: string
  keywords?: string
  technology?: string
  skill?: string
  company?: string
  industry?: string
  location?: string
  country?: string
  employment_type?: string[]
  remote_status?: string[]
  experience_level?: string[]
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  date_posted?: string
  visa_sponsorship?: boolean
  worldwide_remote?: boolean
  relocation_assistance?: boolean
  equity_opportunities?: boolean
  no_degree_requirement?: boolean
  english_speaking?: boolean
  easy_application?: boolean
}

// Matching
export interface JobMatch {
  id: string
  user_id: string
  job_id: string
  candidate_profile_id: string | null
  compatibility_score: number
  technical_stack_score: number
  experience_score: number
  responsibilities_score: number
  seniority_score: number
  location_score: number
  industry_score: number
  matching_skills: string[]
  missing_skills: string[]
  relevant_experience: string
  potential_weaknesses: string[]
  seniority_compatibility: string
  location_eligibility: string
  explanation: string
  recommendation: string
  created_at: string
  updated_at: string
}

// Saved Jobs & Applications
export interface SavedJob {
  id: string
  user_id: string
  job_id: string
  notes: string | null
  created_at: string
}

export interface Application {
  id: string
  user_id: string
  job_id: string
  status: 'interested' | 'saved' | 'preparing' | 'applied' | 'assessment' | 'interview' | 'technical_interview' | 'final_interview' | 'offer' | 'rejected' | 'withdrawn'
  application_date: string | null
  company_contact: string | null
  recruiter_name: string | null
  recruiter_email: string | null
  interview_date: string | null
  notes: string | null
  salary_expected: number | null
  application_url: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationEvent {
  id: string
  application_id: string
  event_type: string
  event_date: string
  notes: string | null
  created_at: string
}

// Alerts & Notifications
export interface SearchAlert {
  id: string
  user_id: string
  job_search_id: string | null
  name: string
  filters: JobSearchFilters
  frequency: 'daily' | 'twice_daily' | 'weekly'
  minimum_match_score: number | null
  is_active: boolean
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'job_discovery' | 'match_update' | 'application_reminder' | 'alert' | 'system'
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

// AI & Documents
export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface GeneratedDocument {
  id: string
  user_id: string
  document_type: 'cover_letter' | 'tailored_resume' | 'professional_summary' | 'interview_prep'
  job_id: string | null
  candidate_profile_id: string | null
  title: string
  content: string
  created_at: string
}

// Settings
export interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  email_notifications: boolean
  in_app_notifications: boolean
  search_alerts: boolean
  resume_visibility: 'private' | 'public'
  ai_data_processing: boolean
  created_at: string
  updated_at: string
}

// Admin
export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: any
  created_at: string
}

export interface ProviderSyncLog {
  id: string
  provider_id: string
  sync_type: 'full' | 'incremental'
  status: 'success' | 'partial' | 'failed'
  jobs_discovered: number
  jobs_updated: number
  errors: number
  error_details: any
  started_at: string
  completed_at: string | null
}
