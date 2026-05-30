import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Headphones,
  Play,
  RefreshCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { dailyPlan, progressStats, reviewCards, studyQueue } from "@/lib/mock-data";

export default function TodayPage() {
  const dueCards = reviewCards.filter((card) => card.dueToday);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <CardContent className="pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="soft">{dailyPlan.dateLabel} · 今日计划</Badge>
              <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
                {dailyPlan.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{dailyPlan.focus}</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 rounded-lg border border-border bg-panel-strong p-3 lg:w-44">
              <div className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>今日进度</span>
                <span>{dailyPlan.completion}%</span>
              </div>
              <Progress value={dailyPlan.completion} />
              <div className="flex items-center gap-2 text-xs text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {dailyPlan.durationMinutes} 分钟模式
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dailyPlan.steps.map((step, index) => (
              <article
                key={step.id}
                className={`rounded-lg border p-4 ${
                  step.status === "current"
                    ? "border-foreground/15 bg-panel-strong"
                    : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-muted">{step.minutes} 分钟</span>
                </div>
                <p className="mt-4 text-xs font-medium text-muted">Step {index + 1}</p>
                <h2 className="mt-1 text-base font-semibold text-foreground">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/study">
                <Play className="h-4 w-4" />
                继续今日学习
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/review">
                <RefreshCcw className="h-4 w-4" />
                先完成复习
              </Link>
            </Button>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">当前材料</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                {dailyPlan.currentMaterial.title}
              </h2>
            </div>
            <BookOpenText className="h-5 w-5 text-accent" />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-muted">
                <span>{dailyPlan.currentMaterial.type} · {dailyPlan.currentMaterial.level}</span>
                <span>{dailyPlan.currentMaterial.progress}%</span>
              </div>
              <Progress value={dailyPlan.currentMaterial.progress} className="mt-2" />
            </div>

            <div className="rounded-lg border border-border bg-panel-strong p-4">
              <p className="text-sm font-semibold text-foreground">
                {dailyPlan.currentMaterial.nextAction}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                先把当前句听懂、读顺，再保存 appointment 相关表达。
              </p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href="/study">
                进入学习器
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="soft">今日队列</Badge>
              <CardTitle className="mt-3">下一步做什么</CardTitle>
            </div>
            <Headphones className="h-5 w-5 text-accent" />
          </div>
          </CardHeader>
          <CardContent>
          <div className="divide-y divide-border rounded-lg border border-border bg-white">
            {studyQueue.map((item) => (
              <Link
                href={item.href}
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 transition hover:bg-panel-strong"
              >
                <div>
                  <p className="text-xs font-medium text-muted">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted">
                  {item.action}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>今日复习</CardTitle>
              <CalendarCheck className="h-5 w-5 text-accent" />
            </div>
            <CardDescription>
              {dueCards.length} 张词句卡到期，优先复习来自真实材料的句子。
            </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-2">
              {dueCards.slice(0, 3).map((card) => (
                <div key={card.id} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-sm font-medium text-foreground">{card.front}</p>
                  <p className="mt-1 text-xs text-muted">{card.cardType} · {card.difficulty}</p>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>本周进度</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {progressStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
                  <p className="mt-1 text-xs text-muted">{stat.hint}</p>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardContent className="pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="soft">学习原则</Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">今天只需要跟着流程走</h2>
          </div>
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            {dailyPlan.habits.map((habit) => (
              <div key={habit.label} className="rounded-lg border border-border bg-white px-3 py-2">
                <p className="font-semibold text-foreground">{habit.value}</p>
                <p className="mt-1 text-xs">{habit.label}</p>
              </div>
            ))}
          </div>
        </div>
        <Separator className="my-4" />
        <p className="mt-4 text-sm leading-6 text-muted">
          初级阶段不靠硬聊推进，先让听读输入变得可理解；输出只做跟读、复述和短句表达，所有不会的内容进入复习。
        </p>
        </CardContent>
      </Card>
    </main>
  );
}
