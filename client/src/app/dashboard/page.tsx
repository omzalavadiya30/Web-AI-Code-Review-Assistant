"use client";

import Link from "next/link";
import {
  ArrowRight,
  Code2,
  GitBranch,
  Sparkles,
  Upload,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuard";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const quickActions = [
  {
    icon: Code2,
    title: "Paste Code Snippet",
    description: "Paste your source code for instant AI review",
    color: "text-indigo-400 bg-indigo-500/10 ring-indigo-500/20",
    href: "#",
    comingSoon: true,
  },
  {
    icon: Upload,
    title: "Upload Files",
    description: "Upload source files for batch analysis",
    color: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/20",
    href: "#",
    comingSoon: true,
  },
  {
    icon: GitBranch,
    title: "GitHub Repository",
    description: "Analyze a public GitHub repo",
    color: "text-violet-400 bg-violet-500/10 ring-violet-500/20",
    href: "#",
    comingSoon: true,
  },
];

const stats = [
  { label: "Reviews", value: "0" },
  { label: "Issues Found", value: "—" },
  { label: "Avg. Score", value: "—" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="gradient-bg grid-pattern min-h-screen">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-sm font-medium text-indigo-400">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="mt-2 text-zinc-400">
              Ready to review some code? Choose how you want to submit your code below.
            </p>
          </div>

          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-6">
                <p className="text-sm text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-lg font-semibold">Start a Review</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="glass-card group relative rounded-2xl p-6 transition-all hover:border-indigo-500/30"
              >
                {action.comingSoon && (
                  <span className="absolute right-4 top-4 rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-500 ring-1 ring-white/10">
                    Coming Soon
                  </span>
                )}
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${action.color}`}
                >
                  <action.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{action.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 glass-card rounded-2xl p-8">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Day 2 Complete — Authentication</h3>
                  <p className="mt-1 max-w-lg text-sm text-zinc-400">
                    Your account is set up. Code submission, static analysis, and AI
                    review features will be available in upcoming days.
                  </p>
                </div>
              </div>
              <Link href="/profile">
                <Button variant="secondary">
                  Manage Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
