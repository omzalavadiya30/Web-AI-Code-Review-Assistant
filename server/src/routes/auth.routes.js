import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
} from "../validations/auth.validation.js";

const router = express.Router();

router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);
router.post("/logout", authenticate, authController.logout);
router.post("/forgot-password", forgotPasswordValidation, authController.forgotPassword);
router.post("/reset-password", resetPasswordValidation, authController.resetPassword);

router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, updateProfileValidation, authController.updateProfile);
router.put("/change-password", authenticate, changePasswordValidation, authController.changePassword);

export default router;
