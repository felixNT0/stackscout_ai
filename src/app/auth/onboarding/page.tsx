"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Briefcase, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnboardingFormData {
  fullName: string;
  professionalHeadline: string;
  location: string;
  experienceLevel: string;
  jobTitles: string;
  skills: string;
  employmentType: string;
  remoteOnly: boolean;
}

interface StepProps {
  formData: OnboardingFormData;
  setFormData: (data: OnboardingFormData) => void;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    professionalHeadline: "",
    location: "",
    experienceLevel: "",
    jobTitles: "",
    skills: "",
    employmentType: "",
    remoteOnly: false,
  });

  // Auto-fill name from Google OAuth session
  useEffect(() => {
    if (session?.user?.name && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: session.user.name || "" }));
    }
  }, [session?.user?.name, formData.fullName]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");

      // Trigger AI analysis to extract profile data
      const resumeId = data.data?.resume?.id;
      if (resumeId) {
        const analyzeRes = await fetch(`/api/resumes/${resumeId}/analyze`, {
          method: "POST",
        });
        const analyzeData = await analyzeRes.json().catch(() => ({}));
        if (analyzeRes.ok && analyzeData.data?.parsed) {
          const parsed = analyzeData.data.parsed;
          const personal = parsed.personal || {};
          setFormData((prev) => ({
            ...prev,
            fullName: personal.full_name || prev.fullName,
            professionalHeadline:
              personal.professional_headline || prev.professionalHeadline,
            location: personal.location || prev.location,
          }));
          // Extract skills from parsed data
          const skills = (parsed.skills || [])
            .map((s: { name?: string }) => s.name)
            .filter(Boolean);
          if (skills.length) {
            setFormData((prev) => ({ ...prev, skills: skills.join(", ") }));
          }
          toast({
            title: "Resume analyzed!",
            description: "We've filled in your profile from your resume.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!session?.user) throw new Error("Not authenticated");

      // Upsert profile + job preferences via the profile API
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            full_name: formData.fullName,
            professional_headline: formData.professionalHeadline,
            location: formData.location,
          },
          preferences: {
            job_titles: formData.jobTitles
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            skills: formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            experience_level: formData.experienceLevel || undefined,
            employment_type: formData.employmentType
              ? [formData.employmentType]
              : [],
            remote_only: formData.remoteOnly,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      toast({
        title: "Setup complete!",
        description: "Your profile has been created successfully.",
      });

      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Setup failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-lg bg-linear-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Step {step} of 5 - Let's set up your account
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          {step === 1 && (
            <Step1
              formData={formData}
              setFormData={setFormData}
              onResumeUpload={handleResumeUpload}
              uploading={uploading}
            />
          )}
          {step === 2 && (
            <Step2 formData={formData} setFormData={setFormData} />
          )}
          {step === 3 && (
            <Step3 formData={formData} setFormData={setFormData} />
          )}
          {step === 4 && (
            <Step4 formData={formData} setFormData={setFormData} />
          )}
          {step === 5 && (
            <Step5 formData={formData} setFormData={setFormData} />
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 5 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({
  formData,
  setFormData,
  onResumeUpload,
  uploading,
}: StepProps & {
  onResumeUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

      {/* Resume upload for auto-fill */}
      <div className="border-2 border-dashed rounded-lg p-4 text-center">
        <input
          type="file"
          id="resume-upload"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
          onChange={onResumeUpload}
          disabled={uploading}
        />
        <label
          htmlFor="resume-upload"
          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <>
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
              Analyzing resume...
            </>
          ) : (
            <>
              <Briefcase className="inline h-4 w-4 mr-2" />
              Upload your resume to auto-fill your profile
            </>
          )}
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, DOCX, or TXT (max 10MB)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
          placeholder="John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="professionalHeadline">Professional Headline</Label>
        <Input
          id="professionalHeadline"
          value={formData.professionalHeadline}
          onChange={(e) =>
            setFormData({ ...formData, professionalHeadline: e.target.value })
          }
          placeholder="Senior Software Engineer"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
          placeholder="San Francisco, CA"
        />
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Career Information</h2>
      <div className="space-y-2">
        <Label htmlFor="experienceLevel">Experience Level</Label>
        <Select
          value={formData.experienceLevel}
          onValueChange={(value) =>
            setFormData({ ...formData, experienceLevel: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry">Entry Level</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid-Level</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="director">Director</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="jobTitles">Job Titles (comma-separated)</Label>
        <Input
          id="jobTitles"
          value={formData.jobTitles}
          onChange={(e) =>
            setFormData({ ...formData, jobTitles: e.target.value })
          }
          placeholder="Software Engineer, Full-Stack Developer"
        />
      </div>
    </div>
  );
}

function Step3({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Skills</h2>
      <div className="space-y-2">
        <Label htmlFor="skills">Your Skills (comma-separated)</Label>
        <Input
          id="skills"
          value={formData.skills}
          onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
          placeholder="React, TypeScript, Node.js, Python"
        />
        <p className="text-sm text-muted-foreground">
          Include programming languages, frameworks, tools, and technologies you
          work with.
        </p>
      </div>
    </div>
  );
}

function Step4({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Job Preferences</h2>
      <div className="space-y-2">
        <Label htmlFor="employmentType">Employment Type</Label>
        <Select
          value={formData.employmentType}
          onValueChange={(value) =>
            setFormData({ ...formData, employmentType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="remoteOnly"
          checked={formData.remoteOnly}
          onChange={(e) =>
            setFormData({ ...formData, remoteOnly: e.target.checked })
          }
          className="h-4 w-4"
        />
        <Label htmlFor="remoteOnly">Remote-only opportunities</Label>
      </div>
    </div>
  );
}

function Step5({ formData }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Review Your Profile</h2>
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <p>
          <strong>Name:</strong> {formData.fullName}
        </p>
        <p>
          <strong>Headline:</strong> {formData.professionalHeadline}
        </p>
        <p>
          <strong>Location:</strong> {formData.location}
        </p>
        <p>
          <strong>Experience:</strong> {formData.experienceLevel}
        </p>
        <p>
          <strong>Job Titles:</strong> {formData.jobTitles}
        </p>
        <p>
          <strong>Skills:</strong> {formData.skills}
        </p>
        <p>
          <strong>Employment Type:</strong> {formData.employmentType}
        </p>
        <p>
          <strong>Remote Only:</strong> {formData.remoteOnly ? "Yes" : "No"}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        You can always update these settings later in your profile.
      </p>
    </div>
  );
}
