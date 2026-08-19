import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'rendez_vous_theme';

@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly modeSignal = signal<ThemeMode>(this.getStoredTheme());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');
  readonly toggleLabel = computed(() => (this.isDark() ? 'Activer le thème clair' : 'Activer le thème sombre'));
  readonly toggleIcon = computed(() => (this.isDark() ? '☀️' : '🌙'));

  constructor() {
    this.applyTheme(this.modeSignal());
  }

  toggle(): void {
    const nextMode: ThemeMode = this.isDark() ? 'light' : 'dark';

    this.modeSignal.set(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    this.applyTheme(nextMode);
  }

  private getStoredTheme(): ThemeMode {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    return storedTheme === 'dark' ? 'dark' : 'light';
  }

  private applyTheme(mode: ThemeMode): void {
    const root = this.document.documentElement;

    root.dataset['theme'] = mode;
    root.style.colorScheme = mode;
  }
}
