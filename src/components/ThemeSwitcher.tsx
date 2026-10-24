"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // Storage blocked: the choice still applies until the page is reloaded.
  }
  listeners.forEach((l) => l());
}

/** Segmented control with a sliding thumb. `compact` shows icons only (sidebar). */
export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const index = OPTIONS.findIndex((o) => o.value === theme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative grid grid-cols-3 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 text-xs"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ background: "var(--accent-grad)", transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => applyTheme(o.value)}
            className={`relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
              active ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <o.Icon size={16} aria-hidden />
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** One icon button that cycles System → Light → Dark; used where the full switcher won't fit. */
export function ThemeCycleButton() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => applyTheme(next.value)}
      title={`Theme: ${current.label} (click for ${next.label})`}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      <current.Icon size={16} aria-hidden />
    </button>
  );
}
