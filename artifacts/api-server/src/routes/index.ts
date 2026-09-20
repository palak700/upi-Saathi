import { Router, type IRouter } from "express";
import healthRouter from "./health";
import upiSaathiRouter from "./upi-saathi";

const router: IRouter = Router();

router.use(healthRouter);
router.use(upiSaathiRouter);

export default router;
