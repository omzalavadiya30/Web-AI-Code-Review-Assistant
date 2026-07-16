import Link from "next/link";
import { ArrowRight, FileSearch, Filter, History, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const summary = [
  { label: "Completed", value: "0" },
  { label: "Drafts", value: "0" },
  { label: "Flagged", value: "0" },
];

const reviewStates = ["All", "Draft", "Completed", "Flagged"];

export default function ReviewsPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">Reviews</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Review history</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track submitted reviews, drafts, and findings from one route.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button>
            New Review
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

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
            placeholder="Search reviews by title, language, or repository"
            icon={<Search className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {reviewStates.map((state) => (
              <button
                key={state}
                type="button"
                className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                  state === "All"
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

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <FileSearch className="mx-auto h-12 w-12 text-zinc-500" />
          <h2 className="mt-4 text-lg font-semibold">No reviews yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Once review submission is connected, completed reviews and drafts will appear
            here with status, score, and findings.
          </p>
          <Link href="/dashboard/new" className="mt-6 inline-flex">
            <Button variant="secondary">
              <History className="h-4 w-4" />
              Create first review
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
