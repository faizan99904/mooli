import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CONFIG } from '../../../../../../config';
import { CommonModule } from '@angular/common';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { Config } from 'datatables.net';
import { Router, RouterLink } from '@angular/router';
import { BackendService } from '../../../../core/services/backend.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, DataTablesModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  http = inject(HttpClient);
  @ViewChild(DataTableDirective, { static: false })
  dtDirective!: DataTableDirective;
  constructor(
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router
  ) {}

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

  editUser(user: any) {
    this.router.navigate(['/create-user'], { state: { user } });
  }
}
