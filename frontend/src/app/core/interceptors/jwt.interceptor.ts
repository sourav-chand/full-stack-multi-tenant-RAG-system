import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthApi } from '../auth/auth.api';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const authApi = inject(AuthApi);
  const token = auth.accessToken();

  const isAuthRoute = req.url.includes('/auth/');
  const cloned = !isAuthRoute && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthRoute) {
        return new Observable((sub) => {
          authApi.refresh().subscribe({
            next: (res) => {
              auth.setAccessToken(res.accessToken);
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${res.accessToken}` }
              });
              next(retried).subscribe({
                next: (v) => sub.next(v as never),
                error: (e) => {
                  if (e.status === 401) {
                    auth.clear();
                    router.navigate(['/login']);
                  }
                  sub.error(e);
                },
                complete: () => sub.complete()
              });
            },
            error: () => {
              auth.clear();
              router.navigate(['/login']);
              sub.error(err);
            }
          });
        });
      }
      return throwError(() => err);
    })
  );
};
