"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Library,
  RotateCcw,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import { PwaInstallStatus } from "@/components/pwa/pwa-install-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
  const activeItem = navigation.find((item) => isActive(pathname, item.href)) ?? navigation[0];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-border bg-panel/95 px-4 py-5 shadow-sm lg:block">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">Learn English</p>
              <p className="text-xs font-medium text-muted">AI Immersion System</p>
            </div>
          </Link>

          <div className="mt-5 rounded-lg border border-border bg-panel-strong p-3">
            <p className="text-xs font-medium text-muted">Daily Focus</p>
            <p className="mt-1 text-sm font-semibold text-foreground">30-60 min input loop</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="soft">A1-A2</Badge>
              <Badge variant="outline">en-US</Badge>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted hover:bg-panel-strong hover:text-foreground"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {active ? (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-transparent transition group-hover:bg-border" />
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-10 border-b border-border bg-panel/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">美国工作 · 生活 · 移民</p>
                <div className="mt-1 flex items-center gap-2">
                  <activeItem.icon className="h-4 w-4 shrink-0 text-accent" />
                  <p className="truncate text-sm font-semibold text-foreground">{activeItem.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PwaInstallStatus />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="lg:hidden" aria-label="进度">
                      <Link href="/progress">
                        <ChartNoAxesColumnIncreasing className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看进度</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="lg:hidden" aria-label="设置">
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>打开设置</TooltipContent>
                </Tooltip>
                <Badge variant="outline" className="hidden min-h-9 items-center px-3 sm:inline-flex">
                  30-60 min
                </Badge>
              </div>
            </div>
          </header>

          <div className="pb-20 lg:pb-0">{children}</div>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-border bg-panel/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          {navigation.slice(0, 5).map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition",
                  active ? "bg-accent text-white shadow-sm" : "text-muted hover:bg-panel-strong"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}
