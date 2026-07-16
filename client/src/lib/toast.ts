import toast from "react-hot-toast";
import { ApiError } from "./api";

const toastStyle = {
  style: {
    background: "#18181b",
    color: "#f4f4f5",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "14px",
  },
  success: {
    iconTheme: { primary: "#34d399", secondary: "#18181b" },
  },
  error: {
    iconTheme: { primary: "#f87171", secondary: "#18181b" },
    duration: 5000,
  },
};

export const showApiSuccess = (message: string) => {
  toast.success(message, toastStyle);
};

export const showApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    const detail = error.errors?.map((e) => e.msg).filter(Boolean).join(", ");
    const text = detail ? `${error.message}: ${detail}` : error.message;
    toast.error(text, toastStyle);
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message, toastStyle);
    return;
  }

  toast.error("Something went wrong", toastStyle);
};
