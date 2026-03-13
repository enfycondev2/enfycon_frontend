"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { ShieldCheck, ShieldAlert, QrCode, Lock } from "lucide-react";

interface TotpSetupTabContentProps {
  user: any;
}

export default function TotpSetupTabContent({ user: initialUser }: TotpSetupTabContentProps) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const isEnabled = user?.isTotpEnabled;

  async function handleInitSetup() {
    setLoading(true);
    try {
      const res = await apiClient("/auth/totp/setup", { method: "POST" });
      if (!res.ok) throw new Error("Failed to initialize TOTP setup.");
      const data = await res.json();
      setSetupData(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndEnable() {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await apiClient("/auth/totp/enable", {
        method: "POST",
        body: JSON.stringify({ token: verificationCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid verification code.");
      }
      toast.success("Two-Factor Authentication enabled successfully!");
      setUser({ ...user, isTotpEnabled: true });
      setSetupData(null);
      setVerificationCode("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-6 border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Two-Factor Authentication (2FA)</CardTitle>
            <CardDescription>Secure your finance dashboard with TOTP</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isEnabled ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">2FA is Enabled</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
              Your account and finance dashboard are protected with an authenticator app.
            </p>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled>
              Disable 2FA (Coming Soon)
            </Button>
          </div>
        ) : setupData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <img src={setupData.qrCode} alt="TOTP QR Code" className="w-48 h-48 rounded-lg shadow-md" />
                <div className="text-center">
                  <p className="text-xs font-mono bg-violet-50 text-violet-600 px-3 py-1 rounded-full uppercase">
                    Setup Key: {setupData.secret}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enter the 6-digit code provided by the app below to verify and enable 2FA.</p>
                </div>
                <div className="pt-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="pl-10 h-12 text-lg tracking-widest text-center"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button variant="ghost" onClick={() => setSetupData(null)}>Cancel</Button>
              <Button 
                onClick={handleVerifyAndEnable} 
                disabled={verifying || verificationCode.length !== 6}
                className="bg-violet-600 hover:bg-violet-700 text-white px-8"
              >
                {verifying ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Enable Two-Factor Authentication</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
              Improve account security and replace the static Finance PIN with a dynamic code from an authenticator app.
            </p>
            <Button 
              onClick={handleInitSetup} 
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700 text-white px-10 h-12 text-md font-semibold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none transition-all hover:scale-[1.02]"
            >
              {loading ? "Initializing..." : "Enable Authenticator App"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
