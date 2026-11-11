/** Browser-only media transport. No camera or microphone opens before a user action. */
export type CallMode = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'ended' | 'rejected';
export function isLiveCall(status: string, expiresAt: string, now = Date.now()) {
  return (status === 'ringing' || status === 'accepted') && Date.parse(expiresAt) > now;
}
export async function gatherDescription(pc: RTCPeerConnection) {
  if (pc.iceGatheringState !== 'complete') await new Promise<void>((resolve) => {
    const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', change); resolve(); };
    const change = () => { if (pc.iceGatheringState === 'complete') done(); };
    const timer = setTimeout(done, 12000);
    pc.addEventListener('icegatheringstatechange', change);
  });
  const description = pc.localDescription;
  if (!description) throw new Error('Impossibile preparare la chiamata');
  return JSON.stringify(description.toJSON());
}
export function parseDescription(value: string, type: 'offer' | 'answer'): RTCSessionDescriptionInit {
  const data: unknown = JSON.parse(value);
  if (!data || typeof data !== 'object' || !('type' in data) || data.type !== type || !('sdp' in data) || typeof data.sdp !== 'string') throw new Error('Segnale di chiamata non valido');
  return { type, sdp: data.sdp };
}
