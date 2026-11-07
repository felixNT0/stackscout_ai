import { BottomCTA } from "@/components/bottom-cta";
import { HeroCTA } from "@/components/hero-cta";
import { LandingSearch } from "@/components/landing-search";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Briefcase,
  Globe,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Your Next Career Opportunity{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Starts Here
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let AI understand your skills, discover opportunities across the
              web and help you find jobs that match your career ambitions.
            </p>

            {/* Search Component */}
            <LandingSearch />

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <HeroCTA />
              <Link href="/jobs">
                <Button size="lg" variant="outline">
                  Explore Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose StackScout AI?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Intelligent job discovery powered by AI, designed to help you find
              the perfect career opportunity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI Resume Intelligence"
              description="Upload your resume and let AI extract your skills, experience, and career profile automatically."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Global Job Discovery"
              description="Search across multiple job boards and company career pages to find opportunities worldwide."
            />
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Smart Job Matching"
              description="Get personalized job recommendations based on your skills, experience, and career preferences."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Career Intelligence"
              description="Track market trends, skill demand, and salary insights to make informed career decisions."
            />
            <FeatureCard
              icon={<Briefcase className="h-6 w-6" />}
              title="Application Tracking"
              description="Manage your entire job application journey with our built-in tracking and organization tools."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Personalized Job Alerts"
              description="Receive automated alerts when new opportunities match your profile and preferences."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find your dream job in just a few simple steps.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-5 gap-8">
              <StepCard
                step="1"
                title="Upload Resume"
                description="Upload your resume or search manually"
              />
              <StepCard
                step="2"
                title="AI Discovery"
                description="Let AI discover relevant opportunities"
              />
              <StepCard
                step="3"
                title="Review Matches"
                description="Review your personalized job matches"
              />
              <StepCard
                step="4"
                title="Apply"
                description="Apply directly to opportunities"
              />
              <StepCard
                step="5"
                title="Track Progress"
                description="Track your application progress"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Users Say
            </h2>
            <p className="text-lg text-muted-foreground">
              Hear from professionals who found their dream jobs with StackScout
              AI.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <TestimonialCard
              name="Sarah Chen"
              role="Senior Software Engineer"
              company="Tech Startup"
              content="StackScout AI helped me find a role that perfectly matched my skills in React and Next.js. The AI matching was incredibly accurate."
            />
            <TestimonialCard
              name="Michael Rodriguez"
              role="Product Designer"
              company="Design Agency"
              content="The personalized job recommendations saved me hours of searching. I landed my dream job within two weeks."
            />
            <TestimonialCard
              name="Emily Watson"
              role="Full-Stack Developer"
              company="Enterprise Company"
              content="The application tracking feature kept me organized throughout my job search. Highly recommended for any tech professional."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Find Your Next Career Move?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of professionals who have found their dream jobs
              with StackScout AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <BottomCTA />
              <Link href="/features">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">StackScout AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered job discovery platform for technology professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="hover:text-foreground">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 StackScout AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  company,
  content,
}: {
  name: string;
  role: string;
  company: string;
  content: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-muted-foreground mb-4">{content}</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-muted-foreground">
          {role} at {company}
        </p>
      </div>
    </div>
  );
}
