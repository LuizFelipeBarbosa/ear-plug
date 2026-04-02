export function isGuestAccessiblePathname(pathname: string) {
  return (
    pathname === "/home" ||
    /^\/bands\/[^/]+$/.test(pathname) ||
    /^\/gig\/[^/]+$/.test(pathname)
  );
}
