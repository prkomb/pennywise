import { planVsActual, type BudgetPlan, type BudgetSummary } from "./budget";

export type AdviceLevel = "critical" | "warning" | "info" | "good";

export interface Advice {
  level: AdviceLevel;
  title: string;
  body: string;
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

const ORDER: Record<AdviceLevel, number> = { critical: 0, warning: 1, info: 2, good: 3 };

export function buildAdvice(summary: BudgetSummary, plan?: BudgetPlan): Advice[] {
  if (summary.income === 0 && summary.expense === 0) return [];
  const advice: Advice[] = [];

  if (summary.income === 0) {
    advice.push({
      level: "info",
      title: "No income this month",
      body: "Upload the statement that includes your salary to compare spending against a plan.",
    });
  } else {
    const [essential, wants, savings] = planVsActual(summary, plan);

    if (summary.net < 0) {
      advice.push({
        level: "critical",
        title: "Spending exceeds income",
        body: `You spent ${gbp(-summary.net)} more than you earned. Start with the wants below.`,
      });
    } else if (savings.ok) {
      advice.push({
        level: "good",
        title: "Savings on track",
        body: `You saved ${gbp(savings.actual)}, ${gbp(savings.diff)} above plan.`,
      });
    } else {
      advice.push({
        level: "warning",
        title: "Savings below plan",
        body: `You saved ${gbp(savings.actual)}, ${gbp(-savings.diff)} short of ${gbp(savings.planned)}.`,
      });
    }

    if (!wants.ok) {
      advice.push({
        level: "warning",
        title: "Wants over plan",
        body: `${gbp(wants.diff)} over the ${gbp(wants.planned)} planned for wants.`,
      });
    }
    if (!essential.ok) {
      advice.push({
        level: "warning",
        title: "Essentials over plan",
        body: `Essentials are ${gbp(essential.diff)} above plan. Check rent, bills and transport for cheaper deals.`,
      });
    }
  }

  const [topCategory, topAmount] =
    Object.entries(summary.unnecessaryByCategory).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topCategory) {
    const total = summary.byNecessity.unnecessary ?? 0;
    advice.push({
      level: "warning",
      title: "Cut unnecessary spending",
      body: `${gbp(total)} was labelled unnecessary. Biggest: ${topCategory} (${gbp(topAmount)}).`,
    });
  }

  const subscriptions = summary.byCategory.subscriptions ?? 0;
  if (subscriptions > 0) {
    advice.push({
      level: "info",
      title: "Review subscriptions",
      body: `${gbp(subscriptions)} on subscriptions. Cancel any you have not used this month.`,
    });
  }

  const uncategorized = summary.byNecessity.uncategorized ?? 0;
  if (uncategorized > 0) {
    advice.push({
      level: "info",
      title: "Some rows are not categorized",
      body: `${gbp(uncategorized)} has no label yet, so the plan numbers are understated.`,
    });
  }

  return advice.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
