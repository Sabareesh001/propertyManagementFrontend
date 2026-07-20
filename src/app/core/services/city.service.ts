import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { getApiBaseUrl } from '../api.config';

export interface City {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CityService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/city`; }

  private cities$ = this.http.get<City[]>(this.baseUrl).pipe(shareReplay(1));

  /** GET /api/city — all cities (public), cached for the app's lifetime. */
  getAll(): Observable<City[]> {
    return this.cities$;
  }
}
