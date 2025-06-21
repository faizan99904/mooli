import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CONFIG } from '../../../../config';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  constructor(private http: HttpClient) {}

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post(CONFIG.login, payload);
  }

  forgetPass(payload: {
    email: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.http.post(CONFIG.forgetPass, payload);
  }

  verifyOtp(payload: { email: string; otp: string }): Observable<any> {
    return this.http.post(CONFIG.verifyOtp, payload);
  }

  getRole(): Observable<any> {
    return this.http.get<any>(CONFIG.getAllRole);
  }

  getAllNotes(): Observable<any> {
    return this.http.get<any>(CONFIG.getAllNotes);
  }

  addNote(payload: { notes: string; isBookMarked: boolean }): Observable<any> {
    return this.http.post<any>(CONFIG.addNotes, payload);
  }

  changePass(payload: {
    newPassword: string;
    oldPassword: string;
  }): Observable<any> {
    return this.http.post<any>(CONFIG.changePass, payload);
  }

  deleteNote(id: string): Observable<any> {
    return this.http.delete(`${CONFIG.deleteNote.replace(':id', id)}`);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${CONFIG.deleteUser.replace(':id', id)}`);
  }

  updateUser(id: string, data: any) {
    const url = CONFIG.editUser.replace(':id', id);
    return this.http.put(url, data);
  }
}
