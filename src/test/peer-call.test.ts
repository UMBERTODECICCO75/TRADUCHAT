import { describe, expect, it } from 'vitest';
import { isLiveCall, parseDescription } from '@/lib/peer-call';
describe('peer calls', () => {
  it('accepts only live ringing or accepted sessions', () => {
    const expiry = '2026-11-06T00:00:00Z';
    const now = Date.parse('2026-11-05T23:00:00Z');
    expect(isLiveCall('ringing', expiry, now)).toBe(true);
    expect(isLiveCall('accepted', expiry, now)).toBe(true);
    expect(isLiveCall('rejected', expiry, now)).toBe(false);
    expect(isLiveCall('ended', expiry, now)).toBe(false);
    expect(isLiveCall('ringing', expiry, Date.parse(expiry))).toBe(false);
  });
  it('rejects unexpected signal types and missing SDP', () => {
    expect(parseDescription('{"type":"offer","sdp":"v=0"}', 'offer')).toEqual({type:'offer',sdp:'v=0'});
    expect(() => parseDescription('{"type":"answer","sdp":"v=0"}', 'offer')).toThrow();
    expect(() => parseDescription('{"type":"offer"}', 'offer')).toThrow();
  });
});
