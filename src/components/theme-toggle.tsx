"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

const ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof ORDER)[number];

const LABELS: Record<ThemeChoice, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
  }

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${LABELS[current]}. Activate for ${LABELS[next]}.`}
      title={LABELS[current]}
      onClick={() => setTheme(next)}
    >
      {current === "system" ? (
        <Monitor className="h-[1.2rem] w-[1.2rem]" />
      ) : current === "light" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">{LABELS[current]}</span>
    </Button>
  );
}
