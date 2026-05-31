"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, WifiOff } from "lucide-react";
import { loadAutoSyncUploadState, loadCloudSyncLastEvent } from "@/lib/sync/auto-sync";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export function SyncStatusPill() {
  const [online, setOnline] = useState(true);
  const [label, setLabel] = useState("本地");
  const [detail, setDetail] = useState("本机学习数据可用。");

  useEffect(() => {
    function refreshStatus() {
      const nextOnline =
        typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;
      const lastEvent = loadCloudSyncLastEvent();
      const lastUpload = loadAutoSyncUploadState();

      setOnline(nextOnline);

      if (!nextOnline) {
        setLabel("离线");
        setDetail("离线状态下可继续学习，恢复网络后会重试可恢复的任务。");
        return;
      }

      if (lastEvent) {
        setLabel("同步");
        setDetail(`${lastEvent.message} ${formatDateTime(lastEvent.occurredAt)}`);
        return;
      }

      if (lastUpload) {
        setLabel("已上传");
        setDetail(`最近上传 ${formatDateTime(lastUpload.uploadedAt)}`);
        return;
      }

      setLabel("本地");
      setDetail("本机学习数据可用。");
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshStatus();
      }
    }

    refreshStatus();
    window.addEventListener("online", refreshStatus);
    window.addEventListener("offline", refreshStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", refreshStatus);
      window.removeEventListener("offline", refreshStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="outline" size="sm" className="min-h-9 px-2 sm:px-3">
          <Link href="/settings">
            {online ? <Cloud className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{label}</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}
