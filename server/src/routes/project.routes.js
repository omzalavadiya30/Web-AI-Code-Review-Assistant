import express from "express";
import * as projectController from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { createProjectValidation } from "../validations/project.validation.js";

const router = express.Router();

router.get("/", authenticate, projectController.listProjects);
router.post("/", authenticate, createProjectValidation, projectController.createProject);

export default router;
