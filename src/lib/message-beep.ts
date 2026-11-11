export type IncomingMessage = { id: string; sender_id: string; recipient_id: string | null; created_at: string };

/** One shared detector for every conversation and message format. */
export function freshIncoming(rows: IncomingMessage[], userId: string, since: number, seen: Set<string>, source: string) {
  let count = 0;
  for (const row of rows) {
    const key = `${source}:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (row.recipient_id === userId && row.sender_id !== userId && Date.parse(row.created_at) > since) count++;
  }
  return count;
}

export function soundPreferenceKey(userId: string) { return `traduchat:message-beep:${userId}`; }

export function playMessageBeep(context: AudioContext) {
  if (context.state !== "running") return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.value = 850;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, start + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + 0.12);
}