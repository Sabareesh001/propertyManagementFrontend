import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectIsAdmin } from '../../store/auth/auth.selectors';

export const nonAdminGuard = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAdmin).pipe(
    take(1),
    map((isAdmin) => !isAdmin || router.createUrlTree(['/admin/verifications'])),
  );
};
