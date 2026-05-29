"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  LogOut,
  Mail,
  RefreshCw,
  UploadCloud,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  compareSyncHashes,
  createSyncMergePlan,
  downloadSyncRecords,
  pickRemoteRecordsToRestore,
  uploadSyncSnapshot
} from "@/lib/sync/cloud-sync";
import type { CloudSyncClient } from "@/lib/sync/cloud-sync";
import {
  createSyncSnapshotFingerprint,
  loadAutoSyncUploadState,
  loadAutoSyncPreference,
  loadCloudSyncLastEvent,
  saveCloudSyncLastEvent,
  saveAutoSyncPreference,
  saveAutoSyncUploadState
} from "@/lib/sync/auto-sync";
import { createLocalSyncSnapshot, restoreSyncRecords } from "@/lib/sync/local-backup";
import { summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";
import type { CloudSyncLastEvent } from "@/lib/sync/auto-sync";
import type { SyncSnapshotPayload, SyncableStorageKey } from "@/lib/sync/sync-snapshot";

type PendingSyncAction =
  | {
      type: "upload";
      snapshot: SyncSnapshotPayload;
      fingerprint: string;
      recordCount: number;
      totalBytes: number;
    }
  | {
      type: "download";
      recordsToRestore: Partial<Record<SyncableStorageKey, string>>;
      comparison: ReturnType<typeof compareSyncHashes>;
      restoreCount: number;
      downloadedRecords: number;
    };

function formatSyncComparison(comparison: ReturnType<typeof compareSyncHashes>) {
  return `相同 ${comparison.same} 组，本地独有 ${comparison.localOnly} 组，云端新增 ${comparison.remoteOnly} 组，双方不同 ${comparison.changed} 组。`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createLastEvent(event: Omit<CloudSyncLastEvent, "occurredAt">): CloudSyncLastEvent {
  return {
    ...event,
    occurredAt: new Date().toISOString()
  };
}

export function CloudSyncPanel() {
  const config = useMemo(() => getSupabasePublicConfig(), []);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [message, setMessage] = useState(config.configured ? "" : "Supabase 未配置。");
  const [loading, setLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => loadAutoSyncPreference());
  const [pendingAction, setPendingAction] = useState<PendingSyncAction | null>(null);
  const [lastUploadState, setLastUploadState] = useState(() => loadAutoSyncUploadState());
  const [lastSyncEvent, setLastSyncEvent] = useState(() => loadCloudSyncLastEvent());

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSessionEmail(data.session?.user.email ?? "");
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? "");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function rememberSyncEvent(event: CloudSyncLastEvent) {
    saveCloudSyncLastEvent(event);
    setLastSyncEvent(event);
  }

  async function getCurrentUserId() {
    if (!supabase || !sessionEmail) {
      setMessage("请先登录账号。");
      return "";
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setMessage(error?.message ?? "无法读取当前账号。");
      return "";
    }

    return data.user.id;
  }

  async function handleSendMagicLink() {
    if (!supabase || !email.trim()) {
      setMessage("请输入邮箱。");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + "/settings"
      }
    });

    setLoading(false);
    setMessage(error ? error.message : "登录邮件已发送。");
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    setSessionEmail("");
    setPendingAction(null);
    setLoading(false);
    setMessage("已退出账号。");
  }

  async function handleUploadSnapshot() {
    if (!supabase || !sessionEmail) {
      setMessage("请先登录账号。");
      return;
    }

    const snapshot = createLocalSyncSnapshot("browser");
    const fingerprint = createSyncSnapshotFingerprint(snapshot);
    const summary = summarizeSyncSnapshot(snapshot);

    setPendingAction({
      type: "upload",
      snapshot,
      fingerprint,
      recordCount: summary.recordCount,
      totalBytes: summary.totalBytes
    });
    setMessage(`准备上传 ${summary.recordCount} 组本地数据，${summary.totalBytes} bytes。请确认后执行。`);
  }

  function handleToggleAutoSync(enabled: boolean) {
    saveAutoSyncPreference(enabled);
    setAutoSyncEnabled(enabled);
    setMessage(enabled ? "已开启自动上传变化快照。" : "已关闭自动上传。");
  }

  async function handleCheckRemoteChanges() {
    if (!supabase || !sessionEmail) {
      setMessage("请先登录账号。");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setLoading(false);
      setMessage(error?.message ?? "无法读取当前账号。");
      return;
    }

    try {
      const localSnapshot = createLocalSyncSnapshot("browser");
      const result = await downloadSyncRecords(supabase as unknown as CloudSyncClient, data.user.id);
      const localHashes = summarizeSyncSnapshot(localSnapshot).hashes;
      const comparison = compareSyncHashes(localHashes, result.hashes);
      const mergePlan = createSyncMergePlan(localHashes, result.hashes);
      const restoreCount = mergePlan.filter((item) => item.willRestore).length;
      const event = createLastEvent({
        type: "check",
        message: `云端差异检查完成：拉取时会恢复 ${restoreCount} 组。`,
        recordCount: result.downloadedRecords
      });

      rememberSyncEvent(event);
      setPendingAction(null);
      setMessage(`云端差异检查：${formatSyncComparison(comparison)} 拉取时会恢复 ${restoreCount} 组，本地独有数据会保留。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步差异检查失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadRecords() {
    if (!supabase || !sessionEmail) {
      setMessage("请先登录账号。");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setLoading(false);
      setMessage(error?.message ?? "无法读取当前账号。");
      return;
    }

    try {
      const localSnapshot = createLocalSyncSnapshot("browser");
      const result = await downloadSyncRecords(supabase as unknown as CloudSyncClient, data.user.id);
      const localHashes = summarizeSyncSnapshot(localSnapshot).hashes;
      const comparison = compareSyncHashes(localHashes, result.hashes);
      const mergePlan = createSyncMergePlan(localHashes, result.hashes);
      const recordsToRestore = pickRemoteRecordsToRestore(result.records, mergePlan);
      const restoreCount = mergePlan.filter((item) => item.willRestore).length;

      setPendingAction({
        type: "download",
        recordsToRestore,
        comparison,
        restoreCount,
        downloadedRecords: result.downloadedRecords
      });
      setMessage(
        `准备拉取云端数据：${formatSyncComparison(comparison)} 确认后会恢复 ${restoreCount} 组，本地独有数据会保留。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步拉取失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (pendingAction.type === "upload") {
        const userId = await getCurrentUserId();

        if (!userId || !supabase) {
          return;
        }

        const result = await uploadSyncSnapshot(
          supabase as unknown as CloudSyncClient,
          userId,
          pendingAction.snapshot
        );
        const uploadedAt = new Date().toISOString();
        const event = createLastEvent({
          type: "manual-upload",
          message: `已上传 ${result.uploadedRecords} 组数据，${result.totalBytes} bytes。`,
          recordCount: result.uploadedRecords,
          totalBytes: result.totalBytes
        });

        saveAutoSyncUploadState(pendingAction.fingerprint, uploadedAt);
        setLastUploadState({
          fingerprint: pendingAction.fingerprint,
          uploadedAt
        });
        rememberSyncEvent(event);
        setPendingAction(null);
        setMessage(event.message);
        return;
      }

      const restoredCount = restoreSyncRecords(pendingAction.recordsToRestore);
      const event = createLastEvent({
        type: "download",
        message: `已拉取 ${restoredCount} 组云端数据，本地独有数据已保留。`,
        recordCount: restoredCount
      });

      rememberSyncEvent(event);
      setPendingAction(null);
      setMessage(
        `${event.message}${formatSyncComparison(pendingAction.comparison)} 刷新页面后生效。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步操作失败。");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelPendingAction() {
    setPendingAction(null);
    setMessage("已取消待确认的同步操作。");
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>云同步账号</CardTitle>
              <CardDescription>
                {sessionEmail || (config.configured ? "可登录" : "未配置")}
              </CardDescription>
            </div>
          </div>
          <Badge variant={sessionEmail ? "success" : config.configured ? "outline" : "warning"}>
            {sessionEmail ? "已登录" : config.configured ? "待登录" : "未配置"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {sessionEmail ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Button onClick={handleUploadSnapshot} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
              上传快照
            </Button>
            <Button onClick={handleDownloadRecords} disabled={loading} variant="outline">
              <Cloud className="h-4 w-4" />
              拉取云端
            </Button>
            <Button onClick={handleCheckRemoteChanges} disabled={loading} variant="outline">
              <RefreshCw className="h-4 w-4" />
              检查差异
            </Button>
            <Button onClick={handleSignOut} disabled={loading} variant="secondary">
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <Label htmlFor="cloud-sync-email">登录邮箱</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                id="cloud-sync-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!config.configured || loading}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Button onClick={handleSendMagicLink} disabled={!config.configured || loading}>
                {loading ? <RefreshCw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                邮件登录
              </Button>
            </div>
          </div>
        )}

        {pendingAction ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  {pendingAction.type === "upload" ? "确认上传本地快照" : "确认拉取云端数据"}
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {pendingAction.type === "upload"
                    ? `将上传 ${pendingAction.recordCount} 组本地数据，大小 ${pendingAction.totalBytes} bytes。`
                    : `云端共有 ${pendingAction.downloadedRecords} 组数据，本次会恢复 ${pendingAction.restoreCount} 组。${formatSyncComparison(pendingAction.comparison)}`}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleConfirmPendingAction} disabled={loading}>
                    <CheckCircle2 className="h-4 w-4" />
                    {pendingAction.type === "upload" ? "确认上传" : "确认拉取"}
                  </Button>
                  <Button onClick={handleCancelPendingAction} disabled={loading} variant="outline">
                    <XCircle className="h-4 w-4" />
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Separator className="my-5" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel-strong text-accent">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">自动上传变化快照</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                登录后会在回到前台、恢复在线和固定间隔时上传变化数据；本地学习不受同步失败影响。
              </p>
            </div>
          </div>
          <Switch
            checked={autoSyncEnabled}
            disabled={!config.configured || loading}
            onCheckedChange={handleToggleAutoSync}
            aria-label="自动上传变化快照"
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-panel-strong p-3">
            <p className="text-sm font-semibold text-foreground">最近同步状态</p>
            {lastSyncEvent ? (
              <>
                <p className="mt-2 text-sm leading-6 text-muted">{lastSyncEvent.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDateTime(lastSyncEvent.occurredAt)} · {lastSyncEvent.type}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">还没有云同步操作记录。</p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-panel-strong p-3">
            <p className="text-sm font-semibold text-foreground">最近上传快照</p>
            {lastUploadState ? (
              <>
                <p className="mt-2 text-sm leading-6 text-muted">
                  已记录快照指纹 {lastUploadState.fingerprint.slice(0, 10)}...
                </p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(lastUploadState.uploadedAt)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">暂无上传快照记录。</p>
            )}
          </div>
        </div>

        {message ? (
          <p className="mt-5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-sky-800">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
