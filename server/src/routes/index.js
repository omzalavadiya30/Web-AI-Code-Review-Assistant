import express from "express";
import authRoutes from "./auth.routes.js";
import reviewRoutes from "./review.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/reviews", reviewRoutes);

export default router;
