"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  FileCode2,
  GitBranch,
  Upload,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ReviewMode = "snippet" | "upload" | "repository";

const reviewModes = [
  {
    id: "snippet" as const,
    label: "Snippet",
    icon: Code2,
  },
  {
    id: "upload" as const,
    label: "Files",
    icon: Upload,
  },
  {
    id: "repository" as const,
    label: "Repository",
    icon: GitBranch,
  },
];

const focusAreas = [
  "Bugs",
  "Security",
  "Performance",
  "Maintainability",
  "Best practices",
];

export default function NewReviewPage() {
  const [mode, setMode] = useState<ReviewMode>("snippet");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [code, setCode] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === "snippet") return code.trim().length > 0;
    if (mode === "repository") return repositoryUrl.trim().length > 0;
    return true;
  }, [code, mode, repositoryUrl, title]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-indigo-300">New Review</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Submit code for review</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Choose a submission source and prepare the information the review engine will
          need when analysis is connected.
        </p>
      </section>

      {submitted && (
        <Alert
          type="success"
          message="Review draft is ready. The analysis engine can be connected in the next step."
        />
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_22rem]" noValidate>
        <section className="glass-card rounded-2xl p-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {reviewModes.map((reviewMode) => {
              const Icon = reviewMode.icon;
              const active = mode === reviewMode.id;

              return (
                <button
                  key={reviewMode.id}
                  type="button"
                  onClick={() => setMode(reviewMode.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-indigo-500/40 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {reviewMode.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-5">
            <Input
              id="review-title"
              label="Review Title"
              placeholder="Authentication middleware cleanup"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              icon={<FileCode2 className="h-4 w-4" />}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="review-language" className="block text-sm font-medium text-zinc-300">
                  Primary Language
                </label>
                <select
                  id="review-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-colors focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>JavaScript</option>
                  <option>TypeScript</option>
                  <option>Python</option>
                  <option>Java</option>
                  <option>Go</option>
                  <option>Other</option>
                </select>
              </div>

              <Input
                id="review-branch"
                label="Branch"
                placeholder="main"
                icon={<GitBranch className="h-4 w-4" />}
              />
            </div>

            {mode === "snippet" && (
              <div className="space-y-2">
                <label htmlFor="code-snippet" className="block text-sm font-medium text-zinc-300">
                  Code Snippet
                </label>
                <textarea
                  id="code-snippet"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Paste code here..."
                  className="min-h-72 w-full resize-y rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {mode === "upload" && (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
                <Upload className="mx-auto h-10 w-10 text-cyan-300" />
                <h3 className="mt-4 font-semibold">File upload route is ready</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                  This page is wired for routing now. File parsing can plug into this
                  panel when the upload API is added.
                </p>
              </div>
            )}

            {mode === "repository" && (
              <Input
                id="repository-url"
                label="Repository URL"
                placeholder="https://github.com/org/project"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                icon={<GitBranch className="h-4 w-4" />}
              />
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold">Review Focus</h2>
            <div className="mt-4 space-y-3">
              {focusAreas.map((area, index) => (
                <label key={area} className="flex items-center gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    defaultChecked={index < 3}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-500"
                  />
                  {area}
                </label>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h2 className="font-semibold">Routing status</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  This route is connected to the dashboard shell. Submissions are kept
                  local until the review API is implemented.
                </p>
              </div>
            </div>
          </section>

          <Button type="submit" className="w-full" size="lg" disabled={!canSubmit}>
            <CheckCircle2 className="h-4 w-4" />
            Prepare Review
          </Button>
        </aside>
      </form>
    </div>
  );
}
