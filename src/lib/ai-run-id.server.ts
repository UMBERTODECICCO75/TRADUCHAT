const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Retains only a run ID issued by the gateway, scoped to one server request. */
export function createLovableAiGatewayRunIdFetch() {
  let runId: string | undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}