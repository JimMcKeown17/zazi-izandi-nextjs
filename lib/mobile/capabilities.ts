export const ALL_MOBILE_ROLES = [
  "ea",
  "teacher",
  "funder",
  "junior_staff",
  "senior_staff",
  "admin",
  "zz_data_manager",
] as const;

export type Role = (typeof ALL_MOBILE_ROLES)[number];

export type MobileCapability =
  | "mobile.sessions.read"
  | "mobile.time_entries.read"
  | "mobile.csv.export"
  | "mobile.user_health.read"
  | "mobile.sync_incidents.read"
  | "mobile.assignments.reassign"
  | "mobile.accounts.read"
  | "mobile.accounts.provision"
  | "mobile.accounts.provision_seeded"
  | "mobile.accounts.lifecycle"
  | "mobile.accounts.recover"
  | "mobile.notifications.send_synthetic";

const MOBILE_ACCOUNT_ADMIN_CAPABILITIES = [
  "mobile.accounts.read",
  "mobile.accounts.provision",
  "mobile.accounts.provision_seeded",
  "mobile.accounts.lifecycle",
  "mobile.accounts.recover",
  "mobile.notifications.send_synthetic",
] as const satisfies readonly MobileCapability[];

export const ROLE_CAPABILITIES = {
  junior_staff: ["mobile.sessions.read", "mobile.time_entries.read"],
  senior_staff: [
    "mobile.sessions.read",
    "mobile.time_entries.read",
    "mobile.csv.export",
    "mobile.user_health.read",
    "mobile.sync_incidents.read",
  ],
  admin: [
    "mobile.sessions.read",
    "mobile.time_entries.read",
    "mobile.csv.export",
    "mobile.user_health.read",
    "mobile.sync_incidents.read",
    "mobile.assignments.reassign",
    ...MOBILE_ACCOUNT_ADMIN_CAPABILITIES,
  ],
  zz_data_manager: [
    "mobile.sessions.read",
    "mobile.time_entries.read",
    "mobile.csv.export",
    "mobile.user_health.read",
    "mobile.sync_incidents.read",
    "mobile.assignments.reassign",
    ...MOBILE_ACCOUNT_ADMIN_CAPABILITIES,
  ],
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
