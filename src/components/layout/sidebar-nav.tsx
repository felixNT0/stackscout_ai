"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Bookmark,
  Brain,
  CheckSquare,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Discover Jobs", href: "/dashboard/discover", icon: Search },
  { name: "AI Matches", href: "/dashboard/matches", icon: Brain },
  { name: "Manual Search", href: "/dashboard/search", icon: Search },
  { name: "My Resume", href: "/dashboard/resume", icon: FileText },
  { name: "AI Assistant", href: "/dashboard/assistant", icon: MessageSquare },
  { name: "Saved Jobs", href: "/dashboard/saved", icon: Bookmark },
  { name: "Applications", href: "/dashboard/applications", icon: CheckSquare },
  { name: "Career Insights", href: "/dashboard/insights", icon: TrendingUp },
  { name: "Job Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function SidebarNav({
  aboveSignOut,
  onNavigate,
}: {
  aboveSignOut?: React.ReactNode
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t space-y-1">
        {aboveSignOut}
        <Link
          href="/auth/signout"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Link>
      </div>
    </div>
  )
}
