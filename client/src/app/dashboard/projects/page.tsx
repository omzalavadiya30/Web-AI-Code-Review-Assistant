"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  FolderKanban,
  Loader2,
  Plus,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { projectApi } from "@/lib/project-api";
import { reviewApi } from "@/lib/review-api";
import { getReviewTitle } from "@/lib/review-utils";
import { showApiSuccess } from "@/lib/toast";
import type { Project } from "@/types/project";
import type { ReviewListItem } from "@/types/review";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [projectName, setProjectName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [projectsResponse, reviewsResponse] = await Promise.all([
          projectApi.list(),
          reviewApi.list(),
        ]);

        if (mounted) {
          setProjects(projectsResponse.data || []);
          setReviews(reviewsResponse.data || []);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const reviewCounts = useMemo(
    () =>
      reviews.reduce<Record<string, number>>((counts, review) => {
        if (review.project_id) {
          counts[review.project_id] = (counts[review.project_id] || 0) + 1;
        }
        return counts;
      }, {}),
    [reviews]
  );

  const recentProjectReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.project_id)
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
        .slice(0, 4),
    [reviews]
  );

  const canSubmit = projectName.trim().length >= 2 && !isSubmitting;
  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.project_name])),
    [projects]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await projectApi.create({
        projectName: projectName.trim(),
        githubUrl: githubUrl.trim() || undefined,
      });

      if (response.data) {
        setProjects((current) => [response.data as Project, ...current]);
        setProjectName("");
        setGithubUrl("");
        showApiSuccess(response.message);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProjectName = (projectId: string | null) =>
    projectId ? projectNameById.get(projectId) || "Unknown project" : "No project";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">Projects</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Project workspace</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Group reviews by product, repository, or client so code feedback stays organized.
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
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-zinc-500">Projects</p>
          <p className="mt-2 text-3xl font-bold">{projects.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-zinc-500">Linked Reviews</p>
          <p className="mt-2 text-3xl font-bold">
            {reviews.filter((review) => review.project_id).length}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-zinc-500">Unassigned</p>
          <p className="mt-2 text-3xl font-bold">
            {reviews.filter((review) => !review.project_id).length}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6" noValidate>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
              <FolderKanban className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="font-semibold">Create project</h2>
              <p className="text-sm text-zinc-500">Attach future reviews to it.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Input
              id="project-name"
              label="Project Name"
              placeholder="Web AI Code Review Assistant"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              icon={<FolderKanban className="h-4 w-4" />}
            />
            <Button type="submit" disabled={!canSubmit} isLoading={isSubmitting} className="w-full">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        </form>

        <section className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Project list</h2>
              <p className="mt-1 text-sm text-zinc-500">Use projects when submitting a new review.</p>
            </div>
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />}
          </div>

          {isLoading ? (
            <div className="mt-8 flex justify-center rounded-2xl border border-white/10 bg-white/3 px-6 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />
            </div>
          ) : projects.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{project.project_name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {reviewCounts[project.id] || 0} review
                        {(reviewCounts[project.id] || 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
                      <FolderKanban className="h-4 w-4 text-cyan-300" />
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-zinc-400">
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 truncate text-indigo-300 hover:text-indigo-200"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        {project.github_url}
                      </a>
                    )}
                    <p className="flex items-center gap-2 text-zinc-500">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/3 px-6 py-12 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-zinc-500" />
              <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Create a project to start grouping reviews by workspace or repository.
              </p>
            </div>
          )}
        </section>
      </section>

      {recentProjectReviews.length > 0 && (
        <section className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold">Recent project reviews</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {recentProjectReviews.map((review) => (
              <article key={review.id} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">{getReviewTitle(review)}</p>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {getProjectName(review.project_id)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-200">
                    {review.overall_score ?? "-"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
