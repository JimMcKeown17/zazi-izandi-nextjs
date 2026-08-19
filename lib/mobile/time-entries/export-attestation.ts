/**
 * The time-entries CSV export is a scalar stream with no applied_filters echo,
 * so — unlike the JSON reports — the response body cannot attest that the
 * requested school-type filter was applied. A backend that predates the filter
 * contract silently ignores the school_type query parameter and returns an
 * unfiltered (broader, GPS-bearing) CSV. To fail closed, the upgraded Django
 * export view stamps an `X-Applied-School-Type` header, and this predicate lets
 * the export route reject a filtered download that the backend did not confirm.
 */
export function csvSchoolTypeAttestationSatisfied(
  appliedHeader: string | null,
  requested: "ecd" | "primary" | null
): boolean {
  // An unfiltered export is version-agnostic: every backend returns all rows,
  // so there is nothing to attest and a missing header is fine.
  if (requested === null) return true;
  // A filtered export must be confirmed by a backend that understands the
  // contract; a legacy backend omits the header, and a mismatched value means
  // the wrong filter was applied. Either way, fail closed.
  return appliedHeader === requested;
}
