import express from "express";
import authRoutes from "./auth.routes.js";
import projectRoutes from "./project.routes.js";
import reviewRoutes from "./review.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/reviews", reviewRoutes);

export default router;
