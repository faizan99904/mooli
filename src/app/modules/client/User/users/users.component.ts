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
    this.backend.getUsers().subscribe({
      next: (users) => {
        this.users = users;
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
      [user.name, user.email, user.phone, user.role?.name, user.status]
        .join(' ')
        .toLowerCase()
        .includes(searchValue)
    );
  }

  deleteUser(id: string) {
    if (!confirm('Delete this user?')) {
      return;
    }

    this.backend.deleteUser(id).subscribe({
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
    this.router.navigate(['/create-user'], { state: { user } });
  }
}
