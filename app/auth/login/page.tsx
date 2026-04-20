"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/login-form";
import ThemeLogo from "@/components/shared/theme-logo";
import SocialLogin from "@/components/auth/social-login";
import AuthImage from "@/public/assets/images/auth/auth-img.png";
import { StaticImg } from "@/types/static-image";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle, ChevronRight, Share2, ShieldCheck, UserCheck } from "lucide-react";

const forgotPassImage: StaticImg = {
  image: AuthImage,
};

const Login = () => {
  const { status } = useSession();
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showManualLogin, setShowManualLogin] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.enfycon.com";
        const url = `${apiUrl.replace(/\/+$/, "")}/login-media/current`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.default && data.dataUrl && data.dataUrl.length > 30) {
            setMediaUrl(data.dataUrl);
          }
        }
      } catch (error) {
        console.error("Failed to fetch login media:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, []);

  // Suppress login UI while redirect is in flight
  if (status === "authenticated") {
    return null;
  }

  return (
    <section className="bg-white dark:bg-slate-900 flex flex-wrap min-h-screen">
      {/* Left Image */}
      <div className="lg:w-1/2 hidden lg:block">
        {isLoading ? (
          <div className="h-screen w-full bg-neutral-50 dark:bg-slate-800 animate-pulse" />
        ) : mediaUrl ? (
          /* Dynamic uploaded image — fixed centered box */
          <div className="flex items-center justify-center h-screen w-full p-16">
            <div className="relative w-full h-full max-h-[65vh] overflow-hidden">
              <img
                src={mediaUrl}
                alt="Custom Auth Illustration"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        ) : (
          /* Default image — original full-panel style */
          <div className="flex items-center justify-center h-screen flex-col">
            <Image
              src={forgotPassImage.image}
              alt="Auth Illustration"
              className="object-cover w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Right Form */}
      <div className="lg:w-1/2 w-full py-8 px-6 flex flex-col justify-center relative">
        {/* Top Right Help Section */}
        <div className="absolute top-8 right-8">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-slate-800/50 hover:bg-neutral-100 dark:hover:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-full transition-all group">
                <HelpCircle className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 tracking-wider uppercase">Guide</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-[2rem] border-none shadow-2xl overflow-hidden p-0 bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800">
              {/* Header with Background Pattern */}
              <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 p-12 opacity-10 rotate-12">
                  <ShieldCheck size={200} />
                </div>
                <DialogHeader className="relative z-10">
                  <DialogTitle className="text-3xl font-black text-white mb-2 leading-tight">Quick Start <br/>Access Guide</DialogTitle>
                  <DialogDescription className="text-indigo-100/90 text-sm font-medium">
                    Master the enfySync entrance in under 30 seconds.
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Step 1: Login */}
                <div className="flex gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20 shadow-sm group-hover:scale-110 transition-transform">
                    <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h5 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-2">
                      Secure Entrance
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-[9px] text-emerald-600 dark:text-emerald-400 rounded-full">Recommended</span>
                    </h5>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      Click the <strong>"Sign In with Microsoft"</strong> button. This syncs your official corporate profile instantly—no new password needed.
                    </p>
                  </div>
                </div>

                {/* Step 2: Logout */}
                <div className="flex gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-500/20 shadow-sm group-hover:scale-110 transition-transform">
                    <LogOutIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h5 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">Graceful Exit</h5>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      Finished for the day? Click your **Profile Image** in the top-right corner of the dashboard to find the **Logout** button. 👇
                    </p>
                  </div>
                </div>

                {/* Important Note */}
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-black text-neutral-400 tracking-widest uppercase">Internal Security</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-300 leading-relaxed font-medium italic">
                    Traditional username/password fields are strictly for backend maintenance. Employees should always use the Secure SSO route.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-neutral-50 dark:bg-slate-800/30 flex justify-end items-center gap-4">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">enfySync v2.0</span>
                <button 
                  onClick={() => (document.querySelector('[data-radix-collection-item]') as any)?.click()} 
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/25 active:scale-95 uppercase tracking-widest"
                >
                  Got it!
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="lg:max-w-[464px] w-full mx-auto">
          {/* Logo and heading */}
          <div>
            <div className="mb-2.5 inline-block max-w-[290px]">
              <ThemeLogo />
            </div>

            <h4 className="font-semibold mb-3">Sign In to your Account</h4>
            <p className="mb-8 text-neutral-500 dark:text-neutral-300 text-lg">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Official Sign In Section (Primary) */}
          <div className="relative mb-10 overflow-hidden group">
            <div className="p-5 bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-3xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center gap-4">
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 text-center font-semibold tracking-wide uppercase">
                  Secure Sign-In
                </p>
                <div className="w-full">
                  <SocialLogin />
                </div>
              </div>
            </div>
          </div>

          {/* Discreet Developer Toggle Area */}
          <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-slate-800 text-center">
            {!showManualLogin ? (
              <button
                onClick={() => setShowManualLogin(true)}
                className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 tracking-[0.2em] uppercase transition-colors flex items-center gap-4 mx-auto group"
              >
                <span className="w-6 h-px bg-neutral-200 dark:bg-slate-800 group-hover:bg-neutral-300" />
                Developer Access
                <span className="w-6 h-px bg-neutral-200 dark:bg-slate-800 group-hover:bg-neutral-300" />
              </button>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-2">
                     <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                     <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Internal Connection</span>
                   </div>
                   <button 
                    onClick={() => setShowManualLogin(false)}
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline tracking-widest uppercase flex items-center gap-1"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                     Back
                   </button>
                </div>
                <LoginForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
