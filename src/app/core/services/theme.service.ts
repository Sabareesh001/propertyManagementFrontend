import { Injectable, signal, effect } from '@angular/core';

const STORAGE_KEY = 'prop-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(this.#loadPreference());

  constructor() {
    this.#applyClass(this.isDark());
    effect(() => {
      const dark = this.isDark();
      this.#applyClass(dark);
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }

  #loadPreference(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  #applyClass(dark: boolean) {
    document.documentElement.classList.toggle('dark-mode', dark);
  }
}
