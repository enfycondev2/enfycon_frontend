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
        <div className="flex items-center justify-center h-screen flex-col">
          {isLoading ? (
            <div className="w-full h-full bg-neutral-50 dark:bg-slate-800 animate-pulse"></div>
          ) : mediaUrl ? (
            <img
              src={mediaUrl}
              alt="Custom Auth Illustration"
              className="object-contain w-full h-full p-12"
            />
          ) : (
            <Image
              src={forgotPassImage.image}
              alt="Auth Illustration"
              className="object-cover w-full h-full"
            />
          )}
        </div>
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

          {/* Login Form */}
          <LoginForm />

          {/* Divider and Social Login */}
          <div className="mt-8 relative text-center before:absolute before:w-full before:h-px before:bg-neutral-300 dark:before:bg-slate-600 before:top-1/2 before:left-0">
            <span className="relative z-10 px-4 bg-white dark:bg-slate-900 text-base">
              Or sign in with
            </span>
          </div>
          <SocialLogin />
        </div>
      </div>
    </section>
  );
};

export default Login;
