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
      background: #fff;
      border: 1px solid #e4e7ec;
      border-radius: 16px;
      padding: 20px;
    }

    h2 {
      color: #101828;
      font-size: 1.05rem;
      margin: 0 0 8px;
    }

    p {
      margin: 0;
    }
  `,
})
export class StateCard {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
