import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradfiRouter from "./tradfi";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradfiRouter);

export default router;
