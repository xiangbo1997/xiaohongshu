import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小红书爆款文案生成器 - AI智能创作助手",
  description: "一键生成小红书爆款文案，支持种草笔记、教程攻略、生活日常多种类型，AI智能创作，让你的笔记轻松上热门！",
  keywords: "小红书文案,爆款文案生成器,AI写作,种草笔记,小红书运营",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
