import { Mic, PenLine, Repeat, UserRoundCheck } from "lucide-react";
import { practiceModes } from "@/lib/mock-data";

const icons = {
  shadowing: Repeat,
  retelling: Mic,
  writing: PenLine,
  roleplay: UserRoundCheck
};

export default function PracticePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <p className="text-sm font-medium text-accent">练习</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">输出能力训练</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {practiceModes.map((mode) => {
          const Icon = icons[mode.id];

          return (
            <article key={mode.id} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{mode.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
              <button className="mt-5 min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong">
                进入
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
