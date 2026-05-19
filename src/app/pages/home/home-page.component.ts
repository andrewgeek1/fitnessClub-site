import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UiService } from '../../core/services/ui.service';
import { ClubCardsComponent } from './components/club-cards/club-cards.component';
import { EventsSectionComponent } from './components/events/events-section.component';
import { FaqAccordionComponent } from './components/faq/faq-accordion.component';
import { HomeHeroComponent } from './components/hero/home-hero.component';
import { ZoneGalleryComponent } from './components/zone-gallery/zone-gallery.component';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    HomeHeroComponent,
    FaqAccordionComponent,
    ZoneGalleryComponent,
    ClubCardsComponent,
    EventsSectionComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  openGuestModal(): void {
    this.ui.openGuestModal();
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();

    this.document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  navigateToRoute(route: string): void {
    this.router.navigate([route]);
  }
}
