import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradfiRouter from "./tradfi";
import pushRouter from "./push";
import cryptoRouter from "./crypto";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradfiRouter);
router.use(pushRouter);
router.use(cryptoRouter);

export default router;
