import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl, WITH_CREDENTIALS } from '../api.config';

export interface ChatRequestDto {
  question: string;
}

export interface ChatResponseDto {
  answer: string;
  sources: string[];
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/chatbot`; }

  ask(question: string): Observable<ChatResponseDto> {
    const body: ChatRequestDto = { question };
    return this.http.post<ChatResponseDto>(`${this.baseUrl}/ask`, body, WITH_CREDENTIALS);
  }
}
