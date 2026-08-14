export type MobileSyncIncidentKind =
  | "support_root"
  | "integrity_aggregate"
  | "queue_overflow";

export interface MobileSyncIncidentFilters {
  days: number;
  schoolId?: string | null;
  incidentKind?: MobileSyncIncidentKind | null;
  descriptorKey?: string | null;
  limit: number;
  cursor?: string | null;
}

