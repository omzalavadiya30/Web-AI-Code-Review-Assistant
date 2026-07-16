import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface AlertProps {
  type?: "error" | "success" | "info";
  message: string;
}

const styles = {
  error: {
    container: "border-red-500/20 bg-red-500/10 text-red-300",
    icon: AlertCircle,
  },
  success: {
    container: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  info: {
    container: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    icon: Info,
  },
};

export function Alert({ type = "error", message }: AlertProps) {
  const style = styles[type];
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style.container}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
