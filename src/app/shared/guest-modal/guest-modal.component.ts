import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, timer } from 'rxjs';
import { extractPhoneDigits, formatPhone, sanitizeName } from '../../core/data/form-utils';
import { RequestsService } from '../../core/services/requests.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-guest-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './guest-modal.component.html',
  styleUrl: './guest-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestModalComponent implements AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private readonly fb = inject(FormBuilder);
  private readonly requestsService = inject(RequestsService);
  private readonly ui = inject(UiService);

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  readonly isOpen = this.ui.isGuestModalOpen;
  readonly form = this.fb.nonNullable.group({
    name: [''],
    phone: [''],
    consent: [false]
  });
  readonly loading = signal(false);
  readonly messageText = signal('');
  readonly messageType = signal<'success' | 'error' | ''>('');

  constructor() {
    this.form.controls.name.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => {
        const nextValue = sanitizeName(value);
        if (nextValue !== value) {
          this.form.controls.name.setValue(nextValue, { emitEvent: false });
        }
      });

    this.form.controls.phone.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => {
        const nextValue = formatPhone(value);
        if (nextValue !== value) {
          this.form.controls.phone.setValue(nextValue, { emitEvent: false });
        }
      });

    effect(() => {
      const open = this.isOpen();
      this.document.body.classList.toggle('modal-open', open);

      if (!open) {
        return;
      }

      setTimeout(() => this.nameInput?.nativeElement.focus(), 100);
    });
  }

  ngAfterViewInit(): void {
    if (this.isOpen()) {
      setTimeout(() => this.nameInput?.nativeElement.focus(), 100);
    }
  }

  close(): void {
    if (this.loading()) {
      return;
    }

    this.ui.closeGuestModal();
    this.form.reset({
      name: '',
      phone: '',
      consent: false
    });
    this.messageText.set('');
    this.messageType.set('');
  }

  submit(): void {
    const name = this.form.controls.name.value.trim();
    const phone = extractPhoneDigits(this.form.controls.phone.value);
    const consent = this.form.controls.consent.value;

    this.messageText.set('');
    this.messageType.set('');

    if (name.length < 2) {
      this.messageText.set('Введите корректное имя');
      this.messageType.set('error');
      return;
    }

    if (phone.length !== 11) {
      this.messageText.set('Телефон введён не полностью');
      this.messageType.set('error');
      return;
    }

    if (!consent) {
      this.messageText.set('Подтвердите согласие на обработку данных');
      this.messageType.set('error');
      return;
    }

    this.loading.set(true);

    timer(800)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.requestsService.add({ name, phone });
        this.messageText.set('✅ Заявка отправлена');
        this.messageType.set('success');
        this.loading.set(false);

        setTimeout(() => this.close(), 1000);
      });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }
}
