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

interface MemberJoinedProps {
  memberName?: string
  roomName?: string
  chatUrl?: string
}

const MemberJoinedEmail = ({
  memberName = 'Un nuovo partecipante',
  roomName = '',
  chatUrl = 'https://traduchat.app/app',
}: MemberJoinedProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{`${memberName} è entrato nella conversazione su TraduChat`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Nuovo partecipante</Heading>
        <Text style={text}>
          {memberName} è entrato {roomName ? `nel gruppo ${roomName}` : 'nella conversazione'} di cui fai parte.
        </Text>
        <Section style={quote}>
          <Text style={quoteText}>
            Accedi per dargli il benvenuto: ognuno scrive nella propria lingua e legge nella sua.
          </Text>
        </Section>
        <Button href={chatUrl} style={button}>
          Apri la conversazione
        </Button>
        <Text style={muted}>
          Ricevi questa email perché partecipi a questa conversazione su TraduChat.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MemberJoinedEmail,
  subject: (data: Record<string, any>) =>
    `${data['memberName'] ?? 'Un nuovo partecipante'} è entrato nella conversazione`,
  displayName: 'Nuovo partecipante in chat',
  previewData: {
    memberName: 'Giulia',
    roomName: 'Team vendite',
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
