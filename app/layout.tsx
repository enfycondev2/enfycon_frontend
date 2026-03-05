import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { LoadingProvider } from "@/contexts/LoadingContext";
import SessionGuard from "@/components/auth/SessionGuard";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "enfySync",
  description: "enfySync - Admin Dashboard Multipurpose Next.js, TypeScript, ShadCn UI & Tailwind Template",
  metadataBase: new URL("https://enfySync-nextjs-typescript-shadcn-5fu5.vercel.app"),
  openGraph: {
    title: "enfySync - Admin Dashboard ",
    description: "enfySync is a job submission tracking platform that helps recruiters and hiring managers track and manage job applications.",
    url: "https://enfySync-nextjs-typescript-shadcn-5fu5.vercel.app",
    siteName: "enfySync",
    images: [
      {
        url: "https://enfySync-nextjs-typescript-shadcn-5fu5.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "enfySync Admin Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "enfySync - Admin Dashboard UI",
    description: "A modern, responsive admin dashboard template built with Next.js, Tailwind CSS, and ShadCN UI.",
    images: ["https://enfySync-nextjs-typescript-shadcn-5fu5.vercel.app/og-image.jpg"],
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider session={session} refetchInterval={60} refetchOnWindowFocus={true}>
          <LoadingProvider>
            <SessionGuard>
              {children}
            </SessionGuard>
          </LoadingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
