import express from "express";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    createFileReviewValidation,
    createSnippetReviewValidation,
} from "../validations/review.validation.js";

const router = express.Router();

router.get("/", authenticate, reviewController.listReviews);
router.post(
    "/snippet",
    authenticate,
    createSnippetReviewValidation,
    reviewController.createSnippetReview
);
router.post(
    "/files",
    authenticate,
    createFileReviewValidation,
    reviewController.createFileReview
);

export default router;
