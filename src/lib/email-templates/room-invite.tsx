import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface RoomInviteProps {
  inviterName?: string
  langA?: string
  langB?: string
  joinUrl?: string
}

const RoomInviteEmail = ({
  inviterName = 'Una persona',
  langA = 'Italiano',
  langB = 'Inglese',
  joinUrl = 'https://traduchat.app/app',
}: RoomInviteProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{`${inviterName} ti ha invitato a una conversazione tradotta`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Hai un invito su TraduChat</Heading>
        <Text style={text}>
          {inviterName} ti ha invitato a una conversazione tradotta in tempo reale
          ({langA} · {langB}).
        </Text>
        <Text style={text}>
          Accedi con il tuo account e accetta l'invito: non serve nessun codice.
        </Text>
        <Button href={joinUrl} style={button}>
          Apri l'invito
        </Button>
        <Text style={muted}>
          Ognuno scrive nella propria lingua e legge nella sua: la traduzione è automatica.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RoomInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data['inviterName'] ?? 'Una persona'} ti ha invitato su TraduChat`,
  displayName: 'Invito a una conversazione',
  previewData: {
    inviterName: 'Giulia',
    langA: 'Italiano',
    langB: 'Inglese',
    joinUrl: 'https://traduchat.app/app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '520px' }
const heading = { fontSize: '22px', color: '#0f3d2e', margin: '0 0 14px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#374151', margin: '0 0 14px' }
const button = {
  backgroundColor: '#0f3d2e',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '12px',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
}
const muted = { fontSize: '13px', color: '#6b7280', margin: '22px 0 0' }
