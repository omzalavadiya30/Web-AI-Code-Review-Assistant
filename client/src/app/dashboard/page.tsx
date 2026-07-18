"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FolderKanban,
  History,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { projectApi } from "@/lib/project-api";
import { reviewApi } from "@/lib/review-api";
import type { Project } from "@/types/project";
import type { ReviewListItem } from "@/types/review";

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
    icon: FolderKanban,
    title: "Manage Projects",
    description: "Group reviews by workspace or repository",
    color: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
    href: "/dashboard/projects",
  }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      try {
        const [reviewsResponse, projectsResponse] = await Promise.all([
          reviewApi.list(),
          projectApi.list(),
        ]);
        if (mounted) {
          setReviews(reviewsResponse.data || []);
          setProjects(projectsResponse.data || []);
        }
      } catch {
        if (mounted) {
          setReviews([]);
          setProjects([]);
        }
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const scoredReviews = reviews.filter((review) => review.overall_score !== null);
    const averageScore =
      scoredReviews.length > 0
        ? Math.round(
            scoredReviews.reduce((total, review) => total + (review.overall_score || 0), 0) /
              scoredReviews.length
          ).toString()
        : "-";

    return [
      { label: "Projects", value: projects.length.toString() },
      { label: "Reviews", value: reviews.length.toString() },
      {
        label: "Open Findings",
        value: reviews
          .reduce((total, review) => total + (review.findings?.length || 0), 0)
          .toString(),
      },
      { label: "Avg. Score", value: averageScore },
      {
        label: "Last Review",
        value: reviews[0]?.created_at ? new Date(reviews[0].created_at).toLocaleDateString() : "None",
      },
    ];
  }, [projects.length, reviews]);

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
              className="glass-card group rounded-2xl p-6 transition-all hover:border-indigo-500/30 hover:bg-white/6"
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
              <h3 className="font-semibold">Day 9 Active - quality analysis</h3>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Reviews now include cyclomatic complexity, function-size checks,
                nesting depth, duplicate blocks, and code-smell findings.
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
            Add repository-level review context and richer pull-request style reports.
          </p>
        </div>
      </section>
    </div>
  );
}
