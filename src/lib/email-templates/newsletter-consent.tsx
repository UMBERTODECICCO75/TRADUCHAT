import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { NEWSLETTER_ADMIN, NEWSLETTER_SITE } from "../newsletter-consent";

function NewsletterConsentEmail({ email, acceptedAt, version }: { email?: string; acceptedAt?: string; version?: string }) {
  return <Html lang="it"><Head /><Preview>Un utente ha accettato il consenso agli aggiornamenti di TraduChat.</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
      <Container style={{ padding: "28px 24px", maxWidth: "560px" }}>
        <Heading>TraduChat — Nuovo consenso newsletter</Heading>
        <Text>Un utente ha accettato il consenso facoltativo agli aggiornamenti via email.</Text>
        <Text>Email dell’account: {email || "Non disponibile"}</Text>
        <Text>Data di accettazione: {acceptedAt || "Non disponibile"}</Text>
        <Text>Versione del consenso: {version || "Non disponibile"}</Text>
        <Button href={NEWSLETTER_SITE} style={{ backgroundColor: "#187744", color: "#ffffff", padding: "12px 20px", borderRadius: "6px" }}>Apri TraduChat</Button>
        <Text>{NEWSLETTER_SITE}</Text>
      </Container>
    </Body>
  </Html>;
}

export const template = {
  component: NewsletterConsentEmail,
  subject: "TraduChat — Nuovo consenso newsletter",
  displayName: "Avviso di consenso newsletter al gestore",
  to: NEWSLETTER_ADMIN,
  previewData: { email: "utente@example.com", acceptedAt: "2026-10-25T16:52:00Z", version: "2026-10-25" },
} satisfies TemplateEntry;