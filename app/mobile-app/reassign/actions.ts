"use server";

import {
  createMobileReassignJob,
  executeMobileReassignJob,
  getMobileReassignJob,
  getMobileReassignRoster,
} from "@/lib/mobile/api";
import type {
  MobileHandoverJobResponse,
  MobileReassignCreateJobInput,
  MobileReassignResult,
  MobileReassignRosterPreview,
  MobileReassignScope,
} from "@/lib/mobile/reassign/types";

export async function previewMobileReassignRoster(input: {
  fromEa: string;
  scope?: MobileReassignScope;
  scopeClassId?: string | null;
}): Promise<MobileReassignResult<MobileReassignRosterPreview>> {
  return getMobileReassignRoster(input);
}

export async function createMobileReassignment(
  input: MobileReassignCreateJobInput
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return createMobileReassignJob(input);
}

export async function executeMobileReassignment(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return executeMobileReassignJob(jobId);
}

export async function loadMobileReassignment(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return getMobileReassignJob(jobId);
}
