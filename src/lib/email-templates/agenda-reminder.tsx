import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

import type { TemplateEntry } from './registry'

interface Props {
  text?: string
  when?: string
}

const AgendaReminderEmail = ({ text = '', when = '' }: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{`Da ricordare: ${text}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>⏰ Da ricordare</Heading>
        <Section style={quote}>
          <Text style={quoteText}>{text}</Text>
          {when ? <Text style={muted}>{when}</Text> : null}
        </Section>
        <Button href="https://traduchat.app/app" style={button}>
          Apri TraduChat
        </Button>
        <Text style={muted}>Hai chiesto questo avviso nella tua agenda di TraduChat.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AgendaReminderEmail,
  subject: (data: Record<string, any>) => `Da ricordare: ${String(data['text'] ?? '').slice(0, 60)}`,
  displayName: 'Promemoria agenda',
  previewData: { text: 'Chiamare il medico', when: 'mar 13 ott · 09:00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '520px' }
const heading = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const quote = { borderLeft: '3px solid #0f766e', padding: '4px 14px', margin: '16px 0', backgroundColor: '#f8fafc' }
const quoteText = { fontSize: '16px', lineHeight: '24px', color: '#0f172a', margin: '6px 0' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#64748b' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', borderRadius: '10px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none' }
