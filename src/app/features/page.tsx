import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  Globe,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = {
  title: "Features",
  description: "AI resume intelligence, multi-source job discovery, smart matching, and application tracking — everything in StackScout AI.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}


function Hero() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Powerful Features for Your Job Search
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Everything you need to discover, evaluate, and apply to your dream
            job opportunities.
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Resume Intelligence",
      description:
        "Upload your resume and let AI extract your skills, experience, and career profile automatically. We analyze your document to understand your professional journey.",
      items: [
        "Automatic skill extraction",
        "Experience parsing",
        "Career profile generation",
        "Resume version management",
      ],
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Global Job Discovery",
      description:
        "Search across multiple job boards and company career pages to find opportunities worldwide. Our multi-source integration ensures you never miss a relevant opening.",
      items: [
        "Multiple job board integrations",
        "Company career page discovery",
        "Real-time job updates",
        "Global coverage",
      ],
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Smart Job Matching",
      description:
        "Get personalized job recommendations based on your skills, experience, and career preferences. Our AI-powered matching algorithm finds opportunities that truly fit your profile.",
      items: [
        "AI-powered compatibility scoring",
        "Skills gap analysis",
        "Experience matching",
        "Personalized recommendations",
      ],
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Career Intelligence",
      description:
        "Track market trends, skill demand, and salary insights to make informed career decisions. Understand what employers are looking for in your field.",
      items: [
        "Market trend analysis",
        "Skill demand tracking",
        "Salary insights",
        "Industry intelligence",
      ],
    },
    {
      icon: <Briefcase className="h-6 w-6" />,
      title: "Application Tracking",
      description:
        "Manage your entire job application journey with our built-in tracking and organization tools. Keep track of every application, interview, and follow-up.",
      items: [
        "Kanban board view",
        "Application status tracking",
        "Interview scheduling",
        "Notes and reminders",
      ],
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Personalized Job Alerts",
      description:
        "Receive automated alerts when new opportunities match your profile and preferences. Never miss a perfect opportunity again.",
      items: [
        "Custom alert frequency",
        "Match score thresholds",
        "Email notifications",
        "In-app alerts",
      ],
    },
  ];

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="space-y-12 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="bg-card border rounded-lg p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              <ul className="grid md:grid-cols-2 gap-2">
                {feature.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start using StackScout AI today and discover opportunities that
            match your skills and ambitions.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
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
  );
}
