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

const forgotPassImage: StaticImg = {
  image: AuthImage,
};

const Login = () => {
  const { status } = useSession();
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="lg:w-1/2 w-full py-8 px-6 flex flex-col justify-center">
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
                  Corporate Sign-In
                </p>
                <div className="w-full">
                  <SocialLogin />
                </div>
                <p className="text-[11px] text-indigo-600/60 dark:text-indigo-400/60 text-center font-medium">
                  Recommended for all employees to sync profile 👇
                </p>
              </div>
            </div>
          </div>

          {/* Neutral Divider */}
          <div className="relative mb-10 text-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-neutral-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white dark:bg-slate-900 text-xs font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">
                Internal Access Only
              </span>
            </div>
          </div>

          {/* Manual Login Section (Secondary) */}
          <div className="relative pt-2">
            <LoginForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
