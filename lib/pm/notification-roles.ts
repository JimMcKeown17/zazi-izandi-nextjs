export type PMRole = "ea" | "teacher" | "funder" | "junior_staff" | "senior_staff" | "admin";

export const NOTIFICATION_SENDER_ROLES: PMRole[] = ["senior_staff", "admin"];

export function canSendNotifications(role: string | undefined): boolean {
  return NOTIFICATION_SENDER_ROLES.includes(role as PMRole);
}
