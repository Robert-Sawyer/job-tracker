import type { ApplicationStatus as PrismaStatus } from "../generated/prisma/enums.js";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@job-tracker/shared";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertInSync: readonly PrismaStatus[] = APPLICATION_STATUSES;
export type { ApplicationStatus };
