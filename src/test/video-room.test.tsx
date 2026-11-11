import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoRoom } from '@/components/video-room';

const stop = vi.fn();
vi.mock('twilio-video', () => ({
  createLocalTracks: async () => [{ kind: 'audio', stop }],
  connect: async () => { throw new Error('Connessione non disponibile'); },
}));

describe('Room return', () => {
  it('returns to the previous screen even when the connection fails and releases media', async () => {
    const leave = vi.fn();
    const { unmount } = render(<VideoRoom token="test" roomName="test-room" name="Stanza" leave={leave} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Torna indietro' }));
    expect(leave).toHaveBeenCalledOnce();
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});