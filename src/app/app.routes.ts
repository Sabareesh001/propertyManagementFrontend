import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register/register';
import { LoginComponent } from './auth/login/login';
import { NotFoundComponent } from './not-found/not-found';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './dashboard/dashboard';
import { PropertyDetailComponent } from './property-detail/property-detail';

export const routes: Routes = [
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'property/:id', component: PropertyDetailComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
