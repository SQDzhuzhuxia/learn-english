"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, LogOut, Mail, RefreshCw, UploadCloud } from "lucide-react";
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
  loadAutoSyncPreference,
  saveAutoSyncPreference,
  saveAutoSyncUploadState
} from "@/lib/sync/auto-sync";
import { createLocalSyncSnapshot, restoreSyncRecords } from "@/lib/sync/local-backup";
import { summarizeSyncSnapshot } from "@/lib/sync/sync-snapshot";

function formatSyncComparison(comparison: ReturnType<typeof compareSyncHashes>) {
  return `相同 ${comparison.same} 组，本地独有 ${comparison.localOnly} 组，云端新增 ${comparison.remoteOnly} 组，双方不同 ${comparison.changed} 组。`;
}

export function CloudSyncPanel() {
  const config = useMemo(() => getSupabasePublicConfig(), []);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [message, setMessage] = useState(config.configured ? "" : "Supabase 未配置。");
  const [loading, setLoading] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => loadAutoSyncPreference());

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
    setLoading(false);
    setMessage("已退出账号。");
  }

  async function handleUploadSnapshot() {
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
      const snapshot = createLocalSyncSnapshot("browser");
      const fingerprint = createSyncSnapshotFingerprint(snapshot);
      const result = await uploadSyncSnapshot(supabase as unknown as CloudSyncClient, data.user.id, snapshot);
      saveAutoSyncUploadState(fingerprint);
      setMessage(`已上传 ${result.uploadedRecords} 组数据，${result.totalBytes} bytes。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步上传失败。");
    } finally {
      setLoading(false);
    }
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
      const restoredCount = restoreSyncRecords(recordsToRestore);
      setMessage(
        `已拉取 ${restoredCount} 组云端数据。${formatSyncComparison(comparison)} 本地独有数据已保留，刷新页面后生效。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步拉取失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">云同步账号</h2>
          <p className="mt-1 text-sm text-muted">
            {sessionEmail || (config.configured ? "可登录" : "未配置")}
          </p>
        </div>
      </div>

      {sessionEmail ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <button
            onClick={handleUploadSnapshot}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
            上传快照
          </button>
          <button
            onClick={handleDownloadRecords}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Cloud className="h-4 w-4 text-accent" />
            拉取云端
          </button>
          <button
            onClick={handleCheckRemoteChanges}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className="h-4 w-4 text-accent" />
            检查差异
          </button>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-panel-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogOut className="h-4 w-4 text-accent" />
            退出登录
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!config.configured || loading}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="min-h-10 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-panel-strong"
          />
          <button
            onClick={handleSendMagicLink}
            disabled={!config.configured || loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <RefreshCw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            邮件登录
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            disabled={!config.configured || loading}
            onChange={(event) => handleToggleAutoSync(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-accent disabled:cursor-not-allowed"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">自动上传变化快照</span>
            <span className="mt-1 block text-sm leading-6 text-muted">
              登录后会在回到前台、恢复在线和固定间隔时上传变化数据；本地学习不受同步失败影响。
            </span>
          </span>
        </label>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {message}
        </p>
      ) : null}
    </section>
  );
}
