"use client";

import { AuthExperience } from "@/components/auth/AuthExperience";

export default function HomePage() {
  return <AuthExperience redirectAuthenticatedToHome />;
}
