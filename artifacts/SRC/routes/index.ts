import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trucksRouter from "./trucks";
import areasRouter from "./areas";
import wasteRoutesRouter from "./wasteRoutes";
import alertsRouter from "./alerts";
import fuelRouter from "./fuel";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trucksRouter);
router.use(areasRouter);
router.use(wasteRoutesRouter);
router.use(alertsRouter);
router.use(fuelRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
