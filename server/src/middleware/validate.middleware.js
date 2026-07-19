import { validationResult } from "express-validator";
import { HTTP_STATUS } from "../config/constants.js";

const formatValidationError = (error) => ({
    msg: error.msg,
    path: error.path || error.param || "body",
});

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        return next();
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors: errors.array({ onlyFirstError: true }).map(formatValidationError),
    });
};
