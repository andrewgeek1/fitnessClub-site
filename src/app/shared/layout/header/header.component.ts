import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeMenu());
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
    this.syncBodyClass();
  }

  closeMenu(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    this.syncBodyClass();
  }

  openGuestModal(): void {
    this.ui.openGuestModal();
  }

  navigateToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.closeMenu();

    if (this.isHomeRoute()) {
      this.scrollToSection(sectionId);
      return;
    }

    this.router.navigate(['/'], { fragment: sectionId });
  }

  scrollHome(event: Event): void {
    if (!this.isHomeRoute()) {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMenu();
    }
  }

  private isHomeRoute(): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    return currentUrl === '/' || currentUrl === '';
  }

  private scrollToSection(sectionId: string): void {
    requestAnimationFrame(() => {
      this.document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  private syncBodyClass(): void {
    this.document.body.classList.toggle('menu-open', this.menuOpen());
  }
}
