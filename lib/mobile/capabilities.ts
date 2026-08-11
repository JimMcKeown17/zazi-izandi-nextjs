export type Role =
  | "ea"
  | "teacher"
  | "funder"
  | "junior_staff"
  | "senior_staff"
  | "admin"
  | "zz_data_manager";

export type MobileCapability = "mobile.sessions.read";

export const ROLE_CAPABILITIES = {
  junior_staff: ["mobile.sessions.read"],
  senior_staff: ["mobile.sessions.read"],
  admin: ["mobile.sessions.read"],
  zz_data_manager: ["mobile.sessions.read"],
} as const satisfies Readonly<
  Partial<Record<Role, readonly MobileCapability[]>>
>;

export function hasCapability(
  role: unknown,
  capability: MobileCapability
): boolean {
  if (typeof role !== "string") return false;

  const capabilities = ROLE_CAPABILITIES[
    role as keyof typeof ROLE_CAPABILITIES
  ] as readonly MobileCapability[] | undefined;

  return capabilities?.includes(capability) ?? false;
}
