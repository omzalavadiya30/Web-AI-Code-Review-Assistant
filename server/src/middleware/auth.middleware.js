import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/apiHandler.js";
import { HTTP_STATUS } from "../config/constants.js";

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("Access denied. No token provided", HTTP_STATUS.UNAUTHORIZED));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch {
        next(new AppError("Invalid or expired token", HTTP_STATUS.UNAUTHORIZED));
    }
};
