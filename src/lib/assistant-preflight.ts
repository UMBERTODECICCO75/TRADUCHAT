type QuotaCheck = (key: string, limit: number, seconds: number) => Promise<boolean>;

/** Independent gates run concurrently, but both must allow the request. */
export async function assistantQuotaAllowed(check: QuotaCheck, ticketId: string, clientKey: string) {
  const results = await Promise.all([
    check(`ask:${ticketId}`, 20, 600),
    check(`askr:${clientKey}`, 60, 3600),
  ]);
  return results.every(Boolean);
}