import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface NewMessageProps {
  senderName?: string
  preview?: string
  translation?: string
  chatUrl?: string
}

const NewMessageEmail = ({
  senderName = 'Un partecipante',
  preview = '',
  translation = '',
  chatUrl = 'https://traduchat.app/app',
}: NewMessageProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{`${senderName} ti ha scritto su TraduChat`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Hai un nuovo messaggio</Heading>
        <Text style={text}>
          {senderName} ti ha scritto mentre non eri in chat.
        </Text>
        {preview ? (
          <Section style={quote}>
            <Text style={quoteText}>{preview}</Text>
            {translation ? <Text style={quoteTranslation}>{translation}</Text> : null}
          </Section>
        ) : null}
        <Button href={chatUrl} style={button}>
          Apri la conversazione
        </Button>
        <Text style={muted}>
          Ognuno scrive nella propria lingua e legge nella sua: la traduzione è automatica.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) =>
    `${data['senderName'] ?? 'Un partecipante'} ti ha scritto su TraduChat`,
  displayName: 'Nuovo messaggio in chat',
  previewData: {
    senderName: 'Giulia',
    preview: 'Ciao, ci sentiamo domani?',
    translation: 'Hi, shall we talk tomorrow?',
    chatUrl: 'https://traduchat.app/app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const heading = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155' }
const quote = {
  borderLeft: '3px solid #0f766e',
  padding: '4px 14px',
  margin: '16px 0',
  backgroundColor: '#f8fafc',
}
const quoteText = { fontSize: '15px', lineHeight: '23px', color: '#0f172a', margin: '6px 0' }
const quoteTranslation = { fontSize: '14px', lineHeight: '22px', color: '#64748b', margin: '6px 0' }
const button = {
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontSize: '15px',
  padding: '12px 20px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 18px',
}
const muted = { fontSize: '13px', lineHeight: '20px', color: '#94a3b8' }
