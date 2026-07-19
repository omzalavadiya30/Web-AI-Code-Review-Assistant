import * as authService from "../services/auth.service.js";
import { asyncHandler, successResponse } from "../utils/apiHandler.js";
import { HTTP_STATUS } from "../config/constants.js";

export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    successResponse(res, HTTP_STATUS.CREATED, "User registered successfully", result);
});

export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    successResponse(res, HTTP_STATUS.OK, "Login successful", result);
});

export const logout = asyncHandler(async (_req, res) => {
    successResponse(res, HTTP_STATUS.OK, "Logout successful");
});

export const getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);
    successResponse(res, HTTP_STATUS.OK, "Profile fetched successfully", user);
});

export const updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);
    successResponse(res, HTTP_STATUS.OK, "Profile updated successfully", user);
});

export const changePassword = asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body);
    successResponse(res, HTTP_STATUS.OK, result.message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    successResponse(res, HTTP_STATUS.OK, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    successResponse(res, HTTP_STATUS.OK, result.message);
});
