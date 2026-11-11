// Sample conversation data shown in the app (not real accounts yet).

export type Contact = { name: string; role: string };
export type ChatRow = { name: string; msg: string; time: string; unread: boolean };
export type CallRow = { name: string; info: string; missed: boolean };

export const chats: ChatRow[] = [
  { name: "Milly Rosa", msg: "I was in Genoa with a friend...", time: "adesso", unread: true },
  { name: "Diego Verdi", msg: "Cosa stai facendo?", time: "2 ore fa", unread: false },
  { name: "Brian Gray", msg: "How do you feel in the new home?", time: "5 ore fa", unread: true },
  { name: "Sara White", msg: "Great idea!", time: "Nov 2", unread: false },
  { name: "Laura Bianchi", msg: "Com'è andato il tuo lavoro?", time: "Nov 6", unread: false },
];

export const calls: CallRow[] = [
  { name: "Milly Rosa", info: "ricevuta - 22:40", missed: false },
  { name: "Diego Verdi", info: "persa - 22:14", missed: true },
  { name: "Nicholas Yellow", info: "ricevuta - lunedì", missed: false },
  { name: "Laura Bianchi", info: "persa - venerdì", missed: true },
];

export const contacts: Contact[] = [
  { name: "Luca Rossi", role: "Designer" },
  { name: "Lucio Bianchi", role: "Teacher" },
  { name: "Manuel Brown", role: "Freelancer" },
  { name: "Mara Giallo", role: "Photographer" },
  { name: "Marzio Pietra", role: "+39 4767564664" },
];

/** Everyone the user can write to or add to a group: chat partners + address book. */
export const people: string[] = [...new Set([...chats.map((c) => c.name), ...contacts.map((c) => c.name)])];
