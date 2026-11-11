/** A group needs a name and at least two other participants. */
export function groupError(name: string, members: string[]) {
  if (!name.trim()) return "Inserisci il nome del gruppo";
  if (members.length < 2) return "Scegli almeno 2 partecipanti";
  return "";
}
