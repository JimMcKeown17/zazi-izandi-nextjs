export type Cohort = "treatment" | "sef" | "ecd" | "all";

export const COHORT_OPTIONS: { value: Cohort; label: string; description: string }[] = [
  { value: "treatment", label: "Treatment", description: "51 treatment schools" },
  { value: "sef", label: "SEF", description: "10 SEF-funded schools" },
  { value: "ecd", label: "ECD", description: "ECD centres" },
  { value: "all", label: "All Programme", description: "All schools receiving intervention" },
];

export const DEFAULT_COHORT: Cohort = "treatment";

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
      return schools.filter(
        (s) =>
          TREATMENT_SCHOOLS.has(s.school_name.toUpperCase()) ||
          SEF_SCHOOLS.has(s.school_name.toUpperCase()) ||
          s.school_type === "ECD" ||
          s.school_type === "ecd"
      );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

export function getCohortLabel(cohort: Cohort): string {
  return COHORT_OPTIONS.find((o) => o.value === cohort)?.label ?? "Treatment";
}

export function parseCohort(value: string | undefined | null): Cohort {
  if (value && ["treatment", "sef", "ecd", "all"].includes(value)) return value as Cohort;
  return DEFAULT_COHORT;
}
