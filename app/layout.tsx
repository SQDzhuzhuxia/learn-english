import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { CloudAutoSync } from "@/components/sync/cloud-auto-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn English",
  description: "Personal AI English immersion app for U.S. work, life, and immigration goals.",
  applicationName: "Learn English",
  appleWebApp: {
    capable: true,
    title: "Learn English"
  }
};

export const viewport: Viewport = {
  themeColor: "#f7f7f8",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ServiceWorkerRegister />
        <CloudAutoSync />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
