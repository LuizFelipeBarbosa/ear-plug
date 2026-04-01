"use client";

import { Suspense } from "react";
import {
  AuthExperience,
  AuthExperienceFallback,
} from "@/components/auth/AuthExperience";

export default function HomePage() {
  return (
    <Suspense fallback={<AuthExperienceFallback />}>
      <AuthExperience redirectAuthenticatedToHome />
    </Suspense>
  );
}
