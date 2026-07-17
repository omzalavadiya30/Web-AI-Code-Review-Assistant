"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileCode2,
  FileText,
  GitBranch,
  X,
  Upload,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { reviewApi } from "@/lib/review-api";
import { showApiSuccess } from "@/lib/toast";
import type { Review, ReviewSource } from "@/types/review";

type ReviewMode = "snippet" | "upload";
type UploadedFileDraft = {
  id: string;
  fileName: string;
  content: string;
  size: number;
  type: string;
  lineCount: number;
  characterCount: number;
};

type StoredReviewResult = {
  review: Review;
  sources: ReviewSource[];
};

const MAX_UPLOAD_FILES = 8;
const MAX_FILE_CHARACTERS = 100000;
const MAX_TOTAL_FILE_CHARACTERS = 250000;

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
];

const languageOptions = ["JavaScript", "TypeScript", "Python", "Java", "Go", "Other"];

const focusAreas = [
  "Bugs",
  "Security",
  "Performance",
  "Maintainability",
  "Best practices",
];

const countLines = (content: string) =>
  content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function NewReviewPage() {
  const [mode, setMode] = useState<ReviewMode>("snippet");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [fileName, setFileName] = useState("");
  const [branch, setBranch] = useState("");
  const [code, setCode] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileDraft[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState(() => focusAreas.slice(0, 3));
  const [storedReview, setStoredReview] = useState<StoredReviewResult | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting || isReadingFiles) return false;
    if (!title.trim()) return false;
    if (mode === "snippet") return code.trim().length > 0;
    if (mode === "upload") return uploadedFiles.length > 0;
    return false;
  }, [code, isReadingFiles, isSubmitting, mode, title, uploadedFiles.length]);

  const uploadTotals = useMemo(
    () =>
      uploadedFiles.reduce(
        (totals, file) => ({
          lines: totals.lines + file.lineCount,
          characters: totals.characters + file.characterCount,
        }),
        { lines: 0, characters: 0 }
      ),
    [uploadedFiles]
  );

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setSubmitError("");
    setIsReadingFiles(true);

    try {
      if (uploadedFiles.length + files.length > MAX_UPLOAD_FILES) {
        throw new Error(`You can upload up to ${MAX_UPLOAD_FILES} files per review`);
      }

      const timestamp = Date.now();
      const drafts = await Promise.all(
        files.map(async (file, index) => {
          const content = await file.text();

          if (content.trim().length === 0) {
            throw new Error(`${file.name} is empty`);
          }

          if (content.length > MAX_FILE_CHARACTERS) {
            throw new Error(
              `${file.name} must be ${MAX_FILE_CHARACTERS.toLocaleString()} characters or fewer`
            );
          }

          return {
            id: `${file.name}-${file.size}-${file.lastModified}-${timestamp}-${index}`,
            fileName: file.name,
            content,
            size: file.size,
            type: file.type,
            lineCount: countLines(content),
            characterCount: content.length,
          };
        })
      );

      const totalCharacters = [...uploadedFiles, ...drafts].reduce(
        (total, file) => total + file.characterCount,
        0
      );

      if (totalCharacters > MAX_TOTAL_FILE_CHARACTERS) {
        throw new Error(
          `Uploaded files must be ${MAX_TOTAL_FILE_CHARACTERS.toLocaleString()} characters or fewer in total`
        );
      }

      setUploadedFiles((current) => [...current, ...drafts]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to read uploaded files");
    } finally {
      setIsReadingFiles(false);
    }
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles((current) => current.filter((file) => file.id !== id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      if (mode === "snippet") {
        const response = await reviewApi.createSnippet({
          title: title.trim(),
          language,
          fileName: fileName.trim() || undefined,
          branch: branch.trim() || undefined,
          code,
          focusAreas: selectedFocusAreas,
        });

        if (response.data) {
          setStoredReview({
            review: response.data.review,
            sources: [response.data.source],
          });
          showApiSuccess(response.message);
        }
      }

      if (mode === "upload") {
        const response = await reviewApi.createFiles({
          title: title.trim(),
          language,
          branch: branch.trim() || undefined,
          focusAreas: selectedFocusAreas,
          files: uploadedFiles.map((file) => ({
            fileName: file.fileName,
            content: file.content,
            size: file.size,
            type: file.type,
          })),
        });

        if (response.data) {
          setStoredReview({
            review: response.data.review,
            sources: response.data.sources,
          });
          showApiSuccess(response.message);
        }
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to upload code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const storedLineCount =
    storedReview?.sources.reduce((total, source) => total + source.line_count, 0) ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-indigo-300">New Review</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Submit code for review</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Choose a submission source and store the code the review engine will analyze.
        </p>
      </section>

      {storedReview && (
        <Alert
          type="success"
          message={`${storedReview.sources.length} source${
            storedReview.sources.length === 1 ? "" : "s"
          } stored as review ${storedReview.review.id}. ${storedLineCount} lines saved.`}
        />
      )}

      {submitError && <Alert type="error" message={submitError} />}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_22rem]" noValidate>
        <section className="glass-card rounded-2xl p-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {reviewModes.map((reviewMode) => {
              const Icon = reviewMode.icon;
              const active = mode === reviewMode.id;
              const disabled = "disabled" in reviewMode && reviewMode.disabled;

              return (
                <button
                  key={reviewMode.id}
                  type="button"
                  onClick={() => {
                    if (!disabled) setMode(reviewMode.id);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-indigo-500/40 bg-indigo-500/15 text-white"
                      : disabled
                        ? "cursor-not-allowed border-white/10 bg-white/3 text-zinc-600"
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

            <div className={`grid gap-5 ${mode === "snippet" ? "sm:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <label htmlFor="review-language" className="block text-sm font-medium text-zinc-300">
                  Primary Language
                </label>
                <div className="relative">
                  <select
                    id="review-language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#111118] px-4 py-3 pr-10 text-sm text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ colorScheme: "dark" }}
                  >
                    {languageOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111118] text-zinc-100">
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                </div>
              </div>

              {mode === "snippet" && (
                <Input
                  id="review-file-name"
                  label="File Name"
                  placeholder="auth.middleware.js"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  icon={<FileCode2 className="h-4 w-4" />}
                />
              )}
            </div>

            <Input
              id="review-branch"
              label="Branch"
              placeholder="main"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              icon={<GitBranch className="h-4 w-4" />}
            />

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
                  className="min-h-72 w-full resize-y rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 font-mono text-sm text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {mode === "upload" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
                  <Upload className="mx-auto h-10 w-10 text-cyan-300" />
                  <h3 className="mt-4 font-semibold">Upload source files</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                    Up to {MAX_UPLOAD_FILES} text-based files,{" "}
                    {MAX_TOTAL_FILE_CHARACTERS.toLocaleString()} characters total.
                  </p>
                  <label
                    htmlFor="source-files"
                    className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition-colors hover:bg-white/15"
                  >
                    <FileText className="h-4 w-4" />
                    {isReadingFiles ? "Reading files..." : "Choose Files"}
                  </label>
                  <input
                    id="source-files"
                    type="file"
                    multiple
                    accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.c,.cpp,.cs,.rb,.php,.rs,.html,.css,.json,.sql,.md,.yml,.yaml,.txt"
                    onChange={handleFilesSelected}
                    disabled={isReadingFiles}
                    className="sr-only"
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/3">
                    <div className="flex flex-col gap-2 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold">Selected Files</h3>
                        <p className="text-sm text-zinc-500">
                          {uploadedFiles.length} file{uploadedFiles.length === 1 ? "" : "s"} /{" "}
                          {uploadTotals.lines} lines /{" "}
                          {uploadTotals.characters.toLocaleString()} characters
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="self-start rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-white sm:self-auto"
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="divide-y divide-white/10">
                      {uploadedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">
                              {file.fileName}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {file.lineCount} lines / {formatBytes(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(file.id)}
                            aria-label={`Remove ${file.fileName}`}
                            className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold">Review Focus</h2>
            <div className="mt-4 space-y-3">
              {focusAreas.map((area) => (
                <label key={area} className="flex items-center gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedFocusAreas.includes(area)}
                    onChange={() => toggleFocusArea(area)}
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
                  Snippet and file submissions save through the review API. GitHub
                  repository fetching is intentionally disabled for this milestone.
                </p>
              </div>
            </div>
          </section>

          {storedReview && (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="font-semibold">Stored Draft</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Sources</dt>
                  <dd className="font-medium text-zinc-200">{storedReview.sources.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Lines</dt>
                  <dd className="font-medium text-zinc-200">{storedLineCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="font-medium capitalize text-zinc-200">
                    {storedReview.review.review_type}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-medium capitalize text-zinc-200">
                    {storedReview.review.status}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            isLoading={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4" />
            {mode === "snippet"
              ? "Upload Snippet"
              : mode === "upload"
                ? "Upload Files"
                : "Unavailable"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
