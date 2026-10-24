"use client";

import {
  ArrowLeftRight,
  ChartColumn,
  FileText,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import ThemeSwitcher, { ThemeCycleButton } from "@/components/ThemeSwitcher";

const ITEMS = [
  { label: "Upload", href: "/", Icon: Upload },
  { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", Icon: ArrowLeftRight },
  { label: "Statements", href: "/statements", Icon: FileText },
  { label: "Reports", href: "/reports", Icon: ChartColumn },
  { label: "Settings", href: "/settings", Icon: Settings },
] as const;

type Active = "/" | "/dashboard" | "/statements" | "/transactions" | "/reports" | "/settings";

// Collapsed state is remembered per browser; a tiny external store keeps it in sync.
const listeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem("sidebar") === "collapsed";
  } catch {
    return false;
  }
};
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
};
function setCollapsed(value: boolean) {
  try {
    localStorage.setItem("sidebar", value ? "collapsed" : "open");
  } catch {
    // Storage blocked: the toggle still works until reload.
  }
  listeners.forEach((l) => l());
}

export default function Sidebar({ active }: { active: Active }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <>
      {/* Desktop: collapses to an icon rail. */}
      <aside
        data-collapsed={collapsed}
        className={`hidden shrink-0 overflow-hidden bg-[var(--surface-1)] py-6 transition-[width] duration-300 ease-in-out motion-reduce:transition-none md:block ${
          collapsed ? "w-[4.5rem]" : "w-52"
        }`}
      >
        <Panel
          active={active}
          collapsed={collapsed}
          toggle={
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
            </button>
          }
        />
      </aside>

      {/* Mobile: slide-in drawer. */}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--text-primary)] shadow-md md:hidden"
      >
        <Menu size={18} aria-hidden />
      </button>
      <div
        className={`fixed inset-0 z-40 md:hidden ${drawer ? "" : "pointer-events-none"}`}
        aria-hidden={!drawer}
      >
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
            drawer ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`viz-root absolute inset-y-0 left-0 w-64 bg-[var(--surface-1)] py-6 shadow-xl transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Panel
            active={active}
            collapsed={false}
            onNavigate={() => setDrawer(false)}
            toggle={
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              >
                <X size={18} aria-hidden />
              </button>
            }
          />
        </aside>
      </div>
    </>
  );
}

function Panel({
  active,
  collapsed,
  toggle,
  onNavigate,
}: {
  active: Active;
  collapsed: boolean;
  toggle: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-8 flex items-center justify-between px-[18px]">
        <Link
          href="/"
          onClick={onNavigate}
          tabIndex={collapsed ? -1 : undefined}
          className={`overflow-hidden whitespace-nowrap pl-2.5 text-xl font-medium tracking-wide transition-all duration-300 motion-reduce:transition-none ${
            collapsed ? "max-w-0 pl-0 opacity-0" : "max-w-44 opacity-100"
          }`}
        >
          PENNY<span className="text-[var(--accent)]">WISE.</span>
        </Link>
        {toggle}
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const current = item.href === active;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 border-r-4 pl-[27px] pr-3 py-3 text-sm ${
                current
                  ? "border-[var(--accent)] font-medium text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <item.Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity duration-300 motion-reduce:transition-none ${
                  collapsed ? "opacity-0" : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-8 border-t border-[var(--border)] pt-6 ${collapsed ? "flex justify-center" : "px-5"}`}>
        {collapsed ? (
          <ThemeCycleButton />
        ) : (
          <>
            <p className="mb-2 text-xs text-[var(--text-secondary)]">Theme</p>
            <ThemeSwitcher compact />
          </>
        )}
      </div>
    </div>
  );
}
