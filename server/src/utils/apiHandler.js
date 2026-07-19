import { HTTP_STATUS, NODE_ENV } from "../config/constants.js";

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const successResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({ success: true, message, data });
};

const getErrorStatusCode = (err) => {
    if (Number.isInteger(err.statusCode)) return err.statusCode;
    if (Number.isInteger(err.status)) return err.status;
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
};

const normalizeError = (err) => {
    if (err.type === "entity.parse.failed") {
        return {
            statusCode: HTTP_STATUS.BAD_REQUEST,
            message: "Malformed JSON request body",
            isOperational: true,
        };
    }

    if (err.type === "entity.too.large") {
        return {
            statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
            message: "Request payload is too large",
            isOperational: true,
        };
    }

    if (err.code === "23505") {
        return {
            statusCode: HTTP_STATUS.CONFLICT,
            message: "A record with this value already exists",
            isOperational: true,
        };
    }

    if (err.code === "22P02") {
        return {
            statusCode: HTTP_STATUS.BAD_REQUEST,
            message: "Invalid request value",
            isOperational: true,
        };
    }

    return {
        statusCode: getErrorStatusCode(err),
        message: err.message || "Internal Server Error",
        isOperational: Boolean(err.isOperational),
        errors: err.errors,
    };
};

export const errorMiddleware = (err, _req, res, _next) => {
    const normalized = normalizeError(err);
    const isServerError = normalized.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message =
        isServerError && !normalized.isOperational
            ? "Internal Server Error"
            : normalized.message;
    const payload = {
        success: false,
        message,
    };

    if (Array.isArray(normalized.errors)) {
        payload.errors = normalized.errors;
    }

    if (NODE_ENV !== "production" && isServerError && err.stack) {
        payload.stack = err.stack;
    }

    res.status(normalized.statusCode).json(payload);
};

export const notFound = (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
};
