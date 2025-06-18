import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CONFIG } from '../../../../../../config';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../../../core/services/backend.service';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent implements OnInit {
  userForm!: FormGroup;
  roleId: any;
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toast: ToastrService,
    private backend: BackendService
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      address: ['', Validators.required],
      role: ['', Validators.required],
    });

    // this.backend.getRole().subscribe({
    //   next: (res) => {
    //     this.roleId = res.data._id;
    //     console.log(res.data._id);
    //   },
    // });
  }

  submitForm() {
    this.userForm.get('role')?.setValue(this.roleId);
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = this.userForm.value;
    console.log('Final Payload:', payload);

    this.http.post(CONFIG.createUser, payload).subscribe({
      next: (resp: any) => {
        this.toast.success(resp?.message || 'Users Created successfully');
      },
      error: (err) => {
        this.toast.error(err?.message || 'Oops!');
      },
    });
  }
}
