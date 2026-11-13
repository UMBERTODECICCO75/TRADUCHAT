export function agendaWhatsAppUrl(note: { text: string; date: string; time: string }) {
  const [year, month, day] = note.date.split("-");
  const message = `TraduChat — Da ricordare\n${day}/${month}/${year} alle ${note.time}\n${note.text}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}