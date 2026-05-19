import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SUBSCRIPTIONS } from '../../core/data/site-data';

@Component({
  selector: 'app-prices-page',
  templateUrl: './prices-page.component.html',
  styleUrl: './prices-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricesPageComponent {
  readonly subscriptions = SUBSCRIPTIONS;
}
