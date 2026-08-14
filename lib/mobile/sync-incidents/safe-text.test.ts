import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import corpus from "./actor-safe-text-corpus.v1.json";
import {
  normalizeActorTextCandidate,
  selectActorDisplayName,
} from "./schema";

interface CorpusCase {
  id: string;
  kind: "display_name" | "school_name";
  value?: string;
  repeat?: { unit: string; count: number };
  expected_valid: boolean;
  expected_normalized?: string;
}

interface ProjectionCase {
  id: string;
  actor_user_id: string;
  roster_display_name: string | null;
  identity_display_name: string | null;
  roster_first_name: string | null;
  roster_last_name: string | null;
  identity_first_name: string | null;
  identity_last_name: string | null;
  school_name: string | null;
  expected_display_name: string;
  expected_display_name_source: "roster" | "identity" | "uuid";
  expected_school_name: string | null;
}

function expand(testCase: CorpusCase): string {
  if (testCase.repeat) return testCase.repeat.unit.repeat(testCase.repeat.count);
  return testCase.value ?? "";
}

test("the versioned actor text corpus has identical Next.js outcomes", () => {
  const corpusBytes = readFileSync(
    new URL("./actor-safe-text-corpus.v1.json", import.meta.url)
  );
  assert.equal(
    createHash("sha256").update(corpusBytes).digest("hex"),
    "ec2e126b2d021f61faf928997f3de7a84a45a66e3a9e5c9042831089caa6bcf7"
  );
  assert.equal(corpus.schema_version, 1);
  for (const testCase of corpus.cases as CorpusCase[]) {
    const expanded = expand(testCase);
    const actual = normalizeActorTextCandidate(expanded, testCase.kind);
    if (testCase.expected_valid) {
      assert.equal(actual, testCase.expected_normalized ?? expanded, testCase.id);
    } else {
      assert.equal(actual, null, testCase.id);
    }
  }

  for (const projection of corpus.projection_cases as ProjectionCase[]) {
    const selected = selectActorDisplayName(projection.actor_user_id, {
      rosterDisplayName: projection.roster_display_name,
      identityDisplayName: projection.identity_display_name,
      rosterFirstName: projection.roster_first_name,
      rosterLastName: projection.roster_last_name,
      identityFirstName: projection.identity_first_name,
      identityLastName: projection.identity_last_name,
    });
    assert.equal(selected.displayName, projection.expected_display_name, projection.id);
    assert.equal(
      selected.source,
      projection.expected_display_name_source,
      projection.id
    );
    assert.equal(
      projection.school_name === null
        ? null
        : normalizeActorTextCandidate(projection.school_name, "school_name"),
      projection.expected_school_name,
      projection.id
    );
  }
});
