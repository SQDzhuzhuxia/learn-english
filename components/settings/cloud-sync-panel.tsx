"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, LogOut, Mail, RefreshCw, UploadCloud } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { uploadSyncSnapshot } from "@/lib/sync/cloud-sync";
import { createLocalSyncSnapshot } from "@/lib/sync/local-backup";

export function CloudSyncPanel() {
  const config = useMemo(() => getSupabasePublicConfig(), []);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [message, setMessage] = useState(config.configured ? "" : "Supabase 未配置。");
  const [loading, setLoading] = useState(false);

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
      const result = await uploadSyncSnapshot(supabase, data.user.id, snapshot);
      setMessage(`已上传 ${result.uploadedRecords} 组数据，${result.totalBytes} bytes。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "云同步上传失败。");
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleUploadSnapshot}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
            上传快照
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

      {message ? (
        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {message}
        </p>
      ) : null}
    </section>
  );
}
