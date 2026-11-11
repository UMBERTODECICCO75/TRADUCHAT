const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registrationInput(username: string, email: string, password: string, confirmation: string) {
  const name = username.trim();
  if (name.length < 3) throw new Error("Lo username deve avere almeno 3 caratteri");
  if (name.length > 80) throw new Error("Lo username è troppo lungo");
  const address = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(address)) throw new Error("Inserisci un indirizzo e-mail valido");
  if (password.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
  if (password !== confirmation) throw new Error("Le password non coincidono");
  return { email: address, password, username: name };
}