import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToastProvider } from "@/components/ui/Toaster";
import { OnboardingModal } from "@/components/ui/OnboardingModal";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Academic Digital Twin",
  description: "A simulation engine that models your academic life to predict GPA, burnout risk, and optimal schedules.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AcademicTwin",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#6366f1",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 antialiased transition-colors duration-200" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
          <ToastProvider>
            <ServiceWorkerRegistrar />
            <OfflineBanner />
            <Navbar />
            <div className="flex min-h-[calc(100vh-3.5rem)]">
              <Sidebar />
              <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8 lg:pb-8">{children}</main>
            </div>
            <MobileBottomNav />
            <OnboardingModal />
          </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
