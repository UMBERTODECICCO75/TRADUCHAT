import { chatTranslationText, type ChatTranslationMessage } from "./chat-translation";

type VoiceMessage = ChatTranslationMessage & { sender_id: string; audio_path?: string | null; audioUrl?: string | null };

/** Old messages and our own recordings must never start playing on opening a room. */
export class ChatAudioInbox {
  private known = new Set<string>();
  private pending = new Set<string>();
  private initialized = false;

  collect(messages: VoiceMessage[], me: string, enabled: boolean, language: string, cache: Record<string, string>) {
    if (!this.initialized) {
      messages.forEach((message) => this.known.add(message.id));
      this.initialized = true;
      return [];
    }
    for (const message of messages) {
      if (!this.known.has(message.id) && enabled && message.sender_id !== me && message.file_kind !== "system" && (message.audio_path || message.audioUrl)) this.pending.add(message.id);
      this.known.add(message.id);
    }
    if (!enabled) this.pending.clear();
    const available = new Set(messages.map((message) => message.id));
    for (const id of this.pending) if (!available.has(id)) this.pending.delete(id);
    const result: string[] = [];
    for (const message of messages) {
      if (!this.pending.has(message.id)) continue;
      const text = chatTranslationText(message, language, cache);
      if (text === null) break;
      this.pending.delete(message.id);
      if (text.trim()) result.push(text);
    }
    return result;
  }
}