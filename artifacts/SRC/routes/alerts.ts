import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, alertsTable, areasTable } from "@workspace/db";
import {
  ListAlertsResponse,
  ResolveAlertParams,
  ResolveAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildAlertOut(alert: typeof alertsTable.$inferSelect) {
  const [area] = await db.select().from(areasTable).where(eq(areasTable.id, alert.areaId));
  return {
    id: alert.id,
    areaId: alert.areaId,
    areaName: area?.name ?? "Unknown Area",
    colony: area?.colony ?? "Unknown",
    district: area?.district ?? "Unknown",
    daysSinceCollection: alert.daysSinceCollection,
    severity: alert.severity as "warning" | "critical",
    message: alert.message,
    resolved: alert.resolved,
    createdAt: alert.createdAt.toISOString(),
    resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
  };
}

router.get("/alerts", async (_req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);
  const result = await Promise.all(alerts.map(buildAlertOut));
  res.json(ListAlertsResponse.parse(result));
});

router.patch("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [alert] = await db.update(alertsTable)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  const out = await buildAlertOut(alert);
  res.json(ResolveAlertResponse.parse(out));
});

export default router;
