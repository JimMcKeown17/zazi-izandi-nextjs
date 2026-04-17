/**
 * Pedagogical letter sequences — mirror of Django `api/letter_constants.py`.
 * Keep in sync if the Python source ever changes.
 */

export const LETTER_SEQUENCES: Record<string, readonly string[]> = {
  isiXhosa: [
    "a", "e", "i", "o", "u", "b", "l", "m", "k", "p",
    "s", "h", "z", "n", "d", "y", "f", "w", "v", "x",
    "g", "t", "q", "r", "c", "j",
  ],
  English: [
    "a", "m", "s", "t", "n", "i", "p", "c", "f", "d",
    "h", "o", "r", "b", "l", "k", "e", "g", "w", "v",
    "u", "j", "y", "z", "q", "x",
  ],
  Afrikaans: [
    "o", "i", "a", "u", "e", "s", "n", "m", "d", "l",
    "t", "k", "f", "b", "p", "y", "r", "v", "w", "h",
    "g", "j",
  ],
};

export const DEFAULT_LANGUAGE = "isiXhosa";

export function getSequence(language: string | null | undefined): readonly string[] {
  return LETTER_SEQUENCES[language ?? ""] ?? LETTER_SEQUENCES[DEFAULT_LANGUAGE];
}

export function sequenceIndex(
  language: string | null | undefined,
): Record<string, number> {
  const seq = getSequence(language);
  const map: Record<string, number> = {};
  seq.forEach((l, i) => {
    map[l] = i;
  });
  return map;
}
