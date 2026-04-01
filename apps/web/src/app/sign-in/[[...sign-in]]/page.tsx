"use client";

import { Suspense } from "react";
import {
  AuthExperience,
  AuthExperienceFallback,
} from "@/components/auth/AuthExperience";

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthExperienceFallback />}>
      <AuthExperience authMode="sign-in" redirectAuthenticatedToHome />
    </Suspense>
  );
}
