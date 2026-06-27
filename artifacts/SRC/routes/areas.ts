import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, areasTable } from "@workspace/db";
import {
  ListAreasResponse,
  GetAreaParams,
  GetAreaResponse,
  UpdateAreaParams,
  UpdateAreaBody,
  UpdateAreaResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

router.get("/areas", async (_req, res): Promise<void> => {
  const areas = await db.select().from(areasTable).orderBy(areasTable.id);
  const result = areas.map(a => {
    const days = daysSince(a.lastCollectedAt);
    return {
      ...a,
      lastCollectedAt: a.lastCollectedAt ? a.lastCollectedAt.toISOString() : null,
      daysSinceCollection: days,
      isOverdue: days !== null ? days > 7 : true,
      assignedTruckId: a.assignedTruckId ?? null,
      createdAt: a.createdAt.toISOString(),
    };
  });
  res.json(ListAreasResponse.parse(result));
});

router.get("/areas/:id", async (req, res): Promise<void> => {
  const params = GetAreaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [area] = await db.select().from(areasTable).where(eq(areasTable.id, id));
  if (!area) {
    res.status(404).json({ error: "Area not found" });
    return;
  }
  const days = daysSince(area.lastCollectedAt);
  res.json(GetAreaResponse.parse({
    ...area,
    lastCollectedAt: area.lastCollectedAt ? area.lastCollectedAt.toISOString() : null,
    daysSinceCollection: days,
    isOverdue: days !== null ? days > 7 : true,
    assignedTruckId: area.assignedTruckId ?? null,
    createdAt: area.createdAt.toISOString(),
  }));
});

router.patch("/areas/:id", async (req, res): Promise<void> => {
  const params = UpdateAreaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAreaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.lastCollectedAt) {
    updateData.lastCollectedAt = new Date(parsed.data.lastCollectedAt);
  }
  const [area] = await db.update(areasTable).set(updateData).where(eq(areasTable.id, id)).returning();
  if (!area) {
    res.status(404).json({ error: "Area not found" });
    return;
  }
  const days = daysSince(area.lastCollectedAt);
  res.json(UpdateAreaResponse.parse({
    ...area,
    lastCollectedAt: area.lastCollectedAt ? area.lastCollectedAt.toISOString() : null,
    daysSinceCollection: days,
    isOverdue: days !== null ? days > 7 : true,
    assignedTruckId: area.assignedTruckId ?? null,
    createdAt: area.createdAt.toISOString(),
  }));
});

export default router;
