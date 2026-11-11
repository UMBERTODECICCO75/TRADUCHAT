export const ROOM_CAPACITY = 50;
export const ROOM_TOKEN_SECONDS = 600;
export function roomTokenClaims(roomId: string, identity: string, name: string) {
  return { grants: { identity, video: { room: `traduchat-${roomId}` } }, name };
}
