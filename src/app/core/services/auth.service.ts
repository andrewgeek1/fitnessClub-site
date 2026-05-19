import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { USERS } from '../data/site-data';
import { User } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly storageKey = 'currentUser';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(
    this.storage.getItem<User | null>(this.storageKey, null)
  );

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentUser = toSignal(this.currentUser$, {
    initialValue: this.currentUserSubject.value
  });
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  login(username: string, password: string): User | null {
    const user = USERS.find((item) => item.username === username && item.password === password) ?? null;
    if (!user) {
      return null;
    }

    this.currentUserSubject.next(user);
    this.storage.setItem(this.storageKey, user);
    return user;
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.storage.removeItem(this.storageKey);
  }
}
