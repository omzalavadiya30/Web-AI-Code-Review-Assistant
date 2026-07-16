import Link from "next/link";
import { Bot, Shield, Sparkles, Zap } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const features = [
  { icon: Bot, text: "AI-powered code analysis" },
  { icon: Shield, text: "Security vulnerability detection" },
  { icon: Zap, text: "Instant feedback on code quality" },
  { icon: Sparkles, text: "Smart refactoring suggestions" },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="gradient-bg grid-pattern flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between border-r border-white/5 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <Bot className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-xl font-semibold">
            Code<span className="text-indigo-400">Review</span> AI
          </span>
        </Link>

        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Ship better code,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              faster than ever
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-zinc-400">
            Your AI-powered code review assistant. Catch bugs, improve quality,
            and learn best practices — before your PR even opens.
          </p>

          <ul className="mt-10 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-zinc-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-indigo-400" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-zinc-500">
          Internship Project · Labmentix · 2026
        </p>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="font-semibold">
                Code<span className="text-indigo-400">Review</span> AI
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-zinc-400">{subtitle}</p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
