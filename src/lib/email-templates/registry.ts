import type { ComponentType } from 'react'

import { template as roomInviteTemplate } from './room-invite'
import { template as newMessageTemplate } from './new-message'
import { template as memberJoinedTemplate } from './member-joined'
import { template as signupCodeTemplate } from './signup-code'
import { template as agendaReminderTemplate } from './agenda-reminder'
import { template as newsletterConsentTemplate } from './newsletter-consent'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'newsletter-consent': newsletterConsentTemplate,
  'room-invite': roomInviteTemplate,
  'new-message': newMessageTemplate,
  'member-joined': memberJoinedTemplate,
  'signup-code': signupCodeTemplate,
  'agenda-reminder': agendaReminderTemplate,
}
