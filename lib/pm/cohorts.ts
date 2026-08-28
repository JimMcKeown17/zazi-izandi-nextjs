import type { ProgrammeFidelityRow } from "@/lib/mobile/programme-fidelity/types";

export type Cohort = "treatment" | "sef" | "ecd" | "all";

export const COHORT_OPTIONS: { value: Cohort; label: string; description: string }[] = [
  { value: "treatment", label: "Treatment", description: "51 treatment schools" },
  { value: "sef", label: "SEF", description: "10 SEF-funded schools" },
  { value: "ecd", label: "ECD", description: "ECD centres" },
  { value: "all", label: "All Programme", description: "All schools receiving intervention" },
];

export const DEFAULT_COHORT: Cohort = "treatment";

export const COHORT_DOSAGE_TARGETS: Record<Cohort, number> = {
  treatment: 2.5,
  sef: 2.5,
  all: 2.5,
  ecd: 3.5,
};

// ─── Treatment Schools (51) ──────────────────────────────────────
// Stored in UPPERCASE for fast comparison

export const TREATMENT_SCHOOLS = new Set<string>([
  "ABRAHAM LEVY PRIMARY SCHOOL",
  "CANZIBE PRIMARY SCHOOL",
  "COEGA PRIMARY SCHOOL",
  "DANIELS PUBLIC PRIMARY SCHOOL",
  "EMFUNDWENI PRIMARY SCHOOL",
  "FRANK JOUBERT PRIMARY SCHOOL",
  "EMZOMNCANE PRIMARY SCHOOL",
  "JARVIS GQAMLANA PUBLIC PRIMARY SCHOOL",
  "ENKULULEKWENI PRIMARY SCHOOL",
  "LAMANI PUBLIC PRIMARY SCHOOL",
  "ENQILENI INTERMEDIATE SCHOOL",
  "FUNIMFUNDO PRIMARY SCHOOL",
  "SAMUEL NONGOGO PRIMARY SCHOOL",
  "IMBASA PUBLIC PRIMARY SCHOOL",
  "KAYSER NGXWANA PRIMARY SCHOOL",
  "CEBELIHLE PRIMARY SCHOOL",
  "MELISIZWE PUBLIC PRIMARY SCHOOL",
  "MNQOPHISO PRIMARY SCHOOL",
  "NKUTHALO PUBLIC PRIMARY SCHOOL",
  "NXANELWIMFUNDO INTERMIDIATE SCHOOL",
  "ILITHA PUBLIC PRIMARY SCHOOL",
  "J K ZONDI PRIMARY SCHOOL",
  "MACHIU PRIMARY SCHOOL",
  "MALABAR PRIMARY SCHOOL",
  "SIPHO HASHE COMBINED SCHOOL",
  "SOWETO-ON-SEA PRIMARY SCHOOL",
  "REPUBLIC PRIMARY SCHOOL",
  "SANCTOR PRIMARY SCHOOL",
  "VUKANIBANTU PRIMARY SCHOOL",
  "WALMER PRIMARY SCHOOL",
  "ALFONSO ARRIES PRIMARY SCHOOL",
  "BOET JEGELS PRIMARY SCHOOL",
  "CEDARBERG PRIMARY SCHOOL",
  "EMAFINI PRIMARY SCHOOL",
  "FERNWOOD PARK PRIMARY SCHOOL",
  "DR A W HABELGAARN PRIMARY SCHOOL",
  "SPENCER MABIJA COMBINED SCHOOL",
  "KLEINSKOOL COMMUNITY PRIMARY SCHOOL",
  "C W HENDRICKSE PRIMARY SCHOOL",
  "ST JOSEPH'S (RC) PRIMARY SCHOOL",
  "AMANZI PRIMARY SCHOOL",
  "ILINGE PRIMARY SCHOOL",
  "JAMES NTUNGWANA PRIMARY SCHOOL",
  "MAGQABI PRIMARY SCHOOL",
  "MJULENI JUNIOR PRIMARY SCHOOL",
  "MTHONJENI SENIOR PRIMARY SCHOOL",
  "NOMATHAMSANQA PRIMARY SCHOOL",
  "NOSIPHO PRIMARY SCHOOL",
  "PHAKAMILE PRIMARY SCHOOL",
  "SIKHOTHINA PRIMARY SCHOOL",
  "UITENHAGE PRIMARY SCHOOL",
]);

// ─── SEF Schools (10) ────────────────────────────────────────────

export const SEF_SCHOOLS = new Set<string>([
  "KWANOXOLO PRIMARY SCHOOL",
  "SAPPHIRE ROAD PRIMARY SCHOOL",
  "STRELITZIA PRIMARY SCHOOL",
  "BETHVALE PRIMARY SCHOOL",
  "GARRETT PUBLIC PRIMARY SCHOOL",
  "EMSENGENI PRIMARY SCHOOL",
  "ESITIYENI PUBLIC PRIMARY SCHOOL",
  "W B TSHUME PRIMARY SCHOOL",
  "DIAS FARM SCHOOL",
  "PHAKAMA PUBLIC SCHOOL",
]);

// Mobile publications currently carry shortened ledger school labels. These aliases
// were reviewed against the populated production publication on 2026-08-28. Keep the
// mapping explicit: fuzzy matching would silently put staff in the wrong cohort.
export const PROGRAMME_FIDELITY_SCHOOL_ALIASES: ReadonlyArray<{
  alias: string;
  canonical: string;
  cohort: "treatment" | "sef";
}> = [
  { alias: "ABRAHAM LEVY", canonical: "ABRAHAM LEVY PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "ALFONSO ARRIES", canonical: "ALFONSO ARRIES PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "AMANZI", canonical: "AMANZI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "BOET JEGELS", canonical: "BOET JEGELS PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "CANZIBE", canonical: "CANZIBE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "CEBELIHLE", canonical: "CEBELIHLE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "CEDARBERG", canonical: "CEDARBERG PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "COEGA", canonical: "COEGA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "DANIELS", canonical: "DANIELS PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "DR A W HABELGAARN", canonical: "DR A W HABELGAARN PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "EMAFINI", canonical: "EMAFINI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "EMFUNDWENI", canonical: "EMFUNDWENI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "EMZOMNCANE", canonical: "EMZOMNCANE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "ENKULEKWENI", canonical: "ENKULULEKWENI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "ENQILENI", canonical: "ENQILENI INTERMEDIATE SCHOOL", cohort: "treatment" },
  { alias: "FERNWOOD PARK", canonical: "FERNWOOD PARK PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "FRANK JOUBERT", canonical: "FRANK JOUBERT PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "FUNIMFUNDO", canonical: "FUNIMFUNDO PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "ILINGE", canonical: "ILINGE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "IMBASA", canonical: "IMBASA PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "JAMES NTUNGWANA", canonical: "JAMES NTUNGWANA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "JARVIS GQAMLANA", canonical: "JARVIS GQAMLANA PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "J K ZONDI", canonical: "J K ZONDI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "KAYSER NGXWANA", canonical: "KAYSER NGXWANA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "KLEINSKOOL", canonical: "KLEINSKOOL COMMUNITY PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "LAMANI", canonical: "LAMANI PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MACHIU", canonical: "MACHIU PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MAGQABI", canonical: "MAGQABI PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MELISIZWE", canonical: "MELISIZWE PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MJULENI", canonical: "MJULENI JUNIOR PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MNQOPHISO", canonical: "MNQOPHISO PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "MTHONJENI", canonical: "MTHONJENI SENIOR PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "NKUTHALO", canonical: "NKUTHALO PUBLIC PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "NOMATHAMSANQA", canonical: "NOMATHAMSANQA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "NOSIPHO", canonical: "NOSIPHO PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "NXANELWIMFUNDO", canonical: "NXANELWIMFUNDO INTERMIDIATE SCHOOL", cohort: "treatment" },
  { alias: "PHAKAMILE", canonical: "PHAKAMILE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "SAMUEL NONGOGO", canonical: "SAMUEL NONGOGO PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "SIKHOTHINA", canonical: "SIKHOTHINA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "SIPHO HASHE", canonical: "SIPHO HASHE COMBINED SCHOOL", cohort: "treatment" },
  { alias: "SOWETO-ON-SEA", canonical: "SOWETO-ON-SEA PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "SPENCER MABIJA", canonical: "SPENCER MABIJA COMBINED SCHOOL", cohort: "treatment" },
  { alias: "ST JOSEPH'S", canonical: "ST JOSEPH'S (RC) PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "UITENHAGE", canonical: "UITENHAGE PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "VUKANIBANTU", canonical: "VUKANIBANTU PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "WALMER", canonical: "WALMER PRIMARY SCHOOL", cohort: "treatment" },
  { alias: "KWANOXOLO", canonical: "KWANOXOLO PRIMARY SCHOOL", cohort: "sef" },
  { alias: "SAPPHIRE", canonical: "SAPPHIRE ROAD PRIMARY SCHOOL", cohort: "sef" },
  { alias: "STRELITZIA", canonical: "STRELITZIA PRIMARY SCHOOL", cohort: "sef" },
  { alias: "BETHVALE", canonical: "BETHVALE PRIMARY SCHOOL", cohort: "sef" },
  { alias: "GARRETT", canonical: "GARRETT PUBLIC PRIMARY SCHOOL", cohort: "sef" },
  { alias: "EMSENGENI", canonical: "EMSENGENI PRIMARY SCHOOL", cohort: "sef" },
  { alias: "ESITIYENI", canonical: "ESITIYENI PUBLIC PRIMARY SCHOOL", cohort: "sef" },
  { alias: "W B TSHUME", canonical: "W B TSHUME PRIMARY SCHOOL", cohort: "sef" },
  { alias: "DIAS", canonical: "DIAS FARM SCHOOL", cohort: "sef" },
  { alias: "PHAKAMA", canonical: "PHAKAMA PUBLIC SCHOOL", cohort: "sef" },
] as const;

const PROGRAMME_FIDELITY_ALIAS_COHORT = new Map(
  PROGRAMME_FIDELITY_SCHOOL_ALIASES.map(({ alias, cohort }) => [alias, cohort] as const)
);
const PROGRAMME_FIDELITY_ECD_TYPES = new Set(["ECD"]);

const normalizeProgrammeFidelityLabel = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();
  return normalized || null;
};

export type ProgrammeFidelityCohortClassification =
  | { kind: "cohort"; cohort: Exclude<Cohort, "all"> }
  | { kind: "missing" }
  | { kind: "unrecognized" };

export function classifyProgrammeFidelityRowCohort(row: {
  school_name: string | null;
  school_type: string | null;
}): ProgrammeFidelityCohortClassification {
  const schoolName = normalizeProgrammeFidelityLabel(row.school_name);
  const schoolType = normalizeProgrammeFidelityLabel(row.school_type);
  const nameCohort = schoolName
    ? TREATMENT_SCHOOLS.has(schoolName)
      ? "treatment"
      : SEF_SCHOOLS.has(schoolName)
        ? "sef"
        : PROGRAMME_FIDELITY_ALIAS_COHORT.get(schoolName)
    : undefined;
  const isEcd = schoolType !== null && PROGRAMME_FIDELITY_ECD_TYPES.has(schoolType);

  if (nameCohort && isEcd) return { kind: "unrecognized" };
  if (nameCohort) return { kind: "cohort", cohort: nameCohort };
  if (isEcd) return { kind: "cohort", cohort: "ecd" };
  if (schoolName === null) return { kind: "missing" };
  return { kind: "unrecognized" };
}

export function filterProgrammeFidelityRowsByCohort<T extends ProgrammeFidelityRow>(
  rows: readonly T[],
  cohort: Cohort
): {
  rows: T[];
  exclusionCounts: {
    missingSchoolEvidence: number;
    unrecognizedSchoolEvidence: number;
  };
} {
  const currentRows = rows.filter((row) => row.is_current_owner);
  if (cohort === "all") {
    return {
      rows: currentRows,
      exclusionCounts: {
        missingSchoolEvidence: 0,
        unrecognizedSchoolEvidence: 0,
      },
    };
  }

  const result: T[] = [];
  const exclusionCounts = {
    missingSchoolEvidence: 0,
    unrecognizedSchoolEvidence: 0,
  };
  for (const row of currentRows) {
    const classification = classifyProgrammeFidelityRowCohort(row);
    if (classification.kind === "cohort") {
      if (classification.cohort === cohort) result.push(row);
    } else if (classification.kind === "missing") {
      exclusionCounts.missingSchoolEvidence += 1;
    } else {
      exclusionCounts.unrecognizedSchoolEvidence += 1;
    }
  }
  return { rows: result, exclusionCounts };
}

// ─── Filtering ───────────────────────────────────────────────────

export function filterSchoolsByCohort<T extends { school_name: string; school_type?: string }>(
  schools: T[],
  cohort: Cohort
): T[] {
  switch (cohort) {
    case "treatment":
      return schools.filter((s) => TREATMENT_SCHOOLS.has(s.school_name.toUpperCase()));
    case "sef":
      return schools.filter((s) => SEF_SCHOOLS.has(s.school_name.toUpperCase()));
    case "ecd":
      return schools.filter((s) => s.school_type === "ECD" || s.school_type === "ecd");
    case "all":
      return schools;
  }
}

// ─── Group-level cohort filtering ───────────────────────────────
// Groups use `program_name` as school name (not `school_name`)

export function filterGroupsByCohort<T extends { program_name: string }>(
  groups: T[],
  cohort: Cohort
): T[] {
  switch (cohort) {
    case "treatment":
      return groups.filter((g) => TREATMENT_SCHOOLS.has(g.program_name.toUpperCase()));
    case "sef":
      return groups.filter((g) => SEF_SCHOOLS.has(g.program_name.toUpperCase()));
    case "ecd":
      // ECD groups don't have school_type — check against programme-level knowledge
      // For now, groups whose school is NOT in treatment or SEF are ECD
      return groups.filter(
        (g) =>
          !TREATMENT_SCHOOLS.has(g.program_name.toUpperCase()) &&
          !SEF_SCHOOLS.has(g.program_name.toUpperCase())
      );
    case "all":
      return groups;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

export function getCohortLabel(cohort: Cohort): string {
  return COHORT_OPTIONS.find((o) => o.value === cohort)?.label ?? "Treatment";
}

export function getCohortDosageTarget(cohort: Cohort): number {
  return COHORT_DOSAGE_TARGETS[cohort];
}

export function parseCohort(value: string | undefined | null): Cohort {
  if (value && ["treatment", "sef", "ecd", "all"].includes(value)) return value as Cohort;
  return DEFAULT_COHORT;
}
