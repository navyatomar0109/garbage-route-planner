import { Router, type IRouter } from "express";
import { db, trucksTable, areasTable, alertsTable, fuelRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const trucks = await db.select().from(trucksTable);
  const areas = await db.select().from(areasTable);
  const alerts = await db.select().from(alertsTable).where(eq(alertsTable.resolved, false));
  const todayStr = new Date().toISOString().split("T")[0];
  const fuelToday = await db.select().from(fuelRecordsTable).where(eq(fuelRecordsTable.date, todayStr));

  const activeTrucks = trucks.filter(t => t.status === "active").length;
  const now = Date.now();
  const overdueAreas = areas.filter(a => {
    if (!a.lastCollectedAt) return true;
    const diff = now - a.lastCollectedAt.getTime();
    return diff > 7 * 24 * 60 * 60 * 1000;
  });
  const collectedToday = areas.filter(a => {
    if (!a.lastCollectedAt) return false;
    return a.lastCollectedAt.toISOString().startsWith(todayStr);
  }).length;

  const baseline = 120;
  const totalFuelToday = fuelToday.reduce((s, r) => s + r.fuelUsedLiters, 0);
  const fuelSavedToday = Math.max(0, baseline - totalFuelToday);

  const fuelAllRecords = await db.select().from(fuelRecordsTable);
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekRecords = fuelAllRecords.filter(r => new Date(r.date) >= weekStart);
  const totalWeekFuel = weekRecords.reduce((s, r) => s + r.fuelUsedLiters, 0);
  const totalFuelSavedWeek = Math.max(0, baseline * 7 - totalWeekFuel);

  const collectionRate = areas.length > 0
    ? Math.round(((areas.length - overdueAreas.length) / areas.length) * 1000) / 10
    : 100;

  res.json(GetDashboardSummaryResponse.parse({
    totalTrucks: trucks.length,
    activeTrucks,
    totalAreas: areas.length,
    collectedToday,
    overdueAreas: overdueAreas.length,
    alertCount: alerts.length,
    fuelSavedToday: Math.round(fuelSavedToday * 10) / 10,
    totalFuelSavedWeek: Math.round(totalFuelSavedWeek * 10) / 10,
    collectionRate,
  }));
});

export default router;
