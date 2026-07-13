import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { VerifyEmailComponent } from './auth/verify-email/verify-email';
import { NotFoundComponent } from './not-found/not-found';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './dashboard/dashboard';
import { PropertyDetailComponent } from './property-detail/property-detail';
import { MyPropertiesComponent } from './owner/my-properties/my-properties';
import { PropertyFormComponent } from './owner/property-form/property-form';
import { MyRequestsComponent } from './tenant/my-requests/my-requests';
import { ReceivedRequestsComponent } from './owner/received-requests/received-requests';
import { OwnerDashboardComponent } from './owner/owner-dashboard/owner-dashboard';
import { LeasesComponent } from './leases/leases';
import { LeaseDetailComponent } from './leases/lease-detail/lease-detail';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { adminGuard } from './core/guards/admin.guard';
import { nonAdminGuard } from './core/guards/non-admin.guard';
import { VerificationsComponent } from './admin/verifications/verifications';
import { FinanceComponent } from './admin/finance/finance';
import { ComplaintsListComponent } from './complaints/complaints-list/complaints-list';
import { ComplaintDetailComponent } from './complaints/complaint-detail/complaint-detail';
import { TenantSiteVisitsComponent } from './tenant/site-visits/tenant-site-visits';
import { OwnerSiteVisitsComponent } from './owner/site-visits/owner-site-visits';
import { ComparePropertiesComponent } from './compare/compare';

export const routes: Routes = [
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/verify-email/:hash', component: VerifyEmailComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [nonAdminGuard] },
      { path: 'my-requests', component: MyRequestsComponent, canActivate: [authGuard, nonAdminGuard,] },
      { path: 'leases', component: LeasesComponent, canActivate: [authGuard, nonAdminGuard] },
      { path: 'leases/:id', component: LeaseDetailComponent, canActivate: [authGuard, nonAdminGuard] },
      { path: 'property/:id', component: PropertyDetailComponent },
      {
        path: 'complaints',
        component: ComplaintsListComponent,
        data: { scope: 'mine' },
        canActivate: [authGuard, nonAdminGuard],
      },
      { path: 'complaints/:id', component: ComplaintDetailComponent, canActivate: [authGuard] },
      {
        path: 'owner/complaints',
        component: ComplaintsListComponent,
        data: { scope: 'received' },
        canActivate: [authGuard, ownerGuard],
      },
      {
        path: 'owner/dashboard',
        component: OwnerDashboardComponent,
        canActivate: [authGuard, ownerGuard],
      },
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
        path: 'site-visits',
        component: TenantSiteVisitsComponent,
        canActivate: [authGuard, nonAdminGuard],
      },
      {
        path: 'compare',
        component: ComparePropertiesComponent,
        canActivate: [authGuard, nonAdminGuard],
      },
      {
        path: 'owner/site-visits',
        component: OwnerSiteVisitsComponent,
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
      {
        path: 'admin/finance/:section',
        component: FinanceComponent,
        canActivate: [authGuard, adminGuard],
      },
      { path: 'admin/finance', redirectTo: 'admin/finance/revenue', pathMatch: 'full' },
      {
        path: 'admin/complaints',
        component: ComplaintsListComponent,
        data: { scope: 'all' },
        canActivate: [authGuard, adminGuard],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
