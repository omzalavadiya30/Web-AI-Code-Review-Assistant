import jwt from "jsonwebtoken";
import { HTTP_STATUS, JWT_EXPIRES_IN, JWT_SECRET } from "../config/constants.js";
import { AppError } from "./apiHandler.js";

const assertJwtSecret = () => {
    if (!JWT_SECRET) {
        throw new AppError(
            "JWT_SECRET is not configured on the server",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const generateToken = (payload) => {
    assertJwtSecret();
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
    assertJwtSecret();
    return jwt.verify(token, JWT_SECRET);
};
