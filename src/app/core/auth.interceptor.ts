import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq).pipe(
      catchError((error) => {
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
  return next(req);
};
