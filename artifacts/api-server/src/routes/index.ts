import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradfiRouter from "./tradfi";
import pushRouter from "./push";
import cryptoRouter from "./crypto";
import adminRouter from "./admin";
import portfolioRouter from "./portfolio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradfiRouter);
router.use(pushRouter);
router.use(cryptoRouter);
router.use(adminRouter);
router.use(portfolioRouter);

export default router;
