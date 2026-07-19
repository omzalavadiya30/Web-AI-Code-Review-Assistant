"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileCode2,
  FileSearch,
  Filter,
  Gauge,
  History,
  Layers,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getDocumentationItems,
  ReviewDocumentation,
} from "@/components/review/ReviewDocumentation";
import { projectApi } from "@/lib/project-api";
import { reviewApi } from "@/lib/review-api";
import type { Project } from "@/types/project";
import type { ReviewFinding, ReviewListItem } from "@/types/review";

const reviewStates = ["All", "Queued", "Draft", "Completed", "Flagged"] as const;
const FINDING_PREVIEW_LIMIT = 4;
type ReviewState = (typeof reviewStates)[number];
type Severity = ReviewFinding["severity"];
type ReviewTypeFilter = "All" | "Snippet" | "File" | "GitHub";
type SeverityFilter = "All" | "Critical" | "High" | "Medium" | "Low";
type ScoreFilter = "all" | "excellent" | "healthy" | "needs-work" | "unscored";
type SortMode = "newest" | "oldest" | "score-high" | "score-low" | "findings" | "risk";

const reviewTypeFilters: ReviewTypeFilter[] = ["All", "Snippet", "File", "GitHub"];
const severityFilters: SeverityFilter[] = ["All", "Critical", "High", "Medium", "Low"];

const scoreFilters: { id: ScoreFilter; label: string }[] = [
  { id: "all", label: "All scores" },
  { id: "excellent", label: "85 and above" },
  { id: "healthy", label: "70 to 84" },
  { id: "needs-work", label: "Below 70" },
  { id: "unscored", label: "Unscored" },
];

const sortOptions: { id: SortMode; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "score-high", label: "Highest score" },
  { id: "score-low", label: "Lowest score" },
  { id: "findings", label: "Most findings" },
  { id: "risk", label: "Highest risk" },
];

const formatStatus = (status: ReviewListItem["status"]) =>
  status === "failed" ? "Flagged" : status.charAt(0).toUpperCase() + status.slice(1);

const formatReviewType = (type: ReviewListItem["review_type"]) =>
  type === "github" ? "GitHub" : type.charAt(0).toUpperCase() + type.slice(1);

const getReviewDateLabels = (createdAt: string) => {
  const date = new Date(createdAt);

  return {
    iso: createdAt.slice(0, 10),
    short: date.toLocaleDateString(),
  };
};

const getReviewTitle = (review: ReviewListItem) =>
  review.sources[0]?.metadata?.reviewTitle || review.sources[0]?.title || "Untitled review";

const severityOrder: Severity[] = ["critical", "high", "medium", "low"];

const severityLabels: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const findingSeverityClasses = {
  low: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/20",
  medium: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
  high: "bg-orange-500/10 text-orange-200 ring-orange-500/20",
  critical: "bg-red-500/10 text-red-200 ring-red-500/20",
};

const severityBarClasses: Record<Severity, string> = {
  low: "bg-cyan-300",
  medium: "bg-amber-300",
  high: "bg-orange-400",
  critical: "bg-red-400",
};

const severityTextClasses: Record<Severity, string> = {
  low: "text-cyan-200",
  medium: "text-amber-200",
  high: "text-orange-200",
  critical: "text-red-200",
};

const severityWeights: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

const createSeverityCounts = () =>
  severityOrder.reduce(
    (counts, severity) => ({ ...counts, [severity]: 0 }),
    {} as Record<Severity, number>
  );

const countFindingsBySeverity = (findings: ReviewFinding[]) =>
  findings.reduce((counts, finding) => {
    counts[finding.severity] += 1;
    return counts;
  }, createSeverityCounts());

const getAnalyzerName = (issue: string) => issue.match(/^\[([^\]\s]+)/)?.[1] || "Static";

const getRiskScore = (review: ReviewListItem) =>
  review.findings.reduce((total, finding) => total + severityWeights[finding.severity], 0);

const sortFindingsBySeverity = (findings: ReviewFinding[]) =>
  [...findings].sort(
    (left, right) =>
      severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity) ||
      (left.line_number || Number.MAX_SAFE_INTEGER) -
        (right.line_number || Number.MAX_SAFE_INTEGER)
  );

const getScoreTone = (score: number | null) => {
  if (score === null) return "text-zinc-300";
  if (score >= 85) return "text-emerald-200";
  if (score >= 70) return "text-amber-200";
  return "text-red-200";
};

const getScoreBarClass = (score: number | null) => {
  if (score === null) return "bg-zinc-500";
  if (score >= 85) return "bg-emerald-400";
  if (score >= 70) return "bg-amber-300";
  return "bg-red-400";
};

const matchesScoreFilter = (score: number | null, filter: ScoreFilter) => {
  if (filter === "all") return true;
  if (filter === "unscored") return score === null;
  if (score === null) return false;
  if (filter === "excellent") return score >= 85;
  if (filter === "healthy") return score >= 70 && score < 85;
  return score < 70;
};

const sortReviews = (reviews: ReviewListItem[], sortMode: SortMode) =>
  [...reviews].sort((left, right) => {
    if (sortMode === "oldest") {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    }
    if (sortMode === "score-high") {
      return (right.overall_score ?? -1) - (left.overall_score ?? -1);
    }
    if (sortMode === "score-low") {
      return (left.overall_score ?? Number.MAX_SAFE_INTEGER) -
        (right.overall_score ?? Number.MAX_SAFE_INTEGER);
    }
    if (sortMode === "findings") {
      return right.findings.length - left.findings.length;
    }
    if (sortMode === "risk") {
      return getRiskScore(right) - getRiskScore(left);
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeState, setActiveState] = useState<ReviewState>("All");
  const [search, setSearch] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<ReviewTypeFilter>("All");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [expandedFindingReviews, setExpandedFindingReviews] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  const getProjectName = useCallback(
    (projectId: string | null) =>
      projects.find((project) => project.id === projectId)?.project_name || null,
    [projects]
  );

  const analysisDashboard = useMemo(() => {
    const findingsWithReview = reviews.flatMap((review) =>
      review.findings.map((finding) => ({ finding, review }))
    );
    const allFindings = findingsWithReview.map(({ finding }) => finding);
    const allDocumentationItems = reviews.flatMap((review) => getDocumentationItems(review.sources));
    const severityCounts = countFindingsBySeverity(allFindings);
    const scoredReviews = reviews.filter((review) => review.overall_score !== null);
    const completedReviews = reviews.filter((review) => review.status === "completed");
    const totalLines = reviews.reduce(
      (total, review) =>
        total + review.sources.reduce((sourceTotal, source) => sourceTotal + source.line_count, 0),
      0
    );
    const totalSources = reviews.reduce((total, review) => total + review.sources.length, 0);
    const averageScore =
      scoredReviews.length > 0
        ? Math.round(
            scoredReviews.reduce((total, review) => total + (review.overall_score || 0), 0) /
              scoredReviews.length
          )
        : null;
    const analyzerCounts = findingsWithReview.reduce<Record<string, number>>((counts, { finding }) => {
      const analyzer = getAnalyzerName(finding.issue);
      counts[analyzer] = (counts[analyzer] || 0) + 1;
      return counts;
    }, {});
    const analyzerRows = Object.entries(analyzerCounts)
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .map(([name, count]) => ({ name, count }));
    const highestRiskReviews = [...reviews]
      .filter((review) => review.findings.length > 0 || review.overall_score !== null)
      .sort((left, right) => {
        const riskDelta = getRiskScore(right) - getRiskScore(left);
        if (riskDelta !== 0) return riskDelta;
        return (left.overall_score ?? 100) - (right.overall_score ?? 100);
      })
      .slice(0, 4);
    const recentFindings = [...findingsWithReview]
      .sort(
        (left, right) =>
          new Date(right.review.created_at).getTime() - new Date(left.review.created_at).getTime() ||
          severityOrder.indexOf(left.finding.severity) -
            severityOrder.indexOf(right.finding.severity)
      )
      .slice(0, 5);

    return {
      averageScore,
      completedReviews: completedReviews.length,
      findingsWithReview,
      highRiskFindings: severityCounts.critical + severityCounts.high,
      highestRiskReviews,
      recentFindings,
      analyzerRows,
      severityCounts,
      totalDocumentationItems: allDocumentationItems.length,
      totalFindings: allFindings.length,
      totalLines,
      totalReviews: reviews.length,
      totalSources,
    };
  }, [reviews]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Analyzed",
        value: analysisDashboard.completedReviews.toString(),
        detail: `${analysisDashboard.totalReviews} total reviews`,
        icon: CheckCircle2,
        color: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
      },
      {
        label: "Findings",
        value: analysisDashboard.totalFindings.toString(),
        detail: `${analysisDashboard.highRiskFindings} high risk`,
        icon: AlertTriangle,
        color: "text-orange-300 bg-orange-500/10 ring-orange-500/20",
      },
      {
        label: "Avg. Score",
        value: analysisDashboard.averageScore?.toString() ?? "-",
        detail: "Static score",
        icon: Gauge,
        color: "text-cyan-300 bg-cyan-500/10 ring-cyan-500/20",
      },
      {
        label: "Sources",
        value: analysisDashboard.totalSources.toString(),
        detail: `${analysisDashboard.totalLines.toLocaleString()} lines`,
        icon: Layers,
        color: "text-indigo-300 bg-indigo-500/10 ring-indigo-500/20",
      },
      {
        label: "Docs",
        value: analysisDashboard.totalDocumentationItems.toString(),
        detail: "Generated items",
        icon: BookOpen,
        color: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
      },
    ],
    [analysisDashboard]
  );

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    const queryTerms = query.split(/\s+/).filter(Boolean);

    const matchedReviews = reviews.filter((review) => {
      const source = review.sources[0];
      const reviewTitle = getReviewTitle(review);
      const projectName = getProjectName(review.project_id);
      const reviewDateLabels = getReviewDateLabels(review.created_at);
      const statusMatch =
        activeState === "All" ||
        review.status === activeState.toLowerCase() ||
        (activeState === "Flagged" && review.status === "failed");
      const projectMatch =
        projectFilter === "all" ||
        (projectFilter === "none" ? review.project_id === null : review.project_id === projectFilter);
      const typeMatch =
        reviewTypeFilter === "All" || review.review_type === reviewTypeFilter.toLowerCase();
      const severityMatch =
        severityFilter === "All" ||
        review.findings.some((finding) => finding.severity === severityFilter.toLowerCase());
      const scoreMatch = matchesScoreFilter(review.overall_score, scoreFilter);

      if (!statusMatch || !projectMatch || !typeMatch || !severityMatch || !scoreMatch) {
        return false;
      }

      if (queryTerms.length === 0) return true;

      const searchableText = [
        reviewTitle,
        review.summary,
        source?.title,
        source?.language,
        source?.file_name,
        source?.branch_name,
        projectName,
        formatStatus(review.status),
        formatReviewType(review.review_type),
        reviewDateLabels.iso,
        reviewDateLabels.short,
        review.overall_score === null ? "unscored" : `score ${review.overall_score}`,
        `${review.findings.length} findings`,
        ...review.sources.flatMap((reviewSource) => [
          reviewSource.title,
          reviewSource.language,
          reviewSource.file_name,
          reviewSource.branch_name,
        ]),
        ...(review.findings || []).flatMap((finding) => [
          finding.severity,
          finding.issue,
          finding.explanation,
          finding.suggested_fix,
          finding.file_name,
          finding.line_number ? `line ${finding.line_number}` : null,
        ]),
        ...getDocumentationItems(review.sources).flatMap((item) => [
          item.name,
          item.signature,
          item.description,
        ]),
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ")
        .toLowerCase();

      return queryTerms.every((term) => searchableText.includes(term));
    });

    return sortReviews(matchedReviews, sortMode);
  }, [
    activeState,
    getProjectName,
    projectFilter,
    reviews,
    reviewTypeFilter,
    scoreFilter,
    search,
    severityFilter,
    sortMode,
  ]);

  const maxSeverityCount = Math.max(
    ...severityOrder.map((severity) => analysisDashboard.severityCounts[severity]),
    1
  );
  const maxAnalyzerCount = Math.max(
    ...analysisDashboard.analyzerRows.map((analyzer) => analyzer.count),
    1
  );

  const toggleReviewFindings = (reviewId: string) => {
    setExpandedFindingReviews((current) => ({
      ...current,
      [reviewId]: !current[reviewId],
    }));
  };

  const activeFilterCount = [
    search.trim().length > 0,
    activeState !== "All",
    projectFilter !== "all",
    reviewTypeFilter !== "All",
    severityFilter !== "All",
    scoreFilter !== "all",
    sortMode !== "newest",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setActiveState("All");
    setProjectFilter("all");
    setReviewTypeFilter("All");
    setSeverityFilter("All");
    setScoreFilter("all");
    setSortMode("newest");
  };

  const hasReviews = reviews.length > 0;
  const emptyStateTitle = hasReviews ? "No matching reviews" : "No reviews yet";
  const emptyStateMessage = hasReviews
    ? "Adjust the search terms or filters to widen the review history."
    : "Analyzed snippets and uploaded files will appear here with review findings.";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">Reviews</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Review history</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track submitted snippets, uploaded files, complexity findings, code smells, AI findings, and review scores.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">{item.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-300">Review Results</p>
              <h2 className="mt-1 text-lg font-semibold">Severity distribution</h2>
            </div>
            <BarChart3 className="h-5 w-5 text-zinc-500" />
          </div>

          <div className="mt-5 space-y-4">
            {severityOrder.map((severity) => {
              const count = analysisDashboard.severityCounts[severity];
              const width = count === 0 ? "0%" : `${Math.max(4, (count / maxSeverityCount) * 100)}%`;

              return (
                <div key={severity}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className={`font-medium ${severityTextClasses[severity]}`}>
                      {severityLabels[severity]}
                    </span>
                    <span className="text-zinc-400">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${severityBarClasses[severity]}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-300">Tooling</p>
              <h2 className="mt-1 text-lg font-semibold">Reviewer coverage</h2>
            </div>
            <Gauge className="h-5 w-5 text-zinc-500" />
          </div>

          {analysisDashboard.analyzerRows.length > 0 ? (
            <div className="mt-5 space-y-4">
              {analysisDashboard.analyzerRows.map((analyzer) => (
                <div key={analyzer.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-200">{analyzer.name}</span>
                    <span className="text-zinc-400">{analyzer.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${Math.max(8, (analyzer.count / maxAnalyzerCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-500/20">
              No review findings have been reported yet.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-300">Priority</p>
              <h2 className="mt-1 text-lg font-semibold">Highest-risk reviews</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-zinc-500" />
          </div>

          {analysisDashboard.highestRiskReviews.length > 0 ? (
            <div className="mt-5 space-y-4">
              {analysisDashboard.highestRiskReviews.map((review) => {
                const counts = countFindingsBySeverity(review.findings);
                const score = review.overall_score ?? 0;

                return (
                  <div key={review.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">{getReviewTitle(review)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {review.sources.length} source{review.sources.length === 1 ? "" : "s"} /{" "}
                          {review.findings.length} finding{review.findings.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${getScoreTone(review.overall_score)}`}>
                        {review.overall_score ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${getScoreBarClass(review.overall_score)}`} style={{ width: `${score}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {severityOrder.map((severity) => (
                        <span
                          key={severity}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${findingSeverityClasses[severity]}`}
                        >
                          {severityLabels[severity]} {counts[severity]}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-white/5 p-4 text-sm text-zinc-400 ring-1 ring-white/10">
              No scored reviews are available yet.
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-300">Findings</p>
              <h2 className="mt-1 text-lg font-semibold">Recent review findings</h2>
            </div>
            <FileSearch className="h-5 w-5 text-zinc-500" />
          </div>

          {analysisDashboard.recentFindings.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {analysisDashboard.recentFindings.map(({ finding, review }) => (
                <li key={finding.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${
                        findingSeverityClasses[finding.severity]
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="truncate text-xs text-zinc-500">
                      {getReviewTitle(review)}
                      {finding.line_number ? ` / line ${finding.line_number}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{finding.issue}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-500/20">
              No review findings have been reported yet.
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            id="review-search"
            placeholder="Search reviews, projects, findings, or docs"
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
              onClick={() => setIsFilterPanelOpen((open) => !open)}
              aria-expanded={isFilterPanelOpen}
              aria-label="Toggle filters"
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/25"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Filter className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-xs text-cyan-100">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {isFilterPanelOpen && (
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label htmlFor="project-filter" className="block text-xs font-medium text-zinc-500">
                Project
              </label>
              <select
                id="project-filter"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ colorScheme: "dark" }}
              >
                <option value="all" className="bg-[#111118] text-zinc-100">
                  All projects
                </option>
                <option value="none" className="bg-[#111118] text-zinc-100">
                  No project
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-[#111118] text-zinc-100">
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="type-filter" className="block text-xs font-medium text-zinc-500">
                Source Type
              </label>
              <select
                id="type-filter"
                value={reviewTypeFilter}
                onChange={(event) => setReviewTypeFilter(event.target.value as ReviewTypeFilter)}
                className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ colorScheme: "dark" }}
              >
                {reviewTypeFilters.map((type) => (
                  <option key={type} value={type} className="bg-[#111118] text-zinc-100">
                    {type === "All" ? "All types" : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="severity-filter" className="block text-xs font-medium text-zinc-500">
                Severity
              </label>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
                className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ colorScheme: "dark" }}
              >
                {severityFilters.map((severity) => (
                  <option key={severity} value={severity} className="bg-[#111118] text-zinc-100">
                    {severity === "All" ? "All severities" : severity}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="score-filter" className="block text-xs font-medium text-zinc-500">
                Score
              </label>
              <select
                id="score-filter"
                value={scoreFilter}
                onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)}
                className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ colorScheme: "dark" }}
              >
                {scoreFilters.map((score) => (
                  <option key={score.id} value={score.id} className="bg-[#111118] text-zinc-100">
                    {score.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sort-mode" className="block text-xs font-medium text-zinc-500">
                Sort
              </label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ colorScheme: "dark" }}
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id} className="bg-[#111118] text-zinc-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {filteredReviews.length} of {reviews.length} review
            {reviews.length === 1 ? "" : "s"}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5 font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white sm:self-auto"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
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
              const projectName = getProjectName(review.project_id);
              const reviewSeverityCounts = countFindingsBySeverity(review.findings);
              const sortedReviewFindings = sortFindingsBySeverity(review.findings);
              const isFindingsExpanded = expandedFindingReviews[review.id] || false;
              const hasHiddenFindings = sortedReviewFindings.length > FINDING_PREVIEW_LIMIT;
              const visibleReviewFindings = isFindingsExpanded
                ? sortedReviewFindings
                : sortedReviewFindings.slice(0, FINDING_PREVIEW_LIMIT);
              const hiddenFindingCount = sortedReviewFindings.length - FINDING_PREVIEW_LIMIT;
              const scorePercentage = review.overall_score ?? 0;
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
                          {formatReviewType(review.review_type)}
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
                          projectName,
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
                          {getReviewDateLabels(review.created_at).short}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_1fr]">
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-zinc-200">Score health</span>
                        <span className={`text-sm font-semibold ${getScoreTone(review.overall_score)}`}>
                          {review.overall_score ?? "-"}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full ${getScoreBarClass(review.overall_score)}`}
                          style={{ width: `${scorePercentage}%` }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {severityOrder.map((severity) => (
                          <div key={severity} className="rounded-lg bg-black/10 px-2.5 py-2">
                            <p className={`text-xs font-medium ${severityTextClasses[severity]}`}>
                              {severityLabels[severity]}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-100">
                              {reviewSeverityCounts[severity]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0">
                      {review.summary && (
                        <p className="rounded-xl bg-white/5 p-3 text-sm text-zinc-300 ring-1 ring-white/10">
                          {review.summary}
                        </p>
                      )}

                      {sortedReviewFindings.length > 0 ? (
                        <ul className="mt-3 grid gap-3 xl:grid-cols-2">
                          {visibleReviewFindings.map((finding) => (
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
                                  {getAnalyzerName(finding.issue)} /{" "}
                                  {finding.file_name || source?.file_name || "source"}
                                  {finding.line_number ? `:${finding.line_number}` : ""}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm text-zinc-200">
                                {finding.issue}
                              </p>
                              {finding.explanation && (
                                <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                                  {finding.explanation}
                                </p>
                              )}
                              {finding.suggested_fix && (
                                <p className="mt-2 rounded-lg bg-black/10 p-2 text-xs text-zinc-300">
                                  {finding.suggested_fix}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          No review findings were reported.
                        </div>
                      )}

                      {hasHiddenFindings && (
                        <button
                          type="button"
                          onClick={() => toggleReviewFindings(review.id)}
                          aria-expanded={isFindingsExpanded}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-white/5 hover:text-indigo-200"
                        >
                          {isFindingsExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show fewer findings
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show {hiddenFindingCount} more finding
                              {hiddenFindingCount === 1 ? "" : "s"} in this review
                            </>
                          )}
                        </button>
                      )}

                      <div className="mt-5 border-t border-white/10 pt-5">
                        <ReviewDocumentation sources={review.sources} limit={3} title="Documentation" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/3 px-6 py-12 text-center">
            <FileSearch className="mx-auto h-12 w-12 text-zinc-500" />
            <h2 className="mt-4 text-lg font-semibold">{emptyStateTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              {emptyStateMessage}
            </p>
            {hasReviews ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            ) : (
              <Link href="/dashboard/new" className="mt-6 inline-flex">
                <Button variant="secondary">
                  <History className="h-4 w-4" />
                  Create first review
                </Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
