import { body } from "express-validator";
import { validateRequest } from "../middleware/validate.middleware.js";

export const createProjectValidation = [
    body("projectName")
        .isString()
        .withMessage("Project name is required")
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Project name must be between 2 and 255 characters"),
    body("githubUrl")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("GitHub URL must be text")
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage("GitHub URL must be 500 characters or fewer")
        .bail()
        .isURL({ protocols: ["http", "https"], require_protocol: true })
        .withMessage("GitHub URL must be a valid http or https URL"),
    validateRequest,
];
