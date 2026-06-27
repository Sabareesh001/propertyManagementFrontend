import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { NotFoundComponent } from './not-found/not-found';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './dashboard/dashboard';
import { PropertyDetailComponent } from './property-detail/property-detail';
import { MyPropertiesComponent } from './owner/my-properties/my-properties';
import { PropertyFormComponent } from './owner/property-form/property-form';
import { MyRequestsComponent } from './tenant/my-requests/my-requests';
import { ReceivedRequestsComponent } from './owner/received-requests/received-requests';
import { LeasesComponent } from './leases/leases';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { adminGuard } from './core/guards/admin.guard';
import { nonAdminGuard } from './core/guards/non-admin.guard';
import { VerificationsComponent } from './admin/verifications/verifications';

export const routes: Routes = [
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [nonAdminGuard] },
      { path: 'my-requests', component: MyRequestsComponent, canActivate: [authGuard, nonAdminGuard,] },
      { path: 'leases', component: LeasesComponent, canActivate: [authGuard, nonAdminGuard] },
      { path: 'property/:id', component: PropertyDetailComponent },
      {
        path: 'owner/properties',
        component: MyPropertiesComponent,
        canActivate: [authGuard, ownerGuard],
      },
      {
        path: 'owner/received-requests',
        component: ReceivedRequestsComponent,
        canActivate: [authGuard, ownerGuard],
      },
      {
        path: 'owner/properties/new',
        component: PropertyFormComponent,
        canActivate: [authGuard, ownerGuard],
      },
      {
        path: 'owner/properties/:id/edit',
        component: PropertyFormComponent,
        canActivate: [authGuard, ownerGuard],
      },
      {
        path: 'admin/verifications/:section',
        component: VerificationsComponent,
        canActivate: [authGuard, adminGuard],
      },
      { path: 'admin/verifications', redirectTo: 'admin/verifications/property', pathMatch: 'full' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
