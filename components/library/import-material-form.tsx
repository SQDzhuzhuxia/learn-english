"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, Sparkles } from "lucide-react";
import { addTextMaterial } from "@/lib/content/material-store";
import { splitTextIntoSegments } from "@/lib/content/split-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const defaultText =
  "I would like to make an appointment with a doctor. I have had a sore throat since yesterday. Do you have any openings this afternoon?";

export function ImportMaterialForm() {
  const router = useRouter();
  const [title, setTitle] = useState("My First Imported Text");
  const [type, setType] = useState("用户导入");
  const [level, setLevel] = useState("A1+");
  const [contentText, setContentText] = useState(defaultText);
  const [error, setError] = useState("");

  const segments = useMemo(() => splitTextIntoSegments(contentText), [contentText]);
  const wordCount = useMemo(
    () => contentText.trim().split(/\s+/).filter(Boolean).length,
    [contentText]
  );

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedText = contentText.trim();

    if (!trimmedTitle) {
      setError("请给材料起一个标题。");
      return;
    }

    if (trimmedText.length < 20 || segments.length === 0) {
      setError("请至少粘贴一段完整英文文本。");
      return;
    }

    const material = addTextMaterial({
      title: trimmedTitle,
      type,
      level,
      contentText: trimmedText
    });

    router.push(`/study/${material.id}`);
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <Card>
        <CardContent className="pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="soft">导入材料</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">粘贴英文文本</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Sprint 2 先支持文本导入：保存到本地浏览器，自动分句，然后进入学习页。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/library">
              <ArrowLeft className="h-4 w-4 text-accent" />
              返回材料库
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Label className="md:col-span-2">
            标题
            <Input
              className="mt-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Label>
          <Label>
            难度
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option>A1</option>
              <option>A1+</option>
              <option>A2</option>
              <option>B1</option>
            </select>
          </Label>
          <Label>
            类型
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>用户导入</option>
              <option>美国生活</option>
              <option>职场</option>
              <option>自动化</option>
              <option>入籍</option>
            </select>
          </Label>
        </div>

        <Label className="mt-5 block">
          英文文本
          <Textarea
            className="mt-2 min-h-72"
            value={contentText}
            onChange={(event) => {
              setContentText(event.target.value);
              setError("");
            }}
          />
        </Label>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <Button
          onClick={handleSubmit}
          size="lg"
          className="mt-5 w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          保存并开始学习
        </Button>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-5">
        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">导入预览</CardTitle>
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <CardDescription>系统会先分句，再进入学习页逐句精学。</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{segments.length}</p>
              <p className="mt-1 text-xs text-muted">自动分句</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-2xl font-semibold text-foreground">{wordCount}</p>
              <p className="mt-1 text-xs text-muted">约词数</p>
            </div>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">前 5 句</CardTitle>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {segments.slice(0, 5).map((segment) => (
              <div key={segment.id} className="rounded-lg border border-border bg-white p-3">
                <p className="text-xs font-medium text-muted">Sentence {segment.order}</p>
                <p className="mt-1 text-sm leading-6 text-foreground">{segment.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
