"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS: Record<string, string> = {
    "/": "/dashboard/search",
    "d": "/dashboard",
    "j": "/dashboard/search",
    "a": "/dashboard/applications",
    "r": "/dashboard/resume",
    "i": "/dashboard/insights",
    "t": "/dashboard/tools",
    "s": "/dashboard/settings",
    "?": "help",
};

/**
 * Global keyboard shortcuts for power users.
 * Press ? to see all shortcuts.
 */
export function useKeyboardShortcuts() {
    const router = useRouter();

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            // Ignore if modifier keys are pressed
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const key = e.key.toLowerCase();
            const path = SHORTCUTS[key];

            if (path === "help") {
                // Show shortcuts help (could be a modal)
                console.log("Keyboard shortcuts:", SHORTCUTS);
                return;
            }

            if (path) {
                e.preventDefault();
                router.push(path);
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);
}
