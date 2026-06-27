import { Router, type IRouter } from "express";
import { db, areasTable, fuelRecordsTable } from "@workspace/db";
import { GetAiInsightsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ai/insights", async (_req, res): Promise<void> => {
  const areas = await db.select().from(areasTable);
  const fuelRecords = await db.select().from(fuelRecordsTable).orderBy(fuelRecordsTable.date);

  const now = Date.now();
  const overdueAreaWarnings = areas
    .map(a => {
      const days = a.lastCollectedAt
        ? Math.floor((now - a.lastCollectedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      return { area: a, days };
    })
    .filter(({ days }) => days > 7)
    .sort((a, b) => b.days - a.days)
    .map(({ area, days }) => {
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      if (days > 21) riskLevel = "critical";
      else if (days > 14) riskLevel = "high";
      else if (days > 10) riskLevel = "medium";

      let recommendation = "Schedule collection within 48 hours.";
      if (riskLevel === "critical") recommendation = "Immediate collection required. Health hazard risk is elevated.";
      else if (riskLevel === "high") recommendation = "Priority collection needed within 24 hours.";
      else if (riskLevel === "medium") recommendation = "Schedule collection within 3 days.";

      return {
        areaName: area.name,
        colony: area.colony,
        daysSinceCollection: days,
        riskLevel,
        recommendation,
      };
    });

  const baseline = 120;
  const byDate = new Map<string, number>();
  for (const r of fuelRecords) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.fuelUsedLiters);
  }
  const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const fuelInsights = sorted.slice(-14).map(([date, total], i, arr) => {
    const saved = Math.max(0, baseline - total);
    const prevSaved = i > 0 ? Math.max(0, baseline - arr[i - 1][1]) : saved;
    const change = Math.round((saved - prevSaved) * 10) / 10;
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (change > 2) trend = "improving";
    else if (change < -2) trend = "worsening";

    const tips = [
      "Consolidate routes in the northern zone to reduce idle time.",
      "Early morning dispatches reduce congestion and save fuel.",
      "Maintain tire pressure weekly for 3-5% better efficiency.",
      "Avoid routes through Ring Road during peak hours.",
      "Group nearby colonies into single truck runs.",
    ];
    const tip = tips[i % tips.length];

    return { date, savedLiters: Math.round(saved * 10) / 10, changeFromPrevDay: change, trend, tip };
  });

  const criticalCount = overdueAreaWarnings.filter(w => w.riskLevel === "critical").length;
  const avgSaved = fuelInsights.length > 0
    ? Math.round(fuelInsights.reduce((s, f) => s + f.savedLiters, 0) / fuelInsights.length * 10) / 10
    : 0;

  const summary = criticalCount > 0
    ? `${criticalCount} area${criticalCount > 1 ? "s" : ""} require immediate collection. Average daily fuel savings of ${avgSaved}L detected this week.`
    : overdueAreaWarnings.length > 0
    ? `${overdueAreaWarnings.length} overdue area${overdueAreaWarnings.length > 1 ? "s" : ""} flagged. Fleet averaging ${avgSaved}L saved per day.`
    : `All areas are within collection schedule. Fleet is performing well with ${avgSaved}L average daily fuel savings.`;

  res.json(GetAiInsightsResponse.parse({
    overdueAreaWarnings,
    fuelInsights,
    summary,
    generatedAt: new Date().toISOString(),
  }));
});

export default router;
