import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { EVENT_ITEMS } from '../../../../core/data/site-data';

type EventFilter = 'all' | 'promo' | 'event' | 'news';

@Component({
  selector: 'app-events-section',
  templateUrl: './events-section.component.html',
  styleUrl: './events-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventsSectionComponent {
  readonly events = EVENT_ITEMS;
  readonly activeFilter = signal<EventFilter>('all');

  setFilter(filter: EventFilter): void {
    this.activeFilter.set(filter);
  }

  isVisible(category: EventFilter): boolean {
    return this.activeFilter() === 'all' || this.activeFilter() === category;
  }
}
