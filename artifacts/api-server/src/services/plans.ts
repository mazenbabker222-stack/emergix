import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { loadDb } from "../lib/database";

/** Currency shown on the public pricing page until regional pricing is wired up in phase 08. */
const DISPLAY_CURRENCY = "GBP";

const durationLabel = (months: number) => (months === 0 ? "Free" : `${months} month${months === 1 ? "" : "s"}`);

/**
 * The database stores one plan per access duration (phase 02, so Stripe prices map 1:1).
 * The public pricing page shows one card per family with a duration picker, so plans that share
 * a `family_key` are grouped here. A plan without a family key is a card of its own.
 */
export async function listPlans() {
  const { db, plansTable, planPricesTable, examsTable } = await loadDb();
  const rows = await db
    .select({ plan: plansTable, examSlug: examsTable.slug })
    .from(plansTable)
    .leftJoin(examsTable, eq(plansTable.examId, examsTable.id))
    .where(and(eq(plansTable.status, "published"), isNull(plansTable.deletedAt)))
    .orderBy(asc(plansTable.position), asc(plansTable.accessMonths), asc(plansTable.name));
  if (rows.length === 0) return [];
  const prices = await db
    .select()
    .from(planPricesTable)
    .where(
      and(
        inArray(planPricesTable.planId, rows.map((r) => r.plan.id)),
        eq(planPricesTable.currency, DISPLAY_CURRENCY),
        eq(planPricesTable.region, "ALL"),
      ),
    );
  const priceOf = new Map(prices.map((p) => [p.planId, p]));

  const families = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.plan.familyKey ?? row.plan.slug;
    families.set(key, [...(families.get(key) ?? []), row]);
  }

  return [...families.entries()].map(([key, members]) => {
    const byDuration = [...members].sort((a, b) => a.plan.accessMonths - b.plan.accessMonths);
    const first = byDuration[0]!;
    const longest = byDuration[byDuration.length - 1]!;
    return {
      id: first.plan.id,
      slug: key,
      name: first.plan.familyName ?? first.plan.name,
      examSlug: first.examSlug ?? null,
      description: first.plan.description,
      // The longest duration lists the most features (shorter ones are subsets).
      features: longest.plan.features,
      isFeatured: members.some((m) => m.plan.isFeatured),
      isPlaceholder: members.some((m) => m.plan.isPlaceholder),
      prices: byDuration.flatMap(({ plan }) => {
        const price = priceOf.get(plan.id);
        return price
          ? [{ id: plan.id, label: durationLabel(plan.accessMonths), intervalMonths: plan.accessMonths, amountMinor: price.amountMinor, currency: price.currency }]
          : [];
      }),
    };
  });
}
