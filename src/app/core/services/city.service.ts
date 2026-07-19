import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from '../api.config';

export interface City {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CityService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/city`;

  private cities$ = this.http.get<City[]>(this.baseUrl).pipe(shareReplay(1));

  /** GET /api/city — all cities (public), cached for the app's lifetime. */
  getAll(): Observable<City[]> {
    return this.cities$;
  }
}
