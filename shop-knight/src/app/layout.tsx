import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from '@/components/toast-provider';
import { QuickJump } from '@/components/quick-jump';
import { AuthSessionProvider } from '@/components/auth-session-provider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roark Ops — Shop Knight",
  description: "Operations, quoting, and workflow control center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <ToastProvider>
            {children}
            <QuickJump />
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
