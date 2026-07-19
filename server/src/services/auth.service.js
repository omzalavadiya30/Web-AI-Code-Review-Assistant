import crypto from "crypto";
import * as authRepository from "../repositories/auth.repository.js";
import { AppError } from "../utils/apiHandler.js";
import { HTTP_STATUS } from "../config/constants.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "./email.service.js";

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
});

export const register = async ({ name, email, password }) => {
    const existingUser = await authRepository.findUserByEmail(email);

    if (existingUser) {
        throw new AppError("User with this email already exists", HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await hashPassword(password);
    const user = await authRepository.createUser({
        name,
        email,
        password: hashedPassword,
    });

    const token = generateToken({ id: user.id, email: user.email });

    return { user: sanitizeUser(user), token };
};

export const login = async ({ email, password }) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
        throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
    }

    const token = generateToken({ id: user.id, email: user.email });

    return { user: sanitizeUser(user), token };
};

export const getProfile = async (userId) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    return user;
};

export const updateProfile = async (userId, { name, email }) => {
    const updates = {};

    if (name) updates.name = name;

    if (email) {
        const existingUser = await authRepository.findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            throw new AppError("Email is already in use", HTTP_STATUS.CONFLICT);
        }
        updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
        throw new AppError("No valid fields to update", HTTP_STATUS.BAD_REQUEST);
    }

    return authRepository.updateUser(userId, updates);
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await authRepository.findUserWithPasswordById(userId);

    if (!user) {
        throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
        throw new AppError("Current password is incorrect", HTTP_STATUS.UNAUTHORIZED);
    }

    const hashedPassword = await hashPassword(newPassword);
    await authRepository.updateUser(userId, { password: hashedPassword });

    return { message: "Password updated successfully" };
};

export const forgotPassword = async (email) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
        return { message: "If that email exists, a reset link has been sent" };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await authRepository.updateUser(user.id, {
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires,
    });

    await sendPasswordResetEmail({
        to: user.email,
        token: resetToken,
    });

    return {
        message: "If that email exists, a reset link has been sent",
    };
};

export const resetPassword = async ({ token, password }) => {
    const user = await authRepository.findUserByResetToken(token);

    if (!user || !user.reset_token_expires) {
        throw new AppError("Invalid or expired reset token", HTTP_STATUS.BAD_REQUEST);
    }

    if (new Date(user.reset_token_expires) < new Date()) {
        throw new AppError("Reset token has expired", HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(password);

    await authRepository.updateUser(user.id, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
    });

    return { message: "Password reset successfully" };
};
