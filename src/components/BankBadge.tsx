export type BankName = "monzo" | "revolut";

const BANKS: Record<BankName, { title: string; bg: string; fg: string; glyph: string }> = {
  monzo: { title: "Monzo", bg: "#FF4F40", fg: "#FFFFFF", glyph: "M" },
  revolut: { title: "Revolut", bg: "#0A0A0A", fg: "#FFFFFF", glyph: "R" },
};

/** Brand-coloured bank mark, optionally followed by the bank's name. */
export default function BankBadge({
  bank,
  size = 20,
  showName = false,
  className = "",
}: {
  bank?: string;
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  const info = bank ? BANKS[bank as BankName] : undefined;
  if (!info) return bank ? <span className={`capitalize ${className}`}>{bank}</span> : <span>—</span>;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role={showName ? undefined : "img"}
        aria-label={showName ? undefined : info.title}
        aria-hidden={showName || undefined}
        className="shrink-0"
      >
        <title>{info.title}</title>
        <rect width="24" height="24" rx="7" fill={info.bg} />
        <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="Arial, sans-serif" fill={info.fg}>
          {info.glyph}
        </text>
      </svg>
      {showName && <span>{info.title}</span>}
    </span>
  );
}
