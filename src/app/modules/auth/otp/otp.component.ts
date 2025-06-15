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

@Component({
  selector: 'app-otp',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './otp.component.html',
  styleUrl: './otp.component.scss',
})
export class OtpComponent implements OnInit, AfterViewInit {
  @ViewChild('otpInput') otpInputs!: QueryList<ElementRef>;
  @Output() otpVerified = new EventEmitter<string>();
  @Output() resendOtp = new EventEmitter<void>();
  @ViewChild('otpInput0') otpInput0!: ElementRef;
  @ViewChild('otpInput1') otpInput1!: ElementRef;
  @ViewChild('otpInput2') otpInput2!: ElementRef;
  @ViewChild('otpInput3') otpInput3!: ElementRef;
  @ViewChild('otpInput4') otpInput4!: ElementRef;
  @ViewChild('otpInput5') otpInput5!: ElementRef;

  otpForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.otpForm = this.fb.group({
      digit0: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit4: ['', [Validators.required, Validators.pattern('[0-9]')]],
      digit5: ['', [Validators.required, Validators.pattern('[0-9]')]],
    });
  }

  ngAfterViewInit() {
    // Auto-focus first input on load
    this.otpInput0.nativeElement.focus();
  }

  handleKeyUp(event: any, index: number) {
    const value = event.target.value;

    if (value.length === 1) {
      // Move to next input
      if (index < 5) {
        this.focusInput(index + 1);
      }
    }
  }

  handleKeyDown(event: any, index: number) {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      // Move to previous input on backspace
      this.focusInput(index - 1);
    }
  }

  handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const pastedText = clipboardData.getData('text');
    const otp = pastedText.replace(/\D/g, '').substring(0, 6);

    // Update form values
    for (let i = 0; i < otp.length; i++) {
      this.otpForm.get(`digit${i}`)?.setValue(otp[i]);
    }

    // Focus the last input
    this.focusInput(Math.min(5, otp.length - 1));
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
      case 4:
        this.otpInput4.nativeElement.focus();
        break;
      case 5:
        this.otpInput5.nativeElement.focus();
        break;
    }
  }

  onSubmit() {
    if (this.otpForm.valid) {
      const otp = Object.values(this.otpForm.value).join('');
      this.otpVerified.emit(otp);
    }
  }
}
