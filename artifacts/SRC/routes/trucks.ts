import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, trucksTable } from "@workspace/db";
import {
  ListTrucksResponse,
  CreateTruckBody,
  CreateTruckResponse,
  GetTruckParams,
  GetTruckResponse,
  UpdateTruckParams,
  UpdateTruckBody,
  UpdateTruckResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/trucks", async (_req, res): Promise<void> => {
  const trucks = await db.select().from(trucksTable).orderBy(trucksTable.id);
  res.json(ListTrucksResponse.parse(trucks.map(t => ({
    ...t,
    lastServiceDate: t.lastServiceDate ?? undefined,
    currentAreaId: t.currentAreaId ?? undefined,
    createdAt: t.createdAt.toISOString(),
  }))));
});

router.post("/trucks", async (req, res): Promise<void> => {
  const parsed = CreateTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [truck] = await db.insert(trucksTable).values(parsed.data).returning();
  res.status(201).json(CreateTruckResponse.parse({
    ...truck,
    currentAreaId: truck.currentAreaId ?? undefined,
    lastServiceDate: truck.lastServiceDate ?? undefined,
    createdAt: truck.createdAt.toISOString(),
  }));
});

router.get("/trucks/:id", async (req, res): Promise<void> => {
  const params = GetTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, id));
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }
  res.json(GetTruckResponse.parse({
    ...truck,
    currentAreaId: truck.currentAreaId ?? undefined,
    lastServiceDate: truck.lastServiceDate ?? undefined,
    createdAt: truck.createdAt.toISOString(),
  }));
});

router.patch("/trucks/:id", async (req, res): Promise<void> => {
  const params = UpdateTruckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [truck] = await db.update(trucksTable).set(parsed.data).where(eq(trucksTable.id, id)).returning();
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }
  res.json(UpdateTruckResponse.parse({
    ...truck,
    currentAreaId: truck.currentAreaId ?? undefined,
    lastServiceDate: truck.lastServiceDate ?? undefined,
    createdAt: truck.createdAt.toISOString(),
  }));
});

export default router;
