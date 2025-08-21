import { AppState } from "@prisma/client";

export type Transition =
  | "submit"
  | "request_info"
  | "region_approve"
  | "national_approve"
  | "reject";

const allowed: Record<AppState, Transition[]> = {
  DRAFT: ["submit"],
  SUBMITTED: ["request_info", "region_approve", "reject"],
  REGION_REVIEW: ["request_info", "region_approve", "reject"],
  REQUESTED_CHANGES: ["submit"],
  NATIONAL_REVIEW: ["national_approve", "reject"],
  APPROVED: [],
  REJECTED: [],
};

export const can = (state: AppState, action: Transition) =>
  allowed[state].includes(action);
