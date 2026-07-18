"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Code2,
  FilePlus2,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Workspace summary",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/new",
    label: "New Review",
    description: "Submit code",
    icon: FilePlus2,
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    description: "Review history",
    icon: History,
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    description: "Workspace grouping",
    icon: FolderKanban,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Account and security",
    icon: Settings,
  },
];

const getInitial = (name?: string) => name?.trim().charAt(0).toUpperCase() || "U";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentItem =
    navItems.find((item) =>
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
    ) || navItems[0];

  const renderNavLink = (item: NavItem) => {
    const active =
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
          active
            ? "bg-indigo-500/15 text-white ring-1 ring-indigo-500/25"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            active
              ? "bg-indigo-500 text-white"
              : "bg-white/5 text-zinc-500 group-hover:text-zinc-200"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium leading-5">{item.label}</span>
          <span className="block truncate text-xs text-zinc-500">{item.description}</span>
        </span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <Code2 className="h-5 w-5 text-indigo-300" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Code<span className="text-indigo-300">Review</span> AI
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">{navItems.map(renderNavLink)}</nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-500/25">
            {getInitial(user?.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
            <span className="block truncate text-xs text-zinc-500">{user?.email}</span>
          </span>
        </div>
        <Button variant="danger" className="w-full" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="gradient-bg grid-pattern min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#07070b]/90 backdrop-blur-xl lg:block">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative h-full w-80 max-w-[calc(100vw-2rem)] border-r border-white/10 bg-[#07070b]">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07070b]/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
                  onClick={() => setMobileOpen((open) => !open)}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-indigo-300">
                    {currentItem.label}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{currentItem.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5">
                <User className="h-4 w-4 text-cyan-300" />
                <span className="hidden max-w-40 truncate text-sm text-zinc-300 sm:block">
                  {user?.name}
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
