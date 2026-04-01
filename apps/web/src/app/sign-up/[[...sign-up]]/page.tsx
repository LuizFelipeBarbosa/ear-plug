"use client";

import { AuthExperience } from "@/components/auth/AuthExperience";

export default function SignUpPage() {
  return <AuthExperience authMode="sign-up" redirectAuthenticatedToHome />;
}
