import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CLUB_PLANS } from '../../../../core/data/site-data';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-club-cards',
  templateUrl: './club-cards.component.html',
  styleUrl: './club-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubCardsComponent {
  private readonly ui = inject(UiService);

  @ViewChild('track', { static: true }) private readonly trackRef!: ElementRef<HTMLElement>;

  readonly plans = CLUB_PLANS;

  scroll(direction: 'prev' | 'next'): void {
    const shift = Math.round(this.trackRef.nativeElement.clientWidth * 0.85);
    this.trackRef.nativeElement.scrollBy({
      left: direction === 'prev' ? -shift : shift,
      behavior: 'smooth'
    });
  }

  openGuestModal(): void {
    this.ui.openGuestModal();
  }
}
