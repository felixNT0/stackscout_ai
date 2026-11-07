import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase, ArrowRight } from 'lucide-react'
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = {
  title: "About",
  description: "StackScout AI is building the future of AI-powered career discovery and job matching.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Mission />
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
            About StackScout AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            We're on a mission to make job discovery intelligent, efficient, and accessible for everyone.
          </p>
        </div>
      </div>
    </section>
  )
}

function Mission() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Our Mission</h2>
          <p className="text-lg text-muted-foreground mb-8">
            StackScout AI was founded with a simple goal: help technology professionals find their dream jobs faster and more effectively. We believe that the traditional job search process is broken—filled with manual searching, endless applications, and poor matches.
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            By leveraging artificial intelligence, we're transforming how people discover and evaluate career opportunities. Our platform analyzes your skills and experience to find jobs that truly match your profile, saving you time and helping you make better career decisions.
          </p>
          <h2 className="text-3xl font-bold mb-8">Our Values</h2>
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Intelligence First</h3>
              <p className="text-muted-foreground">We believe AI should enhance human decision-making, not replace it. Our tools provide insights that help you make informed choices.</p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">User Privacy</h3>
              <p className="text-muted-foreground">Your data belongs to you. We implement industry-standard security and never share your information without consent.</p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Accessibility</h3>
              <p className="text-muted-foreground">Great job opportunities should be accessible to everyone. We're committed to making our platform usable and inclusive.</p>
            </div>
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
            Join Our Mission
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start using StackScout AI today and experience the future of job discovery.
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
