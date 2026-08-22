/** The public password route is exact; descendants are not an alternate auth boundary. */
export function isPublicEaSetPasswordRoute(pathname: string): boolean {
  return pathname === "/ea-set-password";
}
