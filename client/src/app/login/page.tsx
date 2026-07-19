"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestRoute } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { FieldErrors, hasErrors, validateEmail, validatePassword } from "@/lib/validation";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const validators: Record<string, () => string> = {
      email: () => validateEmail(email),
      password: () => validatePassword(password),
    };
    setErrors((prev) => ({ ...prev, [field]: validators[field]() }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch {
      // API error toast shown centrally in api.ts
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GuestRoute>
      <AuthShell
        title="Welcome back"
        subtitle="Sign in to access your code reviews and dashboard"
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
              Create one
            </Link>
          </>
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
            onBlur={() => handleBlur("email")}
            error={errors.email}
            icon={<Mail className="h-4 w-4" />}
          />

          <PasswordInput
            id="password"
            label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            }}
            onBlur={() => handleBlur("password")}
            error={errors.password}
            icon={<Lock className="h-4 w-4" />}
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </AuthShell>
    </GuestRoute>
  );
}
