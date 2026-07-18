"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  FileCode2,
  FileSearch,
  Filter,
  History,
  Loader2,
  Search,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { reviewApi } from "@/lib/review-api";
import type { ReviewListItem } from "@/types/review";

const reviewStates = ["All", "Draft", "Completed", "Flagged"] as const;
type ReviewState = (typeof reviewStates)[number];

const formatStatus = (status: ReviewListItem["status"]) =>
  status === "failed" ? "Flagged" : status.charAt(0).toUpperCase() + status.slice(1);

const getReviewTitle = (review: ReviewListItem) =>
  review.sources[0]?.metadata?.reviewTitle || review.sources[0]?.title || "Untitled review";

const findingSeverityClasses = {
  low: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/20",
  medium: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
  high: "bg-orange-500/10 text-orange-200 ring-orange-500/20",
  critical: "bg-red-500/10 text-red-200 ring-red-500/20",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [activeState, setActiveState] = useState<ReviewState>("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      try {
        const response = await reviewApi.list();
        if (mounted) {
          setReviews(response.data || []);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load reviews");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(
    () => [
      {
        label: "Completed",
        value: reviews.filter((review) => review.status === "completed").length.toString(),
      },
      {
        label: "Findings",
        value: reviews
          .reduce((total, review) => total + (review.findings?.length || 0), 0)
          .toString(),
      },
      {
        label: "Flagged",
        value: reviews.filter((review) => review.status === "failed").length.toString(),
      },
    ],
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const source = review.sources[0];
      const reviewTitle = getReviewTitle(review);
      const statusMatch =
        activeState === "All" ||
        review.status === activeState.toLowerCase() ||
        (activeState === "Flagged" && review.status === "failed");

      if (!statusMatch) return false;
      if (!query) return true;

      return [
        reviewTitle,
        source?.title,
        source?.language,
        source?.file_name,
        source?.branch_name,
        review.review_type,
        ...(review.findings || []).map((finding) => finding.issue),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [activeState, reviews, search]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">Reviews</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Review history</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track submitted snippets, uploaded files, static findings, and analyzer scores.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button>
            New Review
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {error && <Alert type="error" message={error} />}

      <section className="grid gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-zinc-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            id="review-search"
            placeholder="Search reviews by title, language, or branch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {reviewStates.map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setActiveState(state)}
                className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                  state === activeState
                    ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/25"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {state}
              </button>
            ))}
            <button
              type="button"
              aria-label="Open filters"
              className="rounded-xl bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center rounded-2xl border border-white/10 bg-white/3 px-6 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="mt-6 space-y-3">
            {filteredReviews.map((review) => {
              const source = review.sources[0];
              const reviewTitle = getReviewTitle(review);
              const sourceTotals = review.sources.reduce(
                (totals, item) => ({
                  lines: totals.lines + item.line_count,
                  characters: totals.characters + item.character_count,
                }),
                { lines: 0, characters: 0 }
              );

              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-white/10 bg-white/3 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200 ring-1 ring-indigo-500/20">
                          <FileCode2 className="h-3.5 w-3.5" />
                          {review.review_type}
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 ring-1 ring-white/10">
                          {formatStatus(review.status)}
                        </span>
                      </div>
                      <h2 className="mt-3 truncate text-lg font-semibold">
                        {reviewTitle}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {[
                          source?.language,
                          review.sources.length > 1
                            ? `${review.sources.length} files`
                            : source?.file_name,
                          source?.branch_name,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "No source metadata"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-104">
                      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <p className="text-xs text-zinc-500">Lines</p>
                        <p className="mt-1 font-semibold text-zinc-100">{sourceTotals.lines}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <p className="text-xs text-zinc-500">Findings</p>
                        <p className="mt-1 font-semibold text-zinc-100">
                          {review.findings?.length || 0}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <p className="text-xs text-zinc-500">Score</p>
                        <p className="mt-1 font-semibold text-zinc-100">
                          {review.overall_score ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <p className="text-xs text-zinc-500">Created</p>
                        <p className="mt-1 flex items-center gap-1.5 font-semibold text-zinc-100">
                          <Calendar className="h-3.5 w-3.5 text-cyan-300" />
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {review.findings && review.findings.length > 0 && (
                    <ul className="mt-4 grid gap-2 lg:grid-cols-2">
                      {review.findings.slice(0, 2).map((finding) => (
                        <li key={finding.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${
                                findingSeverityClasses[finding.severity]
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="truncate text-xs text-zinc-500">
                              {finding.file_name || source?.file_name || "source"}
                              {finding.line_number ? `:${finding.line_number}` : ""}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{finding.issue}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/3 px-6 py-12 text-center">
            <FileSearch className="mx-auto h-12 w-12 text-zinc-500" />
            <h2 className="mt-4 text-lg font-semibold">No reviews yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              Analyzed snippets and uploaded files will appear here with static findings.
            </p>
            <Link href="/dashboard/new" className="mt-6 inline-flex">
              <Button variant="secondary">
                <History className="h-4 w-4" />
                Create first review
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
