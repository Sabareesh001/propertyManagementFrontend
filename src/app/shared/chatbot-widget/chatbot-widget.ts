import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { Textarea } from 'primeng/textarea';
import { ChatbotService, ChatResponseDto } from '../../core/services/chatbot.service';
import { extractApiError } from '../../core/api.config';

const MAX_QUESTION_LENGTH = 2000;
const MIN_DRAWER_WIDTH = 320;
const DEFAULT_DRAWER_WIDTH = 416;

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html: SafeHtml;
  isError?: boolean;
}

/** Escapes raw HTML before markdown parsing so LLM output can never inject markup/scripts. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, Avatar, Button, Drawer, Textarea],
  templateUrl: './chatbot-widget.html',
  styleUrl: './chatbot-widget.css',
  host: {
    '[style.--chatbot-drawer-width.px]': 'drawerWidth()',
  },
})
export class ChatbotWidgetComponent {
  private chatbotService = inject(ChatbotService);
  private sanitizer = inject(DomSanitizer);

  readonly maxLength = MAX_QUESTION_LENGTH;

  isOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  question = signal('');
  loading = signal(false);
  drawerWidth = signal(DEFAULT_DRAWER_WIDTH);
  isResizing = signal(false);

  charCount = computed(() => this.question().length);
  canSend = computed(
    () => !this.loading() && this.question().trim().length > 0 && this.charCount() <= this.maxLength,
  );

  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private readonly onResizeMove = (event: MouseEvent) => this.handleResizeMove(event);
  private readonly onResizeEnd = () => this.handleResizeEnd();

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.send();
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.drawerWidth();
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private handleResizeMove(event: MouseEvent): void {
    const delta = this.resizeStartX - event.clientX;
    const maxWidth = Math.min(720, window.innerWidth - 32);
    const newWidth = Math.min(maxWidth, Math.max(MIN_DRAWER_WIDTH, this.resizeStartWidth + delta));
    this.drawerWidth.set(newWidth);
  }

  private handleResizeEnd(): void {
    this.isResizing.set(false);
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  }

  private renderMarkdown(text: string): SafeHtml {
    const html = marked.parse(escapeHtml(text), { async: false, breaks: true }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** Builds the full transcript so far plus the new follow-up, since the backend answers statelessly per request. */
  private buildContextualQuestion(followUp: string): string {
    const priorTurns = this.messages()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    if (!priorTurns) return followUp;

    let context = `${priorTurns}\nUser: ${followUp}`;
    while (context.length > this.maxLength) {
      const nextLineBreak = context.indexOf('\n');
      if (nextLineBreak === -1) break;
      context = context.slice(nextLineBreak + 1);
    }
    return context;
  }

  send(): void {
    if (!this.canSend()) return;

    const text = this.question().trim();
    const contextualQuestion = this.buildContextualQuestion(text);
    this.messages.update((msgs) => [...msgs, { role: 'user', text, html: this.renderMarkdown(text) }]);
    this.question.set('');
    this.loading.set(true);

    this.chatbotService.ask(contextualQuestion).subscribe({
      next: (res: ChatResponseDto) => {
        this.loading.set(false);
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'bot', text: res.answer, html: this.renderMarkdown(res.answer) },
        ]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message =
          err.status === 502
            ? 'Support assistant is temporarily unavailable, please try again shortly'
            : extractApiError(err, 'Something went wrong. Please try again.');
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'bot', text: message, html: this.renderMarkdown(message), isError: true },
        ]);
      },
    });
  }
}
