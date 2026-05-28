"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  Library,
  RotateCcw,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  {
    href: "/",
    label: "今日",
    icon: Target
  },
  {
    href: "/library",
    label: "材料",
    icon: Library
  },
  {
    href: "/study",
    label: "学习",
    icon: BookOpenText
  },
  {
    href: "/notebook",
    label: "词句",
    icon: BookMarked
  },
  {
    href: "/review",
    label: "复习",
    icon: RotateCcw
  },
  {
    href: "/practice",
    label: "练习",
    icon: Sparkles
  },
  {
    href: "/progress",
    label: "进度",
    icon: ChartNoAxesColumnIncreasing
  },
  {
    href: "/settings",
    label: "设置",
    icon: Settings
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-border bg-panel px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Learn English</p>
            <p className="text-xs text-muted">AI Immersion</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-panel-strong hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-panel/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted">美国工作 · 生活 · 移民</p>
              <p className="text-sm font-semibold text-foreground">今日输入驱动训练</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/progress"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-panel-strong hover:text-foreground lg:hidden"
                aria-label="进度"
              >
                <ChartNoAxesColumnIncreasing className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-panel-strong hover:text-foreground lg:hidden"
                aria-label="设置"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-panel-strong px-3 py-2 text-xs font-medium text-muted sm:flex">
                30-60 min
              </div>
            </div>
          </div>
        </header>

        <div className="pb-20 lg:pb-0">{children}</div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-border bg-panel px-2 py-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] lg:hidden">
        {navigation.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${
                active ? "bg-accent-soft text-accent" : "text-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
