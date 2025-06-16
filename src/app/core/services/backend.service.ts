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
}
