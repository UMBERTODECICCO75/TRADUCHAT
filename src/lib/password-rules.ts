export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 8) p.push("almeno 8 caratteri");
  if (!/[A-Z]/.test(pw)) p.push("una lettera maiuscola");
  if (!/[0-9]/.test(pw)) p.push("un numero");
  if (!/[^A-Za-z0-9]/.test(pw)) p.push("un carattere speciale");
  return p;
}
