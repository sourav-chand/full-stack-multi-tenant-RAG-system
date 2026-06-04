import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { UserRole } from '../../shared/models';

export function roleGuard(...allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    const role = auth.role();
    if (role && allowed.includes(role)) return true;
    router.navigate(['/dashboard']);
    return false;
  };
}
