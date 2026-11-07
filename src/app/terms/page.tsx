import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { SiteHeader } from "@/components/layout/site-header";

export const metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of StackScout AI.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <p>Last updated: November 2024</p>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
                <p>By using StackScout AI, you agree to these terms of service. If you do not agree to these terms, please do not use our service.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Account Responsibilities</h2>
                <p>You are responsible for maintaining the security of your account and for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Service Use</h2>
                <p>StackScout AI is provided for personal job search purposes. You may not use the service for automated scraping, data mining, or any commercial purpose without explicit permission.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">User Content</h2>
                <p>You retain ownership of any content you upload, including your resume. By uploading content, you grant us the right to process and analyze it to provide our services.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Job Listings</h2>
                <p>Job listings are provided by third-party sources. We do not guarantee the accuracy, completeness, or availability of any job posting. Always verify information directly with employers.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                <p>StackScout AI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Termination</h2>
                <p>We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
                <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p>If you have questions about these terms, please contact us at legal@stackscout.ai</p>
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
