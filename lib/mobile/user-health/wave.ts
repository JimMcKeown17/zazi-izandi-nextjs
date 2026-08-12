import type {
  MobileRolloutWave,
  MobileUserHealthResponse,
  MobileUserHealthRow,
} from "./types";

export type WaveSelection = "all" | "none" | string;

const SAST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days between the wave launch date and generated_at, both read as
// SAST calendar dates. Launch day is day 0. Negative before launch.
export function getWaveDayNumber(
  launchDate: string,
  generatedAt: string
): number {
  const generatedSastDate = SAST_DATE_FORMAT.format(new Date(generatedAt));
  return Math.round(
    (Date.parse(generatedSastDate) - Date.parse(launchDate)) / MS_PER_DAY
  );
}

export function filterRowsByWave(
  users: MobileUserHealthRow[],
  wave: WaveSelection
): MobileUserHealthRow[] {
  if (wave === "all") return users;
  if (wave === "none") {
    return users.filter((user) => (user.wave ?? null) === null);
  }
  return users.filter((user) => user.wave?.id === wave);
}

export function findWaveOption(
  waveOptions: MobileRolloutWave[] | undefined,
  wave: WaveSelection
): MobileRolloutWave | null {
  if (wave === "all" || wave === "none") return null;
  return waveOptions?.find((option) => option.id === wave) ?? null;
}

// Part B Django always emits wave_options (possibly []); a legacy payload
// (post-frontend Django rollback) never does. Absence = degrade honestly.
export function hasPartBCapability(
  response: Pick<MobileUserHealthResponse, "wave_options">
): boolean {
  return response.wave_options !== undefined;
}
