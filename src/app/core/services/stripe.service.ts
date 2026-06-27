import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

/** Response of POST /api/stripe/connect/onboard (StripeOnboardingResponseDto). */
export interface StripeOnboardingResponse {
  onboardingUrl: string;
  stripeAccountId: string;
}

/** Response of GET /api/stripe/connect/status (StripeAccountStatusDto). */
export interface StripeAccountStatus {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isOnboarded: boolean;
}

@Injectable({ providedIn: 'root' })
export class StripeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/stripe/connect`;

  /** POST /api/stripe/connect/onboard — start Stripe Connect onboarding for the owner. */
  onboard(): Observable<StripeOnboardingResponse> {
    return this.http.post<StripeOnboardingResponse>(`${this.baseUrl}/onboard`, null, WITH_CREDENTIALS);
  }

  /** GET /api/stripe/connect/status — the owner's Stripe account onboarding status. */
  getStatus(): Observable<StripeAccountStatus> {
    return this.http.get<StripeAccountStatus>(`${this.baseUrl}/status`, WITH_CREDENTIALS);
  }
}
