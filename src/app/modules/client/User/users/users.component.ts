import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CONFIG } from '../../../../../../config';
import { CommonModule } from '@angular/common';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { Config } from 'datatables.net';
import { Router, RouterLink } from '@angular/router';
import { BackendService } from '../../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrescriptionComponent } from '../../prescription/prescription.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    DataTablesModule,
    RouterLink,
    ReactiveFormsModule,
    PrescriptionComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;
  http = inject(HttpClient);
  isEditUser: boolean = false;
  @ViewChild(DataTableDirective, { static: false })
  dtDirective!: DataTableDirective;
  userForm!: FormGroup;

  constructor(
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      userId: [''],
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required]],
      address: [''],
      status: ['', Validators.required],
    });
  }

  dtOptions: Config = {};
  Users: any[] = [];

  ngOnInit(): void {
    this.initializeDataTable();
  }

  initializeDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      ordering: false,
      serverSide: true,
      searching: true,
      autoWidth: false,
      processing: true,
      ajax: (dataTablesParameters: any, callback: any) => {
        this.http
          .post<any>(CONFIG.getAllUsers, dataTablesParameters)
          .subscribe({
            next: (resp) => {
              this.Users = resp?.data?.data || [];
              callback({
                recordsTotal: resp.data.recordsTotal,
                recordsFiltered: resp.data.recordsFiltered,
                data: [],
              });
            },
          });
      },
    };
  }

  deleteUser(id: string) {
    this.backend.deleteUser(id).subscribe({
      next: (resp) => {
        this.toast.success(resp.message || 'User deleted Successfully!');
        if (this.dtDirective && this.dtDirective.dtInstance) {
          this.dtDirective.dtInstance.then((dtInstance: any) => {
            dtInstance.ajax.reload(null, false);
          });
        }
      },
      error: (err) => {
        this.toast.error(err.message || 'Something went wrong!');
      },
    });
  }

  renderTable() {
    this.dtDirective.dtInstance.then((dtInstance: any) => {
      dtInstance.draw();
    });
  }

  editUser(user: any) {
    this.router.navigate(['/create-user'], { state: { user } });
  }

  editUserModal(user: any) {
    this.isEditUser = !this.isEditUser;
    this.userForm.patchValue({
      username: user.username,
      firstName: user.lastName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      status: user.status,
      userId: user._id,
    });
  }

  onSubmit() {
    this.http.put(CONFIG.editUser, this.userForm.value).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || 'edit user successfully');
        this.isEditUser = false;
        this.renderTable();
      },
      error: (error) => {
        this.toast.error(error.message || 'error');
      },
    });
  }

  onCancel() {
    this.isEditUser = false;
  }
}
