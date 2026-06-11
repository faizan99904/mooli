import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { User } from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  search = '';
  loading = false;
  permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as string[];

  constructor(
    private backend: BackendService,
    private toast: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.backend.getUsers({ context: 'hospital' }).subscribe({
      next: (users) => {
        this.users = users || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.users = [];
        this.toast.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  filteredUsers(): User[] {
    const searchValue = this.search.toLowerCase();
    if (!searchValue) {
      return this.users;
    }

    return this.users.filter((user) =>
      [user.name, user.email, user.phone, user.role?.name, user.hospital?.name, user.status]
        .join(' ')
        .toLowerCase()
        .includes(searchValue)
    );
  }

  get canViewHospitalColumn(): boolean {
    return this.hasPermission('*');
  }

  canCreateUser(): boolean {
    return this.hasPermission('users.create');
  }

  canUpdateUser(): boolean {
    return this.hasPermission('users.update');
  }

  canDeleteUser(): boolean {
    return this.hasPermission('users.delete');
  }

  deleteUser(id: string) {
    if (!this.canDeleteUser()) {
      this.toast.error('You do not have permission to delete users.');
      return;
    }

    if (!confirm('Delete this user?')) {
      return;
    }

    this.backend.deleteUser(id, { context: 'hospital' }).subscribe({
      next: (resp) => {
        this.toast.success(resp.message || 'User deleted successfully');
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Something went wrong');
      },
    });
  }

  editUser(user: User) {
    if (!this.canUpdateUser()) {
      return;
    }

    this.router.navigate(['/create-user'], { state: { user } });
  }

  private hasPermission(permission: string): boolean {
    return this.permissions.includes('*') || this.permissions.includes(permission);
  }

}
