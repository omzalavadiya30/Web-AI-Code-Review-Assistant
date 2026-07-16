"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestRoute } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { authApi } from "@/lib/auth-api";
import { showApiSuccess } from "@/lib/toast";
import {
  FieldErrors,
  hasErrors,
  validateConfirmPassword,
  validatePassword,
  validateRequired,
} from "@/lib/validation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const nextErrors: FieldErrors = {
      token: validateRequired(token, "Reset token"),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const validators: Record<string, () => string> = {
      token: () => validateRequired(token, "Reset token"),
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
      const response = await authApi.resetPassword({ token: token.trim(), password });
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
      subtitle="Enter your reset token and choose a new password"
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
          id="token"
          label="Reset Token"
          type="text"
          placeholder="Paste your reset token"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            if (errors.token) setErrors((prev) => ({ ...prev, token: "" }));
          }}
          onBlur={() => handleBlur("token")}
          error={errors.token}
        />

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

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
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
