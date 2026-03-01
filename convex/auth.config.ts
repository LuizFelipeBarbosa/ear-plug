// Clerk authentication configuration for Convex
// The JWT issuer domain should match your Clerk application
// Set CLERK_JWT_ISSUER_DOMAIN in your Convex environment variables

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
