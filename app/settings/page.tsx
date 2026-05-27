import { Cloud, KeyRound, Languages, SlidersHorizontal } from "lucide-react";

const settings = [
  {
    icon: Languages,
    label: "目标英语",
    value: "美式英语"
  },
  {
    icon: SlidersHorizontal,
    label: "每日目标",
    value: "30-60 分钟"
  },
  {
    icon: Cloud,
    label: "数据同步",
    value: "待接入"
  },
  {
    icon: KeyRound,
    label: "AI 供应商",
    value: "待配置"
  }
];

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <p className="text-sm font-medium text-accent">设置</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">学习和系统配置</h1>
      </section>

      <section className="grid gap-3">
        {settings.map((item) => (
          <div
            key={item.label}
            className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-panel p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-foreground">{item.label}</p>
            </div>
            <p className="text-sm font-medium text-muted">{item.value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
