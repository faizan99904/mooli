import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';

type ResetStep = 'email' | 'reset' | 'success';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnDestroy {
  @ViewChildren('otpInput')
  otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  step: ResetStep = 'email';
  requestLoading = false;
  resetLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  expiresRemaining = 300;
  resendRemaining = 0;

  recoveryForm: FormGroup;
  resetForm: FormGroup;

  private countdownInterval?: ReturnType<typeof setInterval>;
  private navigationTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private router: Router,
    private toaster: ToastrService
  ) {
    this.recoveryForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      digit0: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit1: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit2: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit3: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit4: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      digit5: ['', [Validators.required, Validators.pattern(/^\d$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  get maskedEmail(): string {
    const email = String(this.recoveryForm.value.email || '');
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return email;
    }

    const visible = localPart.slice(0, Math.min(2, localPart.length));
    return `${visible}${'*'.repeat(Math.max(2, localPart.length - visible.length))}@${domain}`;
  }

  get expiryDisplay(): string {
    return this.formatSeconds(this.expiresRemaining);
  }

  get resendDisplay(): string {
    return this.formatSeconds(this.resendRemaining);
  }

  get passwordMismatch(): boolean {
    const newPassword = this.resetForm.get('newPassword')?.value;
    const confirmPassword = this.resetForm.get('confirmPassword')?.value;
    return Boolean(confirmPassword && newPassword !== confirmPassword);
  }

  requestOtp(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.sendOtpRequest(false);
  }

  resendOtp(): void {
    if (this.resendRemaining > 0 || this.requestLoading) {
      return;
    }

    this.sendOtpRequest(true);
  }

  submitReset(): void {
    if (this.resetForm.invalid || this.passwordMismatch) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const otp = this.getOtp();

    if (!/^\d{6}$/.test(otp)) {
      this.toaster.warning('Enter the complete 6-digit verification code.');
      return;
    }

    this.resetLoading = true;
    this.backend
      .verifyOtp({
        email: this.recoveryForm.value.email,
        otp,
        newPassword: this.resetForm.value.newPassword,
      })
      .pipe(finalize(() => (this.resetLoading = false)))
      .subscribe({
        next: (response) => {
          this.clearCountdown();
          this.step = 'success';
          this.toaster.success(response.message || 'Password reset successfully.');
          this.navigationTimeout = setTimeout(
            () => this.router.navigateByUrl('/login/access'),
            1800
          );
        },
        error: (error) => {
          this.toaster.error(
            error?.error?.message || 'Unable to reset password. Please request a new code.'
          );
        },
      });
  }

  editEmail(): void {
    this.clearCountdown();
    this.step = 'email';
    this.resetForm.reset();
  }

  togglePasswordVisibility(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }

  handleOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;
    this.resetForm.get(`digit${index}`)?.setValue(digit);

    if (digit && index < 5) {
      this.focusOtp(index + 1);
    }
  }

  handleOtpKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      this.focusOtp(index - 1);
    }
  }

  handleOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const otp = (event.clipboardData?.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, 6);

    otp.split('').forEach((digit, index) => {
      this.resetForm.get(`digit${index}`)?.setValue(digit);
      const input = this.otpInputs.get(index)?.nativeElement;
      if (input) {
        input.value = digit;
      }
    });

    if (otp.length > 0) {
      this.focusOtp(Math.min(otp.length, 6) - 1);
    }
  }

  ngOnDestroy(): void {
    this.clearCountdown();

    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }
  }

  private sendOtpRequest(isResend: boolean): void {
    this.requestLoading = true;
    this.backend
      .forgetPass({ email: this.recoveryForm.value.email })
      .pipe(finalize(() => (this.requestLoading = false)))
      .subscribe({
        next: (response) => {
          this.step = 'reset';
          this.resetForm.reset();
          this.startCountdown(
            response.data?.expiresInSeconds || 300,
            response.data?.resendAfterSeconds || 60
          );
          this.toaster.success(
            isResend
              ? 'A new verification code has been sent.'
              : response.message || 'Verification code sent.'
          );
          setTimeout(() => this.focusOtp(0));
        },
        error: (error) => {
          this.toaster.error(
            error?.error?.message || 'Unable to send verification code.'
          );
        },
      });
  }

  private getOtp(): string {
    return Array.from({ length: 6 }, (_, index) =>
      String(this.resetForm.get(`digit${index}`)?.value || '')
    ).join('');
  }

  private focusOtp(index: number): void {
    this.otpInputs.get(index)?.nativeElement.focus();
  }

  private startCountdown(expiresInSeconds: number, resendAfterSeconds: number): void {
    this.clearCountdown();
    this.expiresRemaining = expiresInSeconds;
    this.resendRemaining = resendAfterSeconds;

    this.countdownInterval = setInterval(() => {
      this.expiresRemaining = Math.max(0, this.expiresRemaining - 1);
      this.resendRemaining = Math.max(0, this.resendRemaining - 1);

      if (this.expiresRemaining === 0 && this.resendRemaining === 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  private formatSeconds(value: number): string {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
