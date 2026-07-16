"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  GitBranch,
  History,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const quickActions = [
  {
    icon: Code2,
    title: "Paste Code Snippet",
    description: "Paste your source code for instant AI review",
    color: "text-indigo-400 bg-indigo-500/10 ring-indigo-500/20",
    href: "/dashboard/new",
  },
  {
    icon: Upload,
    title: "Upload Files",
    description: "Upload source files for batch analysis",
    color: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/20",
    href: "/dashboard/new",
  },
  {
    icon: GitBranch,
    title: "GitHub Repository",
    description: "Analyze a public GitHub repo",
    color: "text-violet-400 bg-violet-500/10 ring-violet-500/20",
    href: "/dashboard/new",
  },
];

const stats = [
  { label: "Reviews", value: "0" },
  { label: "Open Findings", value: "0" },
  { label: "Avg. Score", value: "-" },
  { label: "Last Review", value: "None" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Start a review, check previous submissions, and manage your workspace from
            one protected dashboard.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button size="lg">
            New Review
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Start a Review</h2>
          <Link
            href="/dashboard/reviews"
            className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200"
          >
            View history
            <History className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="glass-card group rounded-2xl p-6 transition-all hover:border-indigo-500/30 hover:bg-white/[0.06]"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${action.color}`}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{action.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-semibold">Day 3 Active - Dashboard layout</h3>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Navigation and routing are now organized under the dashboard shell.
                Review submission and history pages are ready for the next backend
                integration step.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <h3 className="font-semibold">Next milestone</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Connect review creation to static analysis and AI feedback.
          </p>
        </div>
      </section>
    </div>
  );
}
