export type RecentMessage = { id: string; roomCode: string; createdAt: string };
export function unseenMessages<T extends RecentMessage>(messages: T[], read: Record<string, string>): T[] {
  return messages.filter((message) => message.createdAt > (read[message.roomCode] ?? ""));
}
export function markRoomRead(messages: RecentMessage[], read: Record<string, string>, code: string): Record<string, string> {
  const newest = messages.filter((message) => message.roomCode === code).reduce((latest, message) => message.createdAt > latest ? message.createdAt : latest, read[code] ?? "");
  return newest ? { ...read, [code]: newest } : read;
}
export function isRingingFor(call: { status: string; callee_id: string; created_at: string }, me: string, now = Date.now()): boolean {
  return call.status === "ringing" && call.callee_id === me && now - Date.parse(call.created_at) < 60_000;
}