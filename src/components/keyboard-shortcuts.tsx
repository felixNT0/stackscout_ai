"use client";

import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

/** Component that enables global keyboard shortcuts. */
export function KeyboardShortcuts() {
    useKeyboardShortcuts();
    return null;
}
