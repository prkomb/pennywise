import Sidebar from "./Sidebar";

export default function AppShell({
  active,
  children,
}: {
  active: "/" | "/dashboard" | "/statements" | "/transactions" | "/reports" | "/settings";
  children: React.ReactNode;
}) {
  return (
    <div className="viz-root flex min-h-screen bg-[var(--page)] text-[var(--text-primary)]">
      <Sidebar active={active} />
      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 md:px-9 md:pt-8">{children}</main>
    </div>
  );
}
