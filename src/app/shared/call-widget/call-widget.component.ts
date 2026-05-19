import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-call-widget',
  templateUrl: './call-widget.component.html',
  styleUrl: './call-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CallWidgetComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiService);
  private readonly storageKey = 'callWidgetLastClosedAt';
  private readonly firstDelayMs = 30000;
  private readonly repeatDelayMs = 90000;

  private timerId: number | null = null;

  readonly visible = signal(false);

  ngOnInit(): void {
    const lastClosedAt = Number(localStorage.getItem(this.storageKey) || 0);

    if (!lastClosedAt) {
      this.scheduleShow(this.firstDelayMs);
      return;
    }

    const elapsed = Date.now() - lastClosedAt;
    if (elapsed >= this.repeatDelayMs) {
      this.scheduleShow(this.firstDelayMs);
      return;
    }

    this.scheduleShow(this.repeatDelayMs - elapsed);
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
    }
  }

  close(): void {
    this.visible.set(false);
    localStorage.setItem(this.storageKey, String(Date.now()));
    this.scheduleShow(this.repeatDelayMs);
  }

  openGuestModal(): void {
    this.ui.openGuestModal();
  }

  private scheduleShow(delay: number): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
    }

    this.timerId = window.setTimeout(() => {
      this.visible.set(true);
    }, delay);
  }
}
