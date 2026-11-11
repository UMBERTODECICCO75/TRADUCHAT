import { describe, expect, it } from 'vitest';
import { ROOM_CAPACITY, ROOM_TOKEN_SECONDS, roomTokenClaims } from '@/lib/room-access';
describe('private video room access', () => {
  it('supports at least four participants', () => { expect(ROOM_CAPACITY).toBeGreaterThanOrEqual(4); expect(ROOM_CAPACITY).toBe(50); });
  it('restricts tokens to one room and one participant', () => {
    expect(roomTokenClaims('room-a', 'user-a', 'Mario').grants).toEqual({identity:'user-a',video:{room:'traduchat-room-a'}});
    expect(roomTokenClaims('room-b', 'user-b', 'Maria').grants.video.room).toBe('traduchat-room-b');
  });
  it('uses short-lived access tokens', () => { expect(ROOM_TOKEN_SECONDS).toBe(600); });
});
