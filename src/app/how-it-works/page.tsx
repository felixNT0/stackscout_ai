import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase, Upload, Search, CheckCircle, Briefcase as BriefcaseIcon, Calendar, ArrowRight } from 'lucide-react'
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = {
  title: "How It Works",
  description: "From resume upload to job offer: see how StackScout AI discovers, scores, and tracks opportunities.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Steps />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}


function Hero() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            How StackScout AI Works
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find your dream job in just a few simple steps. Our AI-powered platform makes job discovery intelligent and efficient.
          </p>
        </div>
      </div>
    </section>
  )
}

function Steps() {
  const steps = [
    {
      icon: <Upload className="h-8 w-8" />,
      title: "Upload Your Resume or Search Manually",
      description: "Start by uploading your resume (PDF, DOCX, or TXT) and let AI extract your professional profile. Alternatively, you can skip this step and search for jobs manually using our powerful search engine.",
      details: [
        "Support for PDF, DOCX, and TXT formats",
        "AI-powered profile extraction",
        "Skills and experience analysis",
        "Manual search option available"
      ]
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: "Let AI Discover Relevant Opportunities",
      description: "Our AI analyzes your profile and generates targeted search queries. We search across multiple job boards and company career pages to find opportunities that match your skills and preferences.",
      details: [
        "Multi-source job discovery",
        "AI-generated search queries",
        "Real-time job aggregation",
        "Smart filtering and ranking"
      ]
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: "Review Your Personalized Matches",
      description: "Browse through AI-curated job recommendations with compatibility scores. Each match includes detailed analysis of why the job fits your profile, along with skills gaps and potential concerns.",
      details: [
        "Compatibility scoring",
        "Skills gap analysis",
        "Detailed job insights",
        "Easy comparison tools"
      ]
    },
    {
      icon: <BriefcaseIcon className="h-8 w-8" />,
      title: "Apply Directly to Opportunities",
      description: "Apply to jobs directly through company websites with one click. Our platform provides all the information you need to make informed decisions and submit strong applications.",
      details: [
        "Direct application links",
        "Job details and requirements",
        "Company information",
        "Application tracking"
      ]
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Track Your Application Progress",
      description: "Use our application tracker to manage your entire job search journey. Track statuses, schedule interviews, add notes, and never lose track of an opportunity again.",
      details: [
        "Kanban board view",
        "Status tracking",
        "Interview scheduling",
        "Notes and reminders"
      ]
    }
  ]

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="space-y-16 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-8">
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground mb-4">{step.description}</p>
                <ul className="grid md:grid-cols-2 gap-2">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const faqs = [
    {
      question: "Do I need to upload a resume to use StackScout AI?",
      answer: "No, you can use our manual job search feature without uploading a resume. However, uploading a resume enables AI-powered matching and personalized recommendations."
    },
    {
      question: "How does the AI matching work?",
      answer: "Our AI analyzes your resume to extract skills, experience, and career preferences. It then compares this profile against job descriptions using semantic analysis and compatibility scoring to find the best matches."
    },
    {
      question: "Where do the job listings come from?",
      answer: "We aggregate jobs from multiple sources including major job boards, company career pages, and public job APIs. All listings are attributed to their original source."
    },
    {
      question: "Is my resume data secure?",
      answer: "Yes, your resume is stored securely in private storage and is only accessible to you. We use industry-standard security measures and row-level security to protect your data."
    },
    {
      question: "Can I track multiple job applications?",
      answer: "Yes, our application tracker allows you to manage all your job applications in one place. You can track status, schedule interviews, add notes, and organize your entire job search."
    }
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Job Search?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join StackScout AI today and let AI help you find your perfect career opportunity.
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
  )
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
              <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 StackScout AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
