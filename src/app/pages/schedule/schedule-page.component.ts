import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SCHEDULE_ITEMS } from '../../core/data/site-data';

@Component({
  selector: 'app-schedule-page',
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulePageComponent {
  readonly items = SCHEDULE_ITEMS;
}
