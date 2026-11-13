export type GroupCall = { id: string; room_id: string; caller_id: string; status: "active" | "ended"; answered_at: string | null };
export type GroupMember = { user_id: string; device: string; joined_at: string };
export type GroupUpdate = { call: GroupCall | null; members: GroupMember[]; events: { id: number; sender_id: string; payload: string }[] };

export function ownsGroupDevice(members: GroupMember[], me: string, device: string) {
  return members.some((member) => member.user_id === me && member.device === device);
}

/** Exactly one initiator for every mesh edge, independent of join order. */
export function initiatesGroupPeer(me: string, other: string) { return me < other; }

/** Any participant's request may settle due minutes; the payer is chosen server-side by balance. */
export function groupBillingStart(call: GroupCall | null, _me?: string) {
  return call?.status === "active" ? call.answered_at : null;
}