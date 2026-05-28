import { Database, Download, KeyRound } from "lucide-react";
import { settingsGroups } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <p className="text-sm font-medium text-accent">设置</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">学习和系统配置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          这里先展示未来配置结构：学习目标、AI 和语音、云同步与离线。Sprint 2 之后会逐步接入真实配置。
        </p>
      </section>

      <section className="grid gap-5">
        {settingsGroups.map((group) => (
          <article key={group.title} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{group.description}</p>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {group.items.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium text-accent">{item.value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">数据策略</h2>
              <p className="mt-1 text-sm text-muted">个人学习数据优先可导出、可迁移。</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["材料", "词句", "复习记录", "练习反馈"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-muted">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">本地开发提示</h2>
              <p className="mt-1 text-sm text-muted">密钥放在 `.env`，仓库只保留 `.env.example`。</p>
            </div>
          </div>
          <button className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong">
            <Download className="h-4 w-4 text-accent" />
            后续支持导出数据
          </button>
        </div>
      </section>
    </main>
  );
}
