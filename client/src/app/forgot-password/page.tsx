"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestRoute } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/auth-api";
import { showApiSuccess } from "@/lib/toast";
import { FieldErrors, hasErrors, validateEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [resetToken, setResetToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const nextErrors: FieldErrors = { email: validateEmail(email) };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setResetToken("");
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email.trim());
      showApiSuccess(response.message);
      if (response.data?.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch {
      // API error toast shown centrally in api.ts
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GuestRoute>
      <AuthShell
        title="Forgot password?"
        subtitle="Enter your email and we'll send you a reset link"
        footer={
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            onBlur={() => setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
            error={errors.email}
            icon={<Mail className="h-4 w-4" />}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Send Reset Link
          </Button>

          {resetToken && (
            <Link href={`/reset-password?token=${resetToken}`}>
              <Button variant="secondary" className="w-full">
                Go to Reset Password
              </Button>
            </Link>
          )}
        </form>
      </AuthShell>
    </GuestRoute>
  );
}
