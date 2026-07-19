import { body } from "express-validator";
import { validateRequest } from "../middleware/validate.middleware.js";

export const registerValidation = [
    body("name")
        .isString()
        .withMessage("Name is required")
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Name must be between 2 and 255 characters")
        .bail()
        .custom((value) => !/^\d+$/.test(value))
        .withMessage("Name cannot be only numbers"),
    body("email").isEmail().withMessage("Invalid email address").bail().normalizeEmail(),
    body("password")
        .isString()
        .withMessage("Password is required")
        .bail()
        .isLength({ min: 6, max: 128 })
        .withMessage("Password must be between 6 and 128 characters long"),
    validateRequest,
];

export const loginValidation = [
    body("email").isEmail().withMessage("Invalid email address").bail().normalizeEmail(),
    body("password")
        .isString()
        .withMessage("Password is required")
        .bail()
        .notEmpty()
        .withMessage("Password is required"),
    validateRequest,
];

export const updateProfileValidation = [
    body("name")
        .optional()
        .isString()
        .withMessage("Name must be text")
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Name must be between 2 and 255 characters")
        .bail()
        .custom((value) => !/^\d+$/.test(value))
        .withMessage("Name cannot be only numbers"),
    body("email").optional().isEmail().withMessage("Invalid email address").bail().normalizeEmail(),
    validateRequest,
];

export const changePasswordValidation = [
    body("currentPassword")
        .isString()
        .withMessage("Current password is required")
        .bail()
        .notEmpty()
        .withMessage("Current password is required"),
    body("newPassword")
        .isString()
        .withMessage("New password is required")
        .bail()
        .isLength({ min: 6, max: 128 })
        .withMessage("New password must be between 6 and 128 characters long")
        .bail()
        .custom((value, { req }) => value !== req.body.currentPassword)
        .withMessage("New password must be different from current password"),
    validateRequest,
];

export const forgotPasswordValidation = [
    body("email").isEmail().withMessage("Invalid email address").bail().normalizeEmail(),
    validateRequest,
];

export const resetPasswordValidation = [
    body("token")
        .isString()
        .withMessage("Reset token is required")
        .bail()
        .notEmpty()
        .withMessage("Reset token is required"),
    body("password")
        .isString()
        .withMessage("Password is required")
        .bail()
        .isLength({ min: 6, max: 128 })
        .withMessage("Password must be between 6 and 128 characters long"),
    validateRequest,
];
