import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isGuestAccessiblePathname } from "./src/lib/auth/guestAccess";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/google/maps-key(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req) || isGuestAccessiblePathname(req.nextUrl.pathname)) {
    return;
  }

  if (req.nextUrl.pathname.startsWith("/api") || req.nextUrl.pathname.startsWith("/trpc")) {
    await auth.protect();
    return;
  }

  const { userId } = await auth();
  if (userId) {
    return;
  }

  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set(
    "returnTo",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
