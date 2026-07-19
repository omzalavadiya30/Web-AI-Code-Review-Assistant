"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestRoute } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { authApi } from "@/lib/auth-api";
import { showApiSuccess } from "@/lib/toast";
import {
  FieldErrors,
  hasErrors,
  validateConfirmPassword,
  validatePassword,
} from "@/lib/validation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const nextErrors: FieldErrors = {
      token: tokenFromUrl ? "" : "Reset link is missing or invalid",
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const validators: Record<string, () => string> = {
      password: () => validatePassword(password),
      confirmPassword: () => validateConfirmPassword(password, confirmPassword),
    };
    setErrors((prev) => ({ ...prev, [field]: validators[field]() }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword({ token: tokenFromUrl, password });
      showApiSuccess(response.message);
      setSuccess(true);
    } catch {
      // API error toast shown centrally in api.ts
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        title="Password reset!"
        subtitle="Your password has been updated successfully"
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-sm text-zinc-400">
            You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button className="w-full" size="lg">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password from your email reset link"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {!tokenFromUrl && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100 ring-1 ring-amber-500/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This reset link is missing a token. Request a new reset email and
              open the link from your inbox.
            </p>
          </div>
        )}

        <PasswordInput
          id="password"
          label="New Password"
          placeholder="Min. 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            if (errors.confirmPassword && confirmPassword) {
              setErrors((prev) => ({
                ...prev,
                confirmPassword: validateConfirmPassword(e.target.value, confirmPassword),
              }));
            }
          }}
          onBlur={() => handleBlur("password")}
          error={errors.password}
          icon={<Lock className="h-4 w-4" />}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm New Password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
          }}
          onBlur={() => handleBlur("confirmPassword")}
          error={errors.confirmPassword}
          icon={<Lock className="h-4 w-4" />}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          disabled={!tokenFromUrl}
        >
          Reset Password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <GuestRoute>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </GuestRoute>
  );
}
