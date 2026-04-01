"use client";

import { Suspense } from "react";
import {
  AuthExperience,
  AuthExperienceFallback,
} from "@/components/auth/AuthExperience";

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthExperienceFallback />}>
      <AuthExperience authMode="sign-up" redirectAuthenticatedToHome />
    </Suspense>
  );
}
