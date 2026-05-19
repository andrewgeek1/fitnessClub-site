import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly isGuestModalOpen = signal(false);

  openGuestModal(): void {
    this.isGuestModalOpen.set(true);
  }

  closeGuestModal(): void {
    this.isGuestModalOpen.set(false);
  }
}
