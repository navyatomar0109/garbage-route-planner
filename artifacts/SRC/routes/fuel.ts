import { Router, type IRouter } from "express";
import { db, fuelRecordsTable, trucksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListFuelRecordsResponse,
  CreateFuelRecordBody,
  CreateFuelRecordResponse,
  GetFuelSavingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/fuel/records", async (_req, res): Promise<void> => {
  const records = await db.select().from(fuelRecordsTable).orderBy(fuelRecordsTable.date);
  const trucks = await db.select().from(trucksTable);
  const truckMap = new Map(trucks.map(t => [t.id, t.plateNumber]));
  const efficiency = (r: typeof fuelRecordsTable.$inferSelect) =>
    r.distanceKm > 0 ? Math.round((r.distanceKm / r.fuelUsedLiters) * 10) / 10 : 0;
  const result = records.map(r => ({
    id: r.id,
    truckId: r.truckId,
    truckPlate: truckMap.get(r.truckId) ?? "Unknown",
    date: r.date,
    fuelUsedLiters: r.fuelUsedLiters,
    distanceKm: r.distanceKm,
    efficiency: efficiency(r),
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(ListFuelRecordsResponse.parse(result));
});

router.post("/fuel/records", async (req, res): Promise<void> => {
  const parsed = CreateFuelRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [record] = await db.insert(fuelRecordsTable).values(parsed.data).returning();
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, record.truckId));
  const efficiency = record.distanceKm > 0 ? Math.round((record.distanceKm / record.fuelUsedLiters) * 10) / 10 : 0;
  res.status(201).json(CreateFuelRecordResponse.parse({
    id: record.id,
    truckId: record.truckId,
    truckPlate: truck?.plateNumber ?? "Unknown",
    date: record.date,
    fuelUsedLiters: record.fuelUsedLiters,
    distanceKm: record.distanceKm,
    efficiency,
    createdAt: record.createdAt.toISOString(),
  }));
});

router.get("/fuel/savings", async (_req, res): Promise<void> => {
  const records = await db.select().from(fuelRecordsTable).orderBy(fuelRecordsTable.date);

  const byDate = new Map<string, number>();
  for (const r of records) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.fuelUsedLiters);
  }

  const baseline = 120;
  const days: { date: string; totalFuelUsed: number; baseline: number; saved: number; savingsPercent: number }[] = [];
  const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [date, total] of sorted) {
    const saved = Math.max(0, baseline - total);
    days.push({
      date,
      totalFuelUsed: Math.round(total * 10) / 10,
      baseline,
      saved: Math.round(saved * 10) / 10,
      savingsPercent: Math.round((saved / baseline) * 1000) / 10,
    });
  }

  res.json(GetFuelSavingsResponse.parse(days));
});

export default router;
