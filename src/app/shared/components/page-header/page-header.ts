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
      margin-bottom: 24px;
    }

    .page-header p {
      color: #155eef;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .page-header h1 {
      color: #101828;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1;
      margin: 0;
    }
  `,
})
export class PageHeader {
  readonly eyebrow = input('Application');
  readonly title = input.required<string>();
}
