import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Academic Digital Twin",
  description: "A simulation engine that models your academic life to predict GPA, burnout risk, and optimal schedules.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 antialiased transition-colors duration-200" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <div className="flex min-h-[calc(100vh-3.5rem)]">
              <Sidebar />
              <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
