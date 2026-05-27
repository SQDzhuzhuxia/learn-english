import { Activity, BarChart3, Map } from "lucide-react";
import { progressStats, scenarioMap } from "@/lib/mock-data";

export default function ProgressPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-accent">进度</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">本周学习数据</h1>
          </div>
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {progressStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-white p-4">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">场景能力地图</h2>
          <Map className="h-5 w-5 text-accent" />
        </div>
        <div className="mt-4 space-y-3">
          {scenarioMap.map((scenario) => (
            <div key={scenario.name} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{scenario.name}</p>
                  <p className="mt-1 text-sm text-muted">{scenario.status}</p>
                </div>
                <Activity className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-panel-strong">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${scenario.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
