import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  QueryList,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BackendService } from '../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit, AfterViewInit {
  isOtp: boolean = false;
  recoveryForm!: FormGroup;
  showNewPassword = false;
  showConfirmPassword = false;
  countdownTime: number = 120;
  countdownDisplay: string = '02:00';
  showCountdown: boolean = true;
  private countdownInterval: any;
  @ViewChild('otpInput') otpInputs!: QueryList<ElementRef>;
  @Output() otpVerified = new EventEmitter<string>();
  @Output() resendOtp = new EventEmitter<void>();
  @ViewChild('otpInput0') otpInput0!: ElementRef;
  @ViewChild('otpInput1') otpInput1!: ElementRef;
  @ViewChild('otpInput2') otpInput2!: ElementRef;
  @ViewChild('otpInput3') otpInput3!: ElementRef;

  otpForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private backend: BackendService,
    private router: Router,
    private toaster: ToastrService
  ) {}

  ngOnInit() {
    this.recoveryForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validator: this.passwordMatchValidator }
    );

    this.otpForm = this.fb.group({
      digit0: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'newPassword' | 'confirmPassword') {
    if (field === 'newPassword') {
      this.showNewPassword = !this.showNewPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  ngAfterViewInit() {
    this.otpInput0.nativeElement.focus();
  }

  handleKeyUp(event: any, index: number) {
    const value = event.target.value;

    if (value.length === 1) {
      if (index < 3) {
        this.focusInput(index + 1);
      }
    }
  }

  handleKeyDown(event: any, index: number) {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      this.focusInput(index - 1);
    }
  }

  handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const pastedText = clipboardData.getData('text');
    const otp = pastedText.replace(/\D/g, '').substring(0, 3);

    for (let i = 0; i < otp.length; i++) {
      this.otpForm.get(`digit${i}`)?.setValue(otp[i]);
    }

    this.focusInput(Math.min(3, otp.length - 1));
  }

  private focusInput(index: number) {
    switch (index) {
      case 0:
        this.otpInput0.nativeElement.focus();
        break;
      case 1:
        this.otpInput1.nativeElement.focus();
        break;
      case 2:
        this.otpInput2.nativeElement.focus();
        break;
      case 3:
        this.otpInput3.nativeElement.focus();
        break;
    }
  }

  startCountdown() {
    this.showCountdown = true;
    this.countdownTime = 120;
    this.updateCountdownDisplay();

    this.countdownInterval = setInterval(() => {
      this.countdownTime--;
      this.updateCountdownDisplay();

      if (this.countdownTime <= 0) {
        clearInterval(this.countdownInterval);
        this.showCountdown = false;
      }
    }, 1000);
  }

  updateCountdownDisplay() {
    const minutes = Math.floor(this.countdownTime / 60);
    const seconds = this.countdownTime % 60;
    this.countdownDisplay = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  onSubmit() {
    if (this.otpForm.valid) {
      const otp = Object.values(this.otpForm.value).join('');
      this.otpVerified.emit(otp);
    }
  }

  resend() {
    this.resetPass();
    this.startCountdown();
  }

  resetPass() {
    if (this.recoveryForm.valid) {
      const payload = this.recoveryForm.value;
      this.backend.forgetPass(payload).subscribe({
        next: (response: any) => {
          this.toaster.success(response?.message || 'Otp sent successfully!');
          this.isOtp = true;
          this.startCountdown();
          console.log(response);
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Something went wrong!');
        },
      });
      console.log(this.recoveryForm.value);
    } else {
      this.recoveryForm.markAllAsTouched();
    }
  }

  verifyOtp() {
    const otp = [
      this.otpForm.value.digit0,
      this.otpForm.value.digit1,
      this.otpForm.value.digit2,
      this.otpForm.value.digit3,
    ].join('');
    const payload = {
      email: this.recoveryForm.get('email')?.value,
      otp: otp,
    };
    if (this.otpForm.value) {
      this.backend.verifyOtp(payload).subscribe({
        next: (response: any) => {
          this.toaster.success(
            response?.message || 'Otp verified successfully!'
          );
          this.router.navigateByUrl('/login');
          console.log('OTP verified successfully', response);
        },
        error: (err) => {
          this.toaster.error(err.error?.message || 'Something went wrong!');
        },
      });
    }
  }
}
