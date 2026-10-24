import type { EmergencyFund as Fund } from "@/lib/budget";
import { gbp } from "./format";

export default function EmergencyFund({ fund }: { fund: Fund }) {
  const pct = fund.target === 0 ? 0 : Math.min((fund.current / fund.target) * 100, 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{fund.monthsCovered} of {fund.targetMonths} months covered</span>
        <span className={fund.ok ? "text-[var(--good)]" : "text-[var(--serious)]"}>
          {fund.ok ? "✓ Target reached" : `▲ ${gbp(fund.target - fund.current)} to go`}
        </span>
      </div>
      <div className="h-3 rounded-r bg-[var(--surface-2)]">
        <div
          className="h-3 rounded-r"
          style={{ width: `${pct}%`, background: fund.ok ? "var(--good)" : "var(--series-1)" }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {gbp(fund.current)} saved of {gbp(fund.target)} target ({fund.targetMonths} × {gbp(fund.monthlyEssential)} essentials).
      </p>
    </div>
  );
}
