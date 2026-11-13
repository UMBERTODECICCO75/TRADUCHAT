/** Keep the claim on uncertain outcomes; only confirmed failures may be retried. */
export async function deliverClaimedReminder(options: {
  claim: () => Promise<boolean>;
  send: () => Promise<boolean>;
  release: () => Promise<void>;
  canRetry: (error: unknown) => boolean;
}): Promise<boolean> {
  if (!(await options.claim())) return false;
  try {
    return await options.send();
  } catch (error) {
    if (options.canRetry(error)) await options.release();
    throw error;
  }
}

export class AgendaPhoneRejected extends Error {
  constructor(readonly status: number, body: string) {
    super(`Twilio call failed [${status}]: ${body}`);
  }
}