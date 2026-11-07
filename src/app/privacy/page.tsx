import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = {
  title: "Privacy Policy",
  description: "How StackScout AI collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <p>Last updated: November 2024</p>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                <p>StackScout AI collects information you provide directly, including your name, email address, resume, and career preferences. We also collect usage data to improve our services.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                <p>We use your information to provide job matching services, send notifications, and improve our platform. We never sell your personal data to third parties.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
                <p>We implement industry-standard security measures to protect your data. Your resume is stored securely with row-level security ensuring only you can access it.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
                <p>You have the right to access, correct, or delete your personal data. You can export your data or delete your account at any time through your settings.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p>If you have questions about this privacy policy, please contact us at privacy@stackscout.ai</p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
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
