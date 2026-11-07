"use client";

import { Briefcase, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={close}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background border-r flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">StackScout AI</span>
              </div>
              <div className="flex items-center gap-1">
                <NotificationsBell />
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation menu"
                  onClick={close}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <SidebarNav onNavigate={close} />
          </div>
        </div>
      )}
    </>
  );
}
