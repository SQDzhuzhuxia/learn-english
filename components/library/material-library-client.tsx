"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  CircleX,
  FilePlus2,
  Filter,
  Headphones,
  Pencil,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { materialFilters } from "@/lib/mock-data";
import {
  courseTracks,
  createCourseStageRetrospective,
  createCourseStageSummaries
} from "@/lib/content/course-catalog";
import { createAudioCueText } from "@/lib/content/material-audio";
import {
  deleteUserMaterial,
  getSeedMaterials,
  loadMaterials,
  setCurrentMaterialId,
  updateTextMaterial
} from "@/lib/content/material-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToastMessage } from "@/components/ui/toast";
import type { NewTextMaterialInput, StudyMaterialRecord } from "@/lib/content/types";

function createEditForm(material: StudyMaterialRecord): NewTextMaterialInput {
  return {
    title: material.title,
    type: material.type,
    level: material.level,
    contentText: material.contentText,
    audioUrl: material.audio?.url ?? "",
    audioCueText: createAudioCueText(material.audio?.cues)
  };
}

export function MaterialLibraryClient() {
  const [materials, setMaterials] = useState<StudyMaterialRecord[]>(() => getSeedMaterials());
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("合适");
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [editForm, setEditForm] = useState<NewTextMaterialInput | null>(null);
  const [message, setMessage] = useState("");
  useToastMessage(message, { title: "材料库" });

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setMaterials(loadMaterials());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function refreshMaterials() {
    setMaterials(loadMaterials());
  }

  function handleStartEdit(material: StudyMaterialRecord) {
    setEditingMaterialId(material.id);
    setEditForm(createEditForm(material));
    setMessage("");
  }

  function handleCancelEdit() {
    setEditingMaterialId("");
    setEditForm(null);
  }

  function handleSaveEdit(materialId: string) {
    if (!editForm) {
      return;
    }

    const title = editForm.title.trim();
    const contentText = editForm.contentText.trim();

    if (!title) {
      setMessage("材料标题不能为空。");
      return;
    }

    if (contentText.length < 20) {
      setMessage("材料正文太短，请保留一段完整英文文本。");
      return;
    }

    const updated = updateTextMaterial(materialId, {
      title,
      type: editForm.type,
      level: editForm.level,
      contentText
    });

    if (!updated) {
      setMessage("只有用户导入的材料可以编辑。");
      return;
    }

    refreshMaterials();
    handleCancelEdit();
    setMessage("已更新材料，句子列表和关键词已重新生成。");
  }

  function handleDelete(material: StudyMaterialRecord) {
    const confirmed = window.confirm(
      "删除材料后，关联词句会归档、复习卡会暂停。确定删除这篇材料吗？"
    );

    if (!confirmed) {
      return;
    }

    const result = deleteUserMaterial(material.id);

    if (!result.deleted) {
      setMessage("内置材料不能删除，只能删除你导入的材料。");
      return;
    }

    refreshMaterials();
    handleCancelEdit();
    setMessage(
      `已删除材料，归档 ${result.archivedItems} 条关联词句，暂停 ${result.suspendedCards} 张复习卡。`
    );
  }

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesQuery =
        !normalizedQuery ||
        [material.title, material.summary, material.type, ...material.keyExpressions]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesFilter =
        activeFilter === "全部" ||
        activeFilter === "合适" ||
        material.type === activeFilter ||
        material.priority === activeFilter;

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, materials, query]);

  const recommended = materials[0];
  const trackSummaries = useMemo(
    () =>
      courseTracks.map((track) => {
        const trackMaterials = track.materialIds
          .map((id) => materials.find((material) => material.id === id))
          .filter((material): material is StudyMaterialRecord => Boolean(material));
        const completed = trackMaterials.filter((material) => material.status === "已完成").length;
        const started = trackMaterials.filter((material) => material.progress > 0).length;
        const totalMinutes = trackMaterials.reduce((sum, material) => sum + material.minutes, 0);
        const progress = Math.round((completed / Math.max(1, trackMaterials.length)) * 100);
        const nextMaterial =
          trackMaterials.find((material) => material.status !== "已完成") ?? trackMaterials[0];
        const stageSummaries = createCourseStageSummaries(track, materials);
        const currentStage = stageSummaries.find((stage) => stage.isCurrent);
        const retrospective = createCourseStageRetrospective(track, materials);

        return {
          ...track,
          completed,
          started,
          total: trackMaterials.length,
          totalMinutes,
          progress,
          nextMaterial,
          stageSummaries,
          currentStage,
          retrospective
        };
      }),
    [materials]
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="soft">材料库</Badge>
              <h1 className="mt-3 text-2xl font-semibold text-foreground">可理解输入材料中心</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                先选择略高于当前水平的材料。用户导入材料现在可以编辑和删除。
              </p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-fit">
              <Link href="/library/import">
                <FilePlus2 className="h-4 w-4" />
                导入材料
              </Link>
            </Button>
          </div>

          {message ? (
            <p className="mt-4 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-foreground">
              {message}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring">
              <Search className="h-4 w-4 text-muted" />
              <Input
                className="min-h-0 border-0 bg-transparent px-0 py-0 focus:border-0 focus:ring-0"
                placeholder="搜索材料、场景或关键词"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4" />
              {filteredMaterials.length} 篇
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {materialFilters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "soft" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className="shrink-0"
              >
                {filter}
              </Button>
            ))}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">继续学习</CardTitle>
            <Headphones className="h-5 w-5 text-foreground" />
          </div>
          <CardDescription>从当前推荐材料继续你的可理解输入。</CardDescription>
          </CardHeader>
          <CardContent>
          {recommended ? (
            <>
              <p className="text-sm leading-6 text-muted">{recommended.summary}</p>
              <div className="mt-4 rounded-lg border border-border bg-panel-strong p-4">
                <p className="text-sm font-semibold text-foreground">{recommended.title}</p>
                <p className="mt-2 text-xs text-muted">
                  {recommended.type} · {recommended.level} · {recommended.minutes} 分钟
                </p>
                <Progress value={recommended.progress} className="mt-3 bg-white" />
              </div>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link
                  href={`/study/${recommended.id}`}
                  onClick={() => setCurrentMaterialId(recommended.id)}
                >
                  继续学习
                  <ArrowRight className="h-4 w-4 text-foreground" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">暂无材料，先导入一篇文本。</p>
          )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <Badge variant="soft">课程路径</Badge>
          <h2 className="mt-3 text-xl font-semibold text-foreground">按真实目标组织输入材料</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            先按生活、租房、工作和移民方向积累可理解输入，再把每篇材料接到跟读、复述、写作和复习。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {trackSummaries.map((track) => (
            <Card key={track.id} className="min-w-0">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="outline">{track.levelRange}</Badge>
                    <h3 className="mt-3 text-base font-semibold leading-6 text-foreground">{track.title}</h3>
                  </div>
                  <span className="shrink-0 rounded-lg border border-border bg-panel-strong px-2 py-1 text-xs font-semibold text-foreground">
                    {track.total} 篇
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{track.subtitle}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>路径进度</span>
                    <span>{track.progress}%</span>
                  </div>
                  <Progress value={track.progress} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">已开始</p>
                    <p className="mt-1 font-semibold text-foreground">{track.started}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs text-muted">总时长</p>
                    <p className="mt-1 font-semibold text-foreground">{track.totalMinutes}m</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted">{track.focus}</p>
                {track.currentStage ? (
                  <div className="mt-4 rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">当前阶段</p>
                        <p className="mt-1 break-words text-sm font-semibold text-foreground">
                          {track.currentStage.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-muted">
                        {track.currentStage.completed}/{track.currentStage.total}
                      </span>
                    </div>
                    <Progress value={track.currentStage.progress} className="mt-3 bg-panel-strong" />
                    <p className="mt-3 text-xs leading-5 text-muted">{track.currentStage.goal}</p>
                    <div className="mt-3 space-y-2">
                      {track.currentStage.completionCriteria.slice(0, 2).map((criterion) => (
                        <p key={criterion} className="flex gap-2 text-xs leading-5 text-muted">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                          <span>{criterion}</span>
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 rounded-lg bg-panel-strong px-3 py-2 text-xs leading-5 text-muted">
                      输出任务：{track.currentStage.outputTask}
                    </p>
                  </div>
                ) : null}
                {track.retrospective.hasCompletedStage ? (
                  <div className="mt-4 rounded-lg border border-border bg-panel-strong p-3">
                    <p className="text-xs font-medium text-muted">阶段复盘</p>
                    <p className="mt-1 break-words text-sm font-semibold text-foreground">
                      {track.retrospective.headline}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">{track.retrospective.advice}</p>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.outcomes.slice(0, 2).map((outcome) => (
                    <Badge key={outcome} variant="soft">
                      {outcome}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {track.stageSummaries.map((stage) => (
                    <span
                      key={stage.id}
                      className={`h-1.5 flex-1 rounded-full ${
                        stage.progress >= 100
                          ? "bg-foreground"
                          : stage.isCurrent
                            ? "bg-muted"
                            : "bg-border"
                      }`}
                      title={`${stage.title} ${stage.progress}%`}
                    />
                  ))}
                </div>
                {track.nextMaterial ? (
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link
                      href={`/study/${track.nextMaterial.id}`}
                      onClick={() => setCurrentMaterialId(track.nextMaterial.id)}
                    >
                      进入下一篇
                      <ArrowRight className="h-4 w-4 text-foreground" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredMaterials.map((material) => (
          <Card key={material.id}>
            <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="soft">
                  {material.priority}
                </Badge>
                <h2 className="mt-3 text-lg font-semibold text-foreground">{material.title}</h2>
              </div>
              <div className="flex shrink-0 gap-2">
                {material.source === "user" ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleStartEdit(material)}
                      aria-label="编辑材料"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(material)}
                      className="border-border text-foreground hover:bg-panel-strong"
                      aria-label="删除材料"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <ClipboardList className="h-5 w-5 shrink-0 text-foreground" />
                )}
              </div>
            </div>

            {editingMaterialId === material.id && editForm ? (
              <div className="mt-5 space-y-3 rounded-lg border border-border bg-panel-strong p-4">
                <Label className="block">
                  标题
                  <Input
                    className="mt-2"
                    value={editForm.title}
                    onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                  />
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label className="block">
                    类型
                    <select
                      className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none"
                      value={editForm.type}
                      onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}
                    >
                      <option>用户导入</option>
                      <option>美国生活</option>
                      <option>职场</option>
                      <option>自动化</option>
                      <option>入籍</option>
                    </select>
                  </Label>
                  <Label className="block">
                    难度
                    <select
                      className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none"
                      value={editForm.level}
                      onChange={(event) => setEditForm({ ...editForm, level: event.target.value })}
                    >
                      <option>A1</option>
                      <option>A1+</option>
                      <option>A2</option>
                      <option>B1</option>
                    </select>
                  </Label>
                </div>
                <Label className="block">
                  英文文本
                  <Textarea
                    className="mt-2 min-h-48"
                    value={editForm.contentText}
                    onChange={(event) => setEditForm({ ...editForm, contentText: event.target.value })}
                  />
                </Label>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Label className="block">
                    材料音频 URL
                    <Input
                      className="mt-2"
                      placeholder="https://example.com/audio.mp3"
                      value={editForm.audioUrl ?? ""}
                      onChange={(event) => setEditForm({ ...editForm, audioUrl: event.target.value })}
                    />
                  </Label>
                  <Label className="block">
                    句子时间轴
                    <Textarea
                      className="mt-2 min-h-28"
                      placeholder={"1,0:00,0:03\n2,0:03,0:07"}
                      value={editForm.audioCueText ?? ""}
                      onChange={(event) => setEditForm({ ...editForm, audioCueText: event.target.value })}
                    />
                  </Label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <CircleX className="h-4 w-4 text-muted" />
                    取消
                  </Button>
                  <Button
                    onClick={() => handleSaveEdit(material.id)}
                  >
                    <Check className="h-4 w-4" />
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">{material.summary}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">
                {material.type}
              </Badge>
              <Badge variant="outline">
                {material.inputType}
              </Badge>
              <Badge variant="outline">
                {material.level}
              </Badge>
              <Badge variant="outline">
                {material.source === "user" ? "可编辑" : "内置"}
              </Badge>
              {material.audio ? (
                <Badge variant="soft">
                  材料音频
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted">时间</p>
                <p className="mt-1 font-semibold text-foreground">{material.minutes}m</p>
              </div>
              <div>
                <p className="text-xs text-muted">句子</p>
                <p className="mt-1 font-semibold text-foreground">{material.segments.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted">状态</p>
                <p className="mt-1 font-semibold text-foreground">{material.status}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>学习进度</span>
                <span>{material.progress}%</span>
              </div>
              <Progress value={material.progress} className="mt-2" />
            </div>

            <div className="mt-4 space-y-2">
              {material.keyExpressions.slice(0, 2).map((expression) => (
                <p key={expression} className="rounded-lg bg-panel-strong px-3 py-2 text-sm text-muted">
                  {expression}
                </p>
              ))}
            </div>

            <Button asChild variant="outline" className="mt-5 w-full">
              <Link
                href={`/study/${material.id}`}
                onClick={() => setCurrentMaterialId(material.id)}
              >
                打开材料
                <ArrowRight className="h-4 w-4 text-foreground" />
              </Link>
            </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="soft">导入入口</Badge>
            <h2 className="mt-2 text-lg font-semibold text-foreground">粘贴一段英文文本，自动分句并保存</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              现在先支持纯文本导入。后续会继续加入字幕、URL、音频转写和云同步。
            </p>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/library/import">
              <Upload className="h-4 w-4 text-foreground" />
              准备导入
            </Link>
          </Button>
        </div>
        </CardContent>
      </Card>
    </main>
  );
}
