import { body, validationResult } from "express-validator";

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
    }
    next();
};

export const createProjectValidation = [
    body("projectName")
        .isString()
        .withMessage("Project name is required")
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Project name must be between 2 and 255 characters"),
    handleValidation,
];
