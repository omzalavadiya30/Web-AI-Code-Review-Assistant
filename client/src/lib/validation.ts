export interface FieldErrors {
  [key: string]: string;
}

export const validateEmail = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return "Enter a valid email address";
  return "";
};

export const validateName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required";
  else if (trimmed.length < 2) return "Name must be at least 2 characters";
  else if (/^\d+$/.test(trimmed)) return "Name cannot be only numbers";
  return "";
};

export const validatePassword = (password: string): string => {
  if (!password) return "Password is required";
  else if (password.length < 6) return "Password must be at least 6 characters";
  else if (password.length > 128) return "Password must be less than 128 characters";
  return "";
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): string => {
  if (!confirmPassword) return "Please confirm your password";
  else if (password !== confirmPassword) return "Passwords do not match";
  return "";
};

export const validateNewPassword = (
  currentPassword: string,
  newPassword: string
): string => {
  const baseError = validatePassword(newPassword);
  if (baseError) return baseError;
  else if (currentPassword && newPassword === currentPassword) {
    return "New password must be different from current password";
  }
  return "";
};

export const validateRequired = (value: string, fieldName: string): string => {
  if (!value.trim()) return `${fieldName} is required`;
  return "";
};

export const hasErrors = (errors: FieldErrors): boolean =>
  Object.values(errors).some((msg) => msg !== "");
