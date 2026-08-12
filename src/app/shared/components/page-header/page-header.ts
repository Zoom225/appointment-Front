import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <p>{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
    </header>
  `,
  styles: `
    .page-header {
      margin-bottom: 28px;
    }

    .page-header p {
      color: var(--color-primary);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .page-header h1 {
      color: var(--color-text);
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: -0.035em;
      line-height: 0.98;
      margin: 0;
    }

    @media (max-width: 720px) {
      .page-header h1 {
        font-size: 1.9rem;
      }
    }
  `,
})
export class PageHeader {
  readonly eyebrow = input('Application');
  readonly title = input.required<string>();
}
