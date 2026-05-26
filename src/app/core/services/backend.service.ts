import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CONFIG } from '../../../../config';

type StaticRole = {
  _id: string;
  name: string;
  permissions: string[];
};

type StaticUser = {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  address: string;
  status: string;
  role?: StaticRole;
  roleId?: string;
};

type StaticNote = {
  _id: string;
  notes: string;
  isBookMarked: boolean;
  createdAt: Date;
};

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private roles: StaticRole[] = [
    {
      _id: 'role-admin',
      name: 'ADMIN',
      permissions: ['users:view', 'users:create', 'users:update'],
    },
    {
      _id: 'role-super-admin',
      name: 'superAdmin',
      permissions: ['users:view', 'users:create', 'users:update', 'users:delete'],
    },
    {
      _id: 'role-owner',
      name: 'Owner',
      permissions: ['*'],
    },
  ];

  private users: StaticUser[] = [
    {
      _id: 'user-1',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@mooli.local',
      mobile: '03001234567',
      address: 'Karachi',
      status: 'active',
      roleId: 'role-admin',
      role: this.roles[0],
    },
    {
      _id: 'user-2',
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@mooli.local',
      mobile: '03007654321',
      address: 'Lahore',
      status: 'active',
      roleId: 'role-super-admin',
      role: this.roles[1],
    },
    {
      _id: 'user-3',
      username: 'owner',
      firstName: 'Owner',
      lastName: 'User',
      email: 'owner@mooli.local',
      mobile: '03009876543',
      address: 'Islamabad',
      status: 'active',
      roleId: 'role-owner',
      role: this.roles[2],
    },
  ];

  private notes: StaticNote[] = [
    {
      _id: 'note-1',
      notes: 'Follow up with today appointments.',
      isBookMarked: false,
      createdAt: new Date(),
    },
    {
      _id: 'note-2',
      notes: 'Review pending user requests.',
      isBookMarked: true,
      createdAt: new Date(),
    },
  ];

  constructor(private http: HttpClient) {}

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post(CONFIG.login, payload);
  }

  forgetPass(payload: { email: string }): Observable<any> {
    return of({
      message: 'Static OTP sent successfully!',
      data: { email: payload.email },
    });
  }

  verifyOtp(payload: {
    email: string;
    otp: string;
    newPassword?: string;
  }): Observable<any> {
    return of({
      message: 'Static OTP verified successfully!',
      data: payload,
    });
  }

  getRole(): Observable<any> {
    return of({ data: this.roles });
  }

  getAllUsers(dataTablesParameters?: any): Observable<any> {
    const searchValue = (
      dataTablesParameters?.search?.value || ''
    ).toLowerCase();
    const filteredUsers = searchValue
      ? this.users.filter((user) =>
          [
            user.username,
            user.firstName,
            user.lastName,
            user.email,
            user.mobile,
            user.address,
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchValue)
        )
      : this.users;

    return of({
      data: {
        data: filteredUsers,
        recordsTotal: this.users.length,
        recordsFiltered: filteredUsers.length,
      },
    });
  }

  createUser(payload: any): Observable<any> {
    const roleId = Array.isArray(payload.role) ? payload.role[0] : payload.role;
    const role = this.roles.find((item) => item._id === roleId);
    const user: StaticUser = {
      _id: `user-${Date.now()}`,
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      mobile: payload.mobile,
      address: payload.address,
      status: payload.status || 'active',
      roleId,
      role,
    };

    this.users = [user, ...this.users];

    return of({
      message: 'User created successfully',
      data: user,
    });
  }

  getAllNotes(): Observable<any> {
    return of({ data: this.notes });
  }

  addNote(payload: { notes: string; isBookMarked: boolean }): Observable<any> {
    const note: StaticNote = {
      _id: `note-${Date.now()}`,
      notes: payload.notes,
      isBookMarked: payload.isBookMarked,
      createdAt: new Date(),
    };

    this.notes = [note, ...this.notes];

    return of({
      message: 'Note added Successfully!',
      data: note,
    });
  }

  changePass(payload: {
    newPassword: string;
    oldPassword: string;
  }): Observable<any> {
    return of({
      message: 'Password changed!',
      data: payload,
    });
  }

  deleteNote(id: string): Observable<any> {
    this.notes = this.notes.filter((note) => note._id !== id);

    return of({
      message: 'Note deleted successfully',
      data: { id },
    });
  }

  deleteUser(id: string): Observable<any> {
    this.users = this.users.filter((user) => user._id !== id);

    return of({
      message: 'User deleted Successfully!',
      data: { id },
    });
  }

  updateUser(id: string, data: any) {
    this.users = this.users.map((user) =>
      user._id === id ? { ...user, ...data, _id: id } : user
    );

    return of({
      message: 'Edit user successfully',
      data: this.users.find((user) => user._id === id),
    });
  }
}
