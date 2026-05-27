import { FilePlus2, Filter, Headphones, Search } from "lucide-react";
import { materials } from "@/lib/mock-data";

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">材料库</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">可理解输入材料</h1>
          </div>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong">
            <FilePlus2 className="h-4 w-4" />
            导入材料
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              placeholder="搜索材料、场景或关键词"
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-strong">
            <Filter className="h-4 w-4 text-accent" />
            筛选
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {materials.map((material) => (
          <article key={material.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                  {material.type}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{material.title}</h2>
              </div>
              <Headphones className="h-5 w-5 shrink-0 text-accent" />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{material.summary}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-border bg-white p-3">
                <dt className="text-xs text-muted">难度</dt>
                <dd className="mt-1 font-semibold text-foreground">{material.level}</dd>
              </div>
              <div className="rounded-lg border border-border bg-white p-3">
                <dt className="text-xs text-muted">时间</dt>
                <dd className="mt-1 font-semibold text-foreground">{material.minutes}m</dd>
              </div>
              <div className="rounded-lg border border-border bg-white p-3">
                <dt className="text-xs text-muted">状态</dt>
                <dd className="mt-1 font-semibold text-foreground">{material.status}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
