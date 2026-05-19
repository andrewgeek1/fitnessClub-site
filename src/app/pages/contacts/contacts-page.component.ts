import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, timer } from 'rxjs';
import { extractPhoneDigits, formatPhone, sanitizeName } from '../../core/data/form-utils';
import { RequestsService } from '../../core/services/requests.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-contacts-page',
  imports: [ReactiveFormsModule],
  templateUrl: './contacts-page.component.html',
  styleUrl: './contacts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestsService = inject(RequestsService);
  private readonly ui = inject(UiService);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    phone: ['']
  });
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly messageText = signal('');
  readonly messageType = signal<'success' | 'error' | ''>('');

  constructor() {
    const draft = this.requestsService.getContactDraft();
    this.form.patchValue(draft, { emitEvent: false });

    this.form.controls.name.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => {
        const nextValue = sanitizeName(value);
        if (nextValue !== value) {
          this.form.controls.name.setValue(nextValue, { emitEvent: false });
        }

        this.persistDraft();
      });

    this.form.controls.phone.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => {
        const nextValue = formatPhone(value);
        if (nextValue !== value) {
          this.form.controls.phone.setValue(nextValue, { emitEvent: false });
        }

        this.persistDraft();
      });
  }

  openGuestModal(): void {
    this.ui.openGuestModal();
  }

  submit(): void {
    this.submitted.set(true);
    this.messageText.set('');
    this.messageType.set('');

    if (this.nameInvalid() || this.phoneInvalid()) {
      return;
    }

    this.loading.set(true);

    timer(800)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.requestsService.add({
          name: this.form.controls.name.value.trim(),
          phone: extractPhoneDigits(this.form.controls.phone.value)
        });

        this.messageText.set('✅ Заявка отправлена');
        this.messageType.set('success');
        this.loading.set(false);
        this.submitted.set(false);
        this.form.reset({
          name: '',
          phone: ''
        });
        this.requestsService.clearContactDraft();
      });
  }

  nameInvalid(): boolean {
    return this.form.controls.name.value.trim().length < 2;
  }

  phoneInvalid(): boolean {
    return extractPhoneDigits(this.form.controls.phone.value).length !== 11;
  }

  private persistDraft(): void {
    this.requestsService.setContactDraft({
      name: this.form.controls.name.value,
      phone: this.form.controls.phone.value
    });
  }
}
