import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { LeadDraft, LeadRequest } from '../models/request.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly storage = inject(StorageService);
  private readonly requestsKey = 'requests';
  private readonly contactDraftKey = 'contactFormDraft';

  private readonly requestsSubject = new BehaviorSubject<LeadRequest[]>(this.loadRequests());

  readonly requests$ = this.requestsSubject.asObservable();
  readonly requests = toSignal(this.requests$, {
    initialValue: this.requestsSubject.value
  });
  readonly requestsCount = computed(() => this.requests().length);

  add(request: Pick<LeadRequest, 'name' | 'phone'>): LeadRequest {
    const nextRequest: LeadRequest = {
      id: crypto.randomUUID(),
      name: request.name,
      phone: request.phone,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    const nextState = [...this.requestsSubject.value, nextRequest];
    this.requestsSubject.next(nextState);
    this.persistRequests(nextState);
    return nextRequest;
  }

  deleteById(id: string): void {
    const nextState = this.requestsSubject.value.filter((request) => request.id !== id);
    this.requestsSubject.next(nextState);
    this.persistRequests(nextState);
  }

  markDoneById(id: string): void {
    const nextState = this.requestsSubject.value.map((request) =>
      request.id === id ? { ...request, status: 'done' as const } : request
    );
    this.requestsSubject.next(nextState);
    this.persistRequests(nextState);
  }

  getContactDraft(): LeadDraft {
    return this.storage.getItem<LeadDraft>(this.contactDraftKey, { name: '', phone: '' });
  }

  setContactDraft(draft: LeadDraft): void {
    this.storage.setItem(this.contactDraftKey, draft);
  }

  clearContactDraft(): void {
    this.storage.removeItem(this.contactDraftKey);
  }

  private loadRequests(): LeadRequest[] {
    const requests = this.storage.getItem<LeadRequest[]>(this.requestsKey, []);
    const normalized = requests.map((request) =>
      request.id ? request : { ...request, id: crypto.randomUUID() }
    );

    this.persistRequests(normalized);
    return normalized;
  }

  private persistRequests(requests: LeadRequest[]): void {
    this.storage.setItem(this.requestsKey, requests);
  }
}
