"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignIn, SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/branding/BrandLogo";

type AuthMode = "sign-in" | "sign-up";

interface CustomAuthPanelProps {
  externalNotice?: string | null;
  mode?: AuthMode;
}

export function CustomAuthPanel({
  externalNotice = null,
  mode = "sign-in",
}: CustomAuthPanelProps) {
  const pathname = usePathname();
  const isSignIn = mode === "sign-in";
  const isDedicatedAuthRoute = isSignIn
    ? pathname.startsWith("/sign-in")
    : pathname.startsWith("/sign-up");
  const authRouting = isDedicatedAuthRoute ? "path" : "hash";

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-in">
      <div className="relative overflow-hidden rounded-[34px] border border-white/[0.14] bg-black/30 shadow-[0_50px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/25 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
              <BrandMark className="w-6" theme="dark" decorative sizes="24px" />
              EarPlug
            </div>
            <div className="rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
              {isSignIn ? "Sign in" : "Sign up"}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/[0.08] bg-[#090a0f] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
            {externalNotice ? (
              <div className="mb-4 rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <p className="text-sm text-zinc-200">{externalNotice}</p>
              </div>
            ) : null}

            {isSignIn ? (
              authRouting === "path" ? (
                <SignIn
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                  fallbackRedirectUrl="/"
                />
              ) : (
                <SignIn
                  routing="hash"
                  signUpUrl="/sign-up"
                  fallbackRedirectUrl="/"
                />
              )
            ) : authRouting === "path" ? (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/"
              />
            ) : (
              <SignUp
                routing="hash"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/"
              />
            )}

            <div className="mt-4 border-t border-white/[0.08] pt-4 text-center">
              <p className="text-sm text-zinc-300">
                {isSignIn ? "New to EarPlug?" : "Already have an account?"}{" "}
                <Link
                  href={isSignIn ? "/sign-up" : "/sign-in"}
                  className="font-semibold text-white transition-colors hover:text-zinc-200"
                >
                  {isSignIn ? "Create an account" : "Sign in"}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
