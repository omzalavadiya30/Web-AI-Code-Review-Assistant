import { Resend } from "resend";
import {
    CLIENT_URL,
    HTTP_STATUS,
    RESEND_API_KEY,
    RESEND_FROM_EMAIL,
} from "../config/constants.js";
import { AppError } from "../utils/apiHandler.js";

let resendClient;

const getResendClient = () => {
    if (!RESEND_API_KEY) {
        throw new AppError("Password reset email is not configured", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    if (!resendClient) {
        resendClient = new Resend(RESEND_API_KEY);
    }

    return resendClient;
};

const buildResetPasswordUrl = (token) => {
    const resetUrl = new URL("/reset-password", CLIENT_URL);
    resetUrl.searchParams.set("token", token);
    return resetUrl.toString();
};

export const sendPasswordResetEmail = async ({ to, token }) => {
    const resetUrl = buildResetPasswordUrl(token);
    const { error } = await getResendClient().emails.send({
        from: RESEND_FROM_EMAIL,
        to,
        subject: "Reset your CodeReview AI password",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
                <h2>Reset your password</h2>
                <p>We received a request to reset your CodeReview AI password.</p>
                <p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none;">
                        Reset password
                    </a>
                </p>
                <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
                <p>If the button does not work, copy and paste this URL into your browser:</p>
                <p style="word-break: break-all;">${resetUrl}</p>
            </div>
        `,
        text: [
            "Reset your CodeReview AI password",
            "",
            "Use this link to choose a new password:",
            resetUrl,
            "",
            "This link expires in 1 hour. If you did not request this, you can ignore this email.",
        ].join("\n"),
    });

    if (error) {
        throw new AppError(
            error.message || "Failed to send password reset email",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};
