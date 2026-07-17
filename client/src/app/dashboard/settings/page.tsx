"use client";

import { FormEvent, useState } from "react";
import { Calendar, Lock, Mail, Save, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import {
  FieldErrors,
  hasErrors,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePassword,
} from "@/lib/validation";

type ProfileDraft = {
  name: string;
  email: string;
};

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();

  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  const name = profileDraft?.name ?? user?.name ?? "";
  const email = profileDraft?.email ?? user?.email ?? "";

  const updateProfileField = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((prev) => ({
      name: prev?.name ?? user?.name ?? "",
      email: prev?.email ?? user?.email ?? "",
      [field]: value,
    }));
  };

  const validateProfileForm = () => {
    const nextErrors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
    };
    setProfileErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const validatePasswordForm = () => {
    const nextErrors: FieldErrors = {
      currentPassword: validatePassword(currentPassword),
      newPassword: validateNewPassword(currentPassword, newPassword),
      confirmPassword: validateConfirmPassword(newPassword, confirmPassword),
    };
    setPasswordErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleProfileBlur = (field: keyof FieldErrors) => {
    const validators: Record<string, () => string> = {
      name: () => validateName(name),
      email: () => validateEmail(email),
    };
    setProfileErrors((prev) => ({ ...prev, [field]: validators[field]() }));
  };

  const handlePasswordBlur = (field: keyof FieldErrors) => {
    const validators: Record<string, () => string> = {
      currentPassword: () => validatePassword(currentPassword),
      newPassword: () => validateNewPassword(currentPassword, newPassword),
      confirmPassword: () => validateConfirmPassword(newPassword, confirmPassword),
    };
    setPasswordErrors((prev) => ({ ...prev, [field]: validators[field]() }));
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateProfileForm()) return;

    setProfileLoading(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setProfileDraft(null);
    } catch {
      // API error toast shown centrally in api.ts
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    } catch {
      // API error toast shown centrally in api.ts
    } finally {
      setPasswordLoading(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-indigo-300">Settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Account settings</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Manage your personal information and account security inside the dashboard.
        </p>
      </section>

      <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-2xl font-bold text-white">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{user?.name}</h2>
          <p className="truncate text-zinc-400">{user?.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            Member since {memberSince}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5 text-indigo-300" />
            Personal Information
          </h3>

          <form onSubmit={handleProfileSubmit} className="space-y-5" noValidate>
            <Input
              id="profile-name"
              label="Full Name"
              value={name}
              onChange={(event) => {
                updateProfileField("name", event.target.value);
                if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: "" }));
              }}
              onBlur={() => handleProfileBlur("name")}
              error={profileErrors.name}
              icon={<User className="h-4 w-4" />}
            />

            <Input
              id="profile-email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => {
                updateProfileField("email", event.target.value);
                if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: "" }));
              }}
              onBlur={() => handleProfileBlur("email")}
              error={profileErrors.email}
              icon={<Mail className="h-4 w-4" />}
            />

            <Button type="submit" isLoading={profileLoading}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </form>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <Lock className="h-5 w-5 text-indigo-300" />
            Change Password
          </h3>

          <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
            <PasswordInput
              id="current-password"
              label="Current Password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                if (passwordErrors.currentPassword) {
                  setPasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
                }
              }}
              onBlur={() => handlePasswordBlur("currentPassword")}
              error={passwordErrors.currentPassword}
              icon={<Lock className="h-4 w-4" />}
            />

            <PasswordInput
              id="new-password"
              label="New Password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (passwordErrors.newPassword) {
                  setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                }
                if (passwordErrors.confirmPassword && confirmPassword) {
                  setPasswordErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(event.target.value, confirmPassword),
                  }));
                }
              }}
              onBlur={() => handlePasswordBlur("newPassword")}
              error={passwordErrors.newPassword}
              icon={<Lock className="h-4 w-4" />}
            />

            <PasswordInput
              id="confirm-new-password"
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
              onBlur={() => handlePasswordBlur("confirmPassword")}
              error={passwordErrors.confirmPassword}
              icon={<Lock className="h-4 w-4" />}
            />

            <Button type="submit" variant="secondary" isLoading={passwordLoading}>
              Update Password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
