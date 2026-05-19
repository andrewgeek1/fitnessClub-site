import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TRAINERS } from '../../core/data/site-data';

@Component({
  selector: 'app-trainers-page',
  templateUrl: './trainers-page.component.html',
  styleUrl: './trainers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrainersPageComponent {
  readonly trainers = TRAINERS;
}
