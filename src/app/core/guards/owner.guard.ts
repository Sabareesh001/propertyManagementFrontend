import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectIsOwner } from '../../store/auth/auth.selectors';

export const ownerGuard = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsOwner).pipe(
    take(1),
    map((isOwner) => isOwner || router.createUrlTree(['/notfound'])),
  );
};
