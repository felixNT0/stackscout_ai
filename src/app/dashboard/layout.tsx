import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Briefcase } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// This layout reads the auth session per-request; allow blocking routes.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force request-time rendering — child components use Date.now() which is
  // unstable during prerendering with Cache Components.
  await connection();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if onboarding is complete (has professional_headline or job_titles)
  let needsOnboarding = false;
  try {
    const [profile, prefs] = await Promise.all([
      prisma.profile.findUnique({
        where: { user_id: session.user.id },
        select: { professional_headline: true },
      }),
      prisma.jobPreference.findUnique({
        where: { user_id: session.user.id },
        select: { job_titles: true },
      }),
    ]);

    needsOnboarding =
      !profile?.professional_headline && !prefs?.job_titles?.length;
  } catch (err) {
    // If DB is unreachable, allow access — user can complete onboarding later
    console.error("Onboarding check failed:", err);
  }

  if (needsOnboarding) {
    redirect("/auth/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden border-b p-4 flex items-center justify-between sticky top-0 bg-background z-40">
        <div className="flex items-center gap-2">
          <MobileNav />
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold">StackScout AI</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r min-h-screen sticky top-0 h-screen">
          <div className="p-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">StackScout AI</span>
            </Link>
          </div>

          <SidebarNav aboveSignOut={<NotificationsBell />} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
