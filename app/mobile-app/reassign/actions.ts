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

export function previewMobileReassignRoster(input: {
  fromEa: string;
  scope?: MobileReassignScope;
  scopeClassId?: string | null;
}): Promise<MobileReassignResult<MobileReassignRosterPreview>> {
  return getMobileReassignRoster(input);
}

export function createMobileReassignment(
  input: MobileReassignCreateJobInput
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return createMobileReassignJob(input);
}

export function executeMobileReassignment(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return executeMobileReassignJob(jobId);
}

export function loadMobileReassignment(
  jobId: string
): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return getMobileReassignJob(jobId);
}
