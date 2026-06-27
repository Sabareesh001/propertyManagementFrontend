import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Tabs, TabList, Tab } from 'primeng/tabs';
import { SplitButton } from 'primeng/splitbutton';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';
import { Store } from '@ngrx/store';
import { AuthActions } from '../store/auth/auth.actions';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Tabs, TabList, Tab, SplitButton, Button, Drawer],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  private store = inject(Store);
  themeService = inject(ThemeService);

  drawerVisible = false;

  navItems = [
    { label: 'Dashboard', icon: 'pi pi-home' },
    { label: 'My Properties', icon: 'pi pi-building' },
  ];

  profileMenuItems: MenuItem[] = [
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  logout() {
    this.store.dispatch(AuthActions.logout());
  }
}
