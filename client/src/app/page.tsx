import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Bug,
  Code2,
  Gauge,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Bug,
    title: "Bug Detection",
    description:
      "Catch syntax errors, logic bugs, and potential runtime issues before they reach production.",
  },
  {
    icon: Shield,
    title: "Security Analysis",
    description:
      "Identify security vulnerabilities, unsafe patterns, and best-practice violations.",
  },
  {
    icon: Gauge,
    title: "Complexity Metrics",
    description:
      "Understand cyclomatic complexity, function size, and maintainability at a glance.",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions",
    description:
      "Get intelligent refactoring tips, naming improvements, and performance optimizations.",
  },
  {
    icon: Code2,
    title: "Static Analysis",
    description:
      "Powered by ESLint, Pylint, and language-specific linters for accurate results.",
  },
  {
    icon: Upload,
    title: "Multiple Input Methods",
    description:
      "Paste snippets, upload files, or connect a GitHub repo — review code your way.",
  },
];

const steps = [
  { step: "01", title: "Sign Up", desc: "Create your free account in seconds" },
  { step: "02", title: "Submit Code", desc: "Paste, upload, or link your source code" },
  { step: "03", title: "Get Reviewed", desc: "AI + static analysis runs automatically" },
  { step: "04", title: "Improve", desc: "Fix issues with detailed suggestions" },
];

export default function HomePage() {
  return (
    <div className="gradient-bg grid-pattern min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[500px] animate-pulse-glow rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Bot className="h-4 w-4" />
            AI-Powered Code Review Assistant
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Review code like a{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              senior developer
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Upload your code and get instant feedback on bugs, security issues,
            complexity, and best practices — powered by AI and static analysis tools.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="min-w-44">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="min-w-44">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Code preview mockup */}
          <div className="animate-float mx-auto mt-16 max-w-2xl">
            <div className="glass-card overflow-hidden rounded-2xl text-left shadow-2xl shadow-indigo-500/10">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 font-mono text-xs text-zinc-500">review-output.ts</span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
                <code>
                  <span className="text-zinc-500">{"// AI Review Summary"}</span>
                  {"\n"}
                  <span className="text-emerald-400">✓</span>
                  <span className="text-zinc-300"> Overall Score: </span>
                  <span className="text-cyan-400">87/100</span>
                  {"\n\n"}
                  <span className="text-amber-400">⚠</span>
                  <span className="text-zinc-300"> Line 42: Unused variable </span>
                  <span className="text-red-400">&apos;result&apos;</span>
                  {"\n"}
                  <span className="text-indigo-400">→</span>
                  <span className="text-zinc-400"> Remove or use the variable</span>
                  {"\n\n"}
                  <span className="text-amber-400">⚠</span>
                  <span className="text-zinc-300"> Line 78: High cyclomatic complexity (12)</span>
                  {"\n"}
                  <span className="text-indigo-400">→</span>
                  <span className="text-zinc-400"> Consider splitting into smaller functions</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to write better code
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Two-stage review process combining static analysis tools with AI intelligence.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 transition-all hover:border-indigo-500/20"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
                  <feature.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-zinc-400">From code submission to improvement in four steps</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 font-mono text-lg font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-card rounded-3xl p-10 sm:p-14">
            <Zap className="mx-auto h-10 w-10 text-indigo-400" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight">
              Ready to improve your code?
            </h2>
            <p className="mt-4 text-zinc-400">
              Join developers who use AI Code Review Assistant to catch bugs early
              and ship higher-quality software.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button size="lg">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-8 text-center text-sm text-zinc-500">
        <p>AI Code Review Assistant · Labmentix Internship Project · 2026</p>
      </footer>
    </div>
  );
}
