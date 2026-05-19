import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RequestsService } from '../../core/services/requests.service';

type AdminFilter = 'all' | 'new' | 'done';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPageComponent {
  private readonly requestsService = inject(RequestsService);

  readonly filter = signal<AdminFilter>('all');
  readonly requests = this.requestsService.requests;
  readonly filteredRequests = computed(() => {
    const sorted = [...this.requests()].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    return this.filter() === 'all'
      ? sorted
      : sorted.filter((request) => request.status === this.filter());
  });

  setFilter(filter: AdminFilter): void {
    this.filter.set(filter);
  }

  markDone(id: string): void {
    this.requestsService.markDoneById(id);
  }

  delete(id: string): void {
    if (!window.confirm('Удалить заявку?')) {
      return;
    }

    this.requestsService.deleteById(id);
  }
}
