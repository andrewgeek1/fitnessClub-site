import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: [''],
    password: ['']
  });
  readonly errorMessage = signal('');

  submit(): void {
    const user = this.auth.login(this.form.controls.username.value, this.form.controls.password.value);

    if (!user) {
      this.errorMessage.set('Ошибка входа');
      return;
    }

    this.errorMessage.set('');
    void this.router.navigate([user.role === 'admin' ? '/admin' : '/']);
  }
}
