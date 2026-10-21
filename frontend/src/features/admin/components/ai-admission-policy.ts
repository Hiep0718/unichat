import type { AiAdmission } from '../admin-api';

/** Presents safe transitions; verification requires both durable counts to be zero. */
export function admissionTransitions(admission: AiAdmission): AiAdmission['state'][] {
  if (admission.state === 'OPEN') return ['DRAINING'];
  if (admission.state === 'VERIFYING') return ['DRAINING', 'OPEN'];
  return admission.runningOperationCount === 0 && admission.pendingAttemptCount === 0
    ? ['VERIFYING', 'OPEN'] : ['OPEN'];
}
