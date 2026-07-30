/**
 * The workforce module's public surface. Each domain lives in its own file;
 * this barrel is what `packages/api/src/index.ts` and the integration tests import.
 */
export * from "./contracts";
export * from "./cosigners";
export * from "./departments";
export * from "./documents";
export * from "./employees";
export * from "./employment-periods";
export * from "./positions";
export { employmentAt } from "./shared";
