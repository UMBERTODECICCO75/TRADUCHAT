import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface SignupCodeProps {
  code?: string
  email?: string
  siteName?: string
  siteUrl?: string
}

const SignupCodeEmail = ({
  code = '123456',
  email = 'tu@esempio.it',
  siteName = 'TraduChat',
  siteUrl = 'https://traduchat.app',
}: SignupCodeProps) => (
  <Html lang="it" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{`Il tuo codice di conferma per ${siteName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Conferma la tua email</Heading>
        <Text style={text}>
          Benvenuto su{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Usa il codice a 6 cifre qui sotto per confermare{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          e completare la registrazione. Il codice scade tra 15 minuti.
        </Text>
        <Text style={codeStyle}>{code}</Text>
        <Button className="dm-btn" style={button} href={`${siteUrl}/auth`}>
          Apri TraduChat
        </Button>
        <Text style={footer}>
          Se non hai creato tu questo account, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: SignupCodeEmail,
  subject: 'Il tuo codice di conferma a 6 cifre',
  displayName: 'Codice di registrazione (6 cifre)',
  previewData: {
    code: '123456',
    email: 'tu@esempio.it',
  },
}

export default SignupCodeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  color: '#000000',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #000000',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
