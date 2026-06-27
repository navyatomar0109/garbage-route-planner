import { Router, type IRouter } from "express";
import { db, routesTable, areasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListRoutesResponse,
  CreateRouteBody,
  CreateRouteResponse,
  OptimizeRouteBody,
  OptimizeRouteResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Waypoint = { lat: number; lng: number; areaName?: string | null };

function toRouteOut(r: typeof routesTable.$inferSelect, startAreaName: string, endAreaName: string) {
  return {
    id: r.id,
    name: r.name,
    startAreaId: r.startAreaId,
    endAreaId: r.endAreaId,
    startAreaName,
    endAreaName,
    waypoints: (r.waypoints as Waypoint[]) || [],
    distanceKm: r.distanceKm,
    estimatedMinutes: r.estimatedMinutes,
    fuelEstimateLiters: r.fuelEstimateLiters,
    truckId: r.truckId ?? null,
    date: r.date ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/routes", async (_req, res): Promise<void> => {
  const routes = await db.select().from(routesTable).orderBy(routesTable.createdAt);
  const areas = await db.select().from(areasTable);
  const areaMap = new Map(areas.map(a => [a.id, a.name]));
  const result = routes.map(r => toRouteOut(r, areaMap.get(r.startAreaId) ?? "Unknown", areaMap.get(r.endAreaId) ?? "Unknown"));
  res.json(ListRoutesResponse.parse(result));
});

router.post("/routes", async (req, res): Promise<void> => {
  const parsed = CreateRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const areas = await db.select().from(areasTable);
  const areaMap = new Map(areas.map(a => [a.id, a]));
  const startArea = areaMap.get(parsed.data.startAreaId);
  const endArea = areaMap.get(parsed.data.endAreaId);
  if (!startArea || !endArea) {
    res.status(404).json({ error: "Area not found" });
    return;
  }
  const dist = Math.sqrt(Math.pow(endArea.lat - startArea.lat, 2) + Math.pow(endArea.lng - startArea.lng, 2)) * 111;
  const waypoints: Waypoint[] = [
    { lat: startArea.lat, lng: startArea.lng, areaName: startArea.name },
    { lat: endArea.lat, lng: endArea.lng, areaName: endArea.name },
  ];
  const [route] = await db.insert(routesTable).values({
    name: parsed.data.name,
    startAreaId: parsed.data.startAreaId,
    endAreaId: parsed.data.endAreaId,
    waypoints,
    distanceKm: Math.round(dist * 10) / 10,
    estimatedMinutes: Math.round(dist * 4),
    fuelEstimateLiters: Math.round(dist * 0.12 * 10) / 10,
    truckId: parsed.data.truckId ?? null,
    date: parsed.data.date ?? null,
  }).returning();
  res.status(201).json(CreateRouteResponse.parse(toRouteOut(route, startArea.name, endArea.name)));
});

router.post("/routes/optimize", async (req, res): Promise<void> => {
  const parsed = OptimizeRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const areas = await db.select().from(areasTable);
  const areaMap = new Map(areas.map(a => [a.id, a]));
  const startArea = areaMap.get(parsed.data.startAreaId);
  const endArea = areaMap.get(parsed.data.endAreaId);
  if (!startArea || !endArea) {
    res.status(404).json({ error: "Area not found" });
    return;
  }

  const baseDist = Math.sqrt(Math.pow(endArea.lat - startArea.lat, 2) + Math.pow(endArea.lng - startArea.lng, 2)) * 111;
  const midLat = (startArea.lat + endArea.lat) / 2;
  const midLng = (startArea.lng + endArea.lng) / 2;

  const routeOptions = [
    {
      id: "route-a",
      label: "Direct Route",
      waypoints: [
        { lat: startArea.lat, lng: startArea.lng, areaName: startArea.name },
        { lat: endArea.lat, lng: endArea.lng, areaName: endArea.name },
      ],
      distanceKm: Math.round(baseDist * 10) / 10,
      estimatedMinutes: Math.round(baseDist * 4),
      fuelEstimateLiters: Math.round(baseDist * 0.12 * 10) / 10,
      areasServed: [startArea.name, endArea.name],
      recommended: true,
    },
    {
      id: "route-b",
      label: "Via Central Delhi",
      waypoints: [
        { lat: startArea.lat, lng: startArea.lng, areaName: startArea.name },
        { lat: 28.6448, lng: 77.2167, areaName: "Connaught Place" },
        { lat: midLat, lng: midLng, areaName: null },
        { lat: endArea.lat, lng: endArea.lng, areaName: endArea.name },
      ],
      distanceKm: Math.round(baseDist * 1.3 * 10) / 10,
      estimatedMinutes: Math.round(baseDist * 1.3 * 4),
      fuelEstimateLiters: Math.round(baseDist * 1.3 * 0.12 * 10) / 10,
      areasServed: [startArea.name, "Connaught Place", endArea.name],
      recommended: false,
    },
    {
      id: "route-c",
      label: "Extended Coverage",
      waypoints: [
        { lat: startArea.lat, lng: startArea.lng, areaName: startArea.name },
        { lat: startArea.lat + 0.01, lng: startArea.lng + 0.01, areaName: null },
        { lat: midLat + 0.005, lng: midLng - 0.005, areaName: null },
        { lat: endArea.lat - 0.01, lng: endArea.lng + 0.01, areaName: null },
        { lat: endArea.lat, lng: endArea.lng, areaName: endArea.name },
      ],
      distanceKm: Math.round(baseDist * 1.6 * 10) / 10,
      estimatedMinutes: Math.round(baseDist * 1.6 * 4),
      fuelEstimateLiters: Math.round(baseDist * 1.6 * 0.12 * 10) / 10,
      areasServed: [startArea.name, endArea.name, "Additional Colonies"],
      recommended: false,
    },
  ];

  res.json(OptimizeRouteResponse.parse({ routes: routeOptions }));
});

export default router;
