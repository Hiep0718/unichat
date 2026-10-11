import { z } from 'zod';

const EPOCH_KEY = 'unichat.session-epoch';
const memory = { epoch: '' };
const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('invalidate'), epoch: z.string() }),
  z.object({ type: z.literal('token'), epoch: z.string(), accessToken: z.string().min(1) }),
]);

/** A nonsecret epoch prevents delayed cross-tab messages from reviving an older identity. */
export function readBrowserEpoch(): string {
  try { return localStorage.getItem(EPOCH_KEY) ?? memory.epoch; }
  catch { return memory.epoch; }
}

/** Changes only coordination metadata; credentials never enter browser storage. */
export function advanceBrowserEpoch(): string {
  memory.epoch = crypto.randomUUID();
  try { localStorage.setItem(EPOCH_KEY, memory.epoch); } catch { /* Memory remains authoritative in this tab. */ }
  return memory.epoch;
}

/** Accepts only well-formed messages for the currently shared identity epoch. */
export function readSessionMessage(data: unknown): z.infer<typeof messageSchema> | null {
  const result = messageSchema.safeParse(data);
  if (!result.success || result.data.epoch !== readBrowserEpoch()) return null;
  return result.data;
}
