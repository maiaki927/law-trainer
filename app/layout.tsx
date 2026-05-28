import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { FeedbackFloatingButton } from "@/components/feedback-floating-button";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "法學練習站",
  description: "民法 / 刑法 練習題目庫",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <ToastProvider>
          <Header />
          <main className="container py-6">{children}</main>
          <FeedbackFloatingButton />
        </ToastProvider>
      </body>
    </html>
  );
}
