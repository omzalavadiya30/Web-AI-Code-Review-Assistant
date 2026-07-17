import { HTTP_STATUS } from "../config/constants.js";
import * as reviewService from "../services/review.service.js";
import { asyncHandler, successResponse } from "../utils/apiHandler.js";

export const createSnippetReview = asyncHandler(async (req, res) => {
    const result = await reviewService.createSnippetReview(req.user.id, req.body);
    successResponse(res, HTTP_STATUS.CREATED, "Code snippet uploaded successfully", result);
});

export const createFileReview = asyncHandler(async (req, res) => {
    const result = await reviewService.createFileReview(req.user.id, req.body);
    successResponse(res, HTTP_STATUS.CREATED, "Source files uploaded successfully", result);
});

export const listReviews = asyncHandler(async (req, res) => {
    const reviews = await reviewService.listReviews(req.user.id);
    successResponse(res, HTTP_STATUS.OK, "Reviews fetched successfully", reviews);
});
