import { Component, input } from '@angular/core';

@Component({
  selector: 'app-state-card',
  template: `
    <section class="state-card">
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
    </section>
  `,
  styles: `
    .state-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      padding: 22px;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;
    }

    .state-card:hover {
      border-color: #bfdbfe;
      box-shadow: var(--shadow);
      transform: translateY(-2px);
    }

    h2 {
      color: var(--color-text);
      font-size: 1.05rem;
      margin: 0 0 8px;
    }

    p {
      color: var(--color-muted);
      margin: 0;
    }
  `,
})
export class StateCard {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
