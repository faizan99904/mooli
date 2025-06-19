import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { CONFIG } from '../../../../../../config';
import { CommonModule } from '@angular/common';
import { DataTablesModule } from 'angular-datatables';
import { Config } from 'datatables.net';
import { ToastrService } from 'ngx-toastr';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, DataTablesModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  http = inject(HttpClient);
  constructor(private toaster: ToastrService) {}

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

  deleteUser(userId: string) {
    console.log('Delete user with ID:', userId);
  }
}
