"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { passwordApi, accountApi, emailVerificationApi, studentsApi, simulationsApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { Student } from "@/lib/types";

function DeleteSimsButton({ studentId }: { studentId: number }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleDelete() {
    setConfirming(false);
    try {
      const sims = await simulationsApi.history(studentId);
      if (sims.length === 0) { toast.info("No simulations to delete."); return; }
      setProgress(`Deleting ${sims.length} simulations…`);
      for (const sim of sims) {
        if (sim.id) await simulationsApi.delete(sim.id);
      }
      setProgress(null);
      toast.success("All simulations deleted.");
    } catch (err: unknown) {
      setProgress(null);
      toast.error(err instanceof Error ? err.message : "Failed to delete simulations.");
    }
  }

  if (progress) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{progress}</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-red-600 dark:text-red-400">Are you sure? This cannot be undone.</p>
        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={handleDelete}>
          Yes, delete all
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
      onClick={() => setConfirming(true)}
    >
      Delete All Simulations
    </Button>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { theme, toggle } = useTheme();

  // Student data for new features
  const [studentData, setStudentData] = useState<Student | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading]             = useState(false);
  const [pwError, setPwError]                 = useState<string | null>(null);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Email verification state
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Notification prefs loading
  const [notifLoading, setNotifLoading] = useState(false);

  // Theme loading
  const [themeLoading, setThemeLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    studentsApi.get(user.studentId).then(setStudentData).catch(() => {});
  }, [user]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    setPwError(null);
    setPwLoading(true);
    try {
      await passwordApi.changePassword(user.studentId, currentPassword, newPassword);
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    try {
      await accountApi.delete(user.studentId);
      logout();
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSendVerification() {
    if (!user) return;
    setVerifyLoading(true);
    try {
      const res = await emailVerificationApi.sendVerification(user.studentId);
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send verification email.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleToggleNotification(field: "notify_burnout_alert" | "notify_weekly_summary", value: boolean) {
    if (!user) return;
    setNotifLoading(true);
    try {
      const updated = await studentsApi.update(user.studentId, { [field]: value });
      setStudentData(updated);
      toast.success("Preference saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save preference.");
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleThemeChange(newTheme: string) {
    if (!user) return;
    setThemeLoading(true);
    // Apply locally
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("adt_theme", "dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("adt_theme", "light");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
      localStorage.removeItem("adt_theme");
    }
    // If current theme toggle state doesn't match, toggle it
    const isDark = document.documentElement.classList.contains("dark");
    if ((theme === "dark") !== isDark) toggle();

    try {
      const updated = await studentsApi.update(user.studentId, { theme_preference: newTheme });
      setStudentData(updated);
      toast.success("Appearance preference saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save appearance.");
    } finally {
      setThemeLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500 text-sm">
          You need to be signed in to access settings.{" "}
          <a href="/login" className="text-brand-600 hover:underline">Sign in</a>
        </p>
      </div>
    );
  }

  const isVerified = studentData?.is_verified ?? true;
  const notifyBurnout = studentData?.notify_burnout_alert ?? true;
  const notifySummary = studentData?.notify_weekly_summary ?? true;
  const themePreference = studentData?.theme_preference ?? "system";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account security and preferences.
        </p>
      </div>

      {/* Account info */}
      <Card title="Account">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">Name</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Email</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
          </div>
        </div>
      </Card>

      {/* Email Verification (Feature 1) */}
      <Card title="Email Verification">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Email verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Email not verified
              </span>
            )}
          </div>
          {!isVerified && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Verify your email address to ensure you receive important notifications.
              </p>
              <Button
                variant="secondary"
                size="sm"
                isLoading={verifyLoading}
                onClick={handleSendVerification}
              >
                Resend verification email
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Notification Preferences (Feature 2) */}
      <Card title="Notification Preferences">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose which email notifications you want to receive.
          </p>
          <div className="space-y-3">
            {/* Burnout Alert Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Burnout alert emails</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Get notified when a simulation predicts HIGH burnout risk
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyBurnout ? "true" : "false"}
                title={notifyBurnout ? "Disable burnout alert emails" : "Enable burnout alert emails"}
                disabled={notifLoading}
                onClick={() => handleToggleNotification("notify_burnout_alert", !notifyBurnout)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                  notifyBurnout ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifyBurnout ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Weekly Summary Toggle */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Weekly summary emails</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive a weekly digest of your simulation progress
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifySummary ? "true" : "false"}
                title={notifySummary ? "Disable weekly summary emails" : "Enable weekly summary emails"}
                disabled={notifLoading}
                onClick={() => handleToggleNotification("notify_weekly_summary", !notifySummary)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                  notifySummary ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifySummary ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance (Feature 7) */}
      <Card title="Appearance">
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose your preferred color theme. Your preference is saved to your account.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(["system", "light", "dark"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={themeLoading}
                onClick={() => handleThemeChange(opt)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all capitalize disabled:opacity-50 ${
                  themePreference === opt
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-600"
                }`}
              >
                {opt === "system" ? "System" : opt === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your current password"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {pwError && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {pwError}
            </div>
          )}

          <Button type="submit" isLoading={pwLoading}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Data & Privacy */}
      <Card title="Data &amp; Privacy">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Export All My Data</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Downloads a JSON file containing your student profile and all simulation history.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!user) return;
                try {
                  const [profile, simulations] = await Promise.all([
                    studentsApi.get(user.studentId),
                    simulationsApi.history(user.studentId),
                  ]);
                  const blob = new Blob(
                    [JSON.stringify({ student: profile, simulations, exported_at: new Date().toISOString() }, null, 2)],
                    { type: "application/json" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `academic-twin-data-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Data exported successfully.");
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Export failed.");
                }
              }}
            >
              Export All My Data
            </Button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Delete All Simulations</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Permanently removes all your simulation runs. Your profile and courses are kept.
            </p>
            {!user ? null : (
              <DeleteSimsButton studentId={user.studentId} />
            )}
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card title="Danger Zone">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">Delete Account</h3>
            <p className="text-xs text-red-700 dark:text-red-500 mb-4">
              This will permanently delete your account, all simulations, and courses. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <Button
                variant="ghost"
                isLoading={deleteLoading}
                disabled={deleteConfirm !== "DELETE"}
                onClick={handleDeleteAccount}
                className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40"
              >
                Permanently Delete My Account
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
