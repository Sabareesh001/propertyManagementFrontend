import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Tabs, TabList, Tab } from 'primeng/tabs';
import { SplitButton } from 'primeng/splitbutton';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { PanelMenu } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { Store } from '@ngrx/store';
import { AuthActions } from '../store/auth/auth.actions';
import { ThemeService } from '../core/services/theme.service';
import { selectIsOwner, selectIsAdmin } from '../store/auth/auth.selectors';

const TAB_ROUTES = ['/dashboard', '/owner/properties', '/admin/verifications'];

const ALL_DRAWER_ITEMS = [
  { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard', ownerOnly: false, adminOnly: false, hideForAdmin: true },
  { label: 'My Properties', icon: 'pi pi-building', route: '/owner/properties', ownerOnly: true, adminOnly: false, hideForAdmin: false },
  { label: 'Property Verifications', icon: 'pi pi-building', route: '/admin/verifications/property', ownerOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'User Verifications', icon: 'pi pi-verified', route: '/admin/verifications/user', ownerOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Lease Verifications', icon: 'pi pi-file-check', route: '/admin/verifications/lease', ownerOnly: false, adminOnly: true, hideForAdmin: false },
];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Tabs, TabList, Tab, SplitButton, Button, Drawer, PanelMenu],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  private store = inject(Store);
  private router = inject(Router);
  themeService = inject(ThemeService);

  drawerVisible = false;
  activeTab = '0';
  currentUrl = signal(this.router.url);

  isOwner = toSignal(this.store.select(selectIsOwner), { initialValue: false });
  isAdmin = toSignal(this.store.select(selectIsAdmin), { initialValue: false });

  navItems = computed(() =>
    ALL_DRAWER_ITEMS.filter(
      (item) =>
        (!item.ownerOnly || this.isOwner()) &&
        (!item.adminOnly || this.isAdmin()) &&
        (!item.hideForAdmin || !this.isAdmin()),
    ),
  );

  showAdminSidebar = computed(() => this.isAdmin() && this.currentUrl().startsWith('/admin'));

  adminMenuItems = computed<MenuItem[]>(() => {
    const url = this.currentUrl();
    return [
      {
        label: 'Verifications',
        icon: 'pi pi-shield',
        expanded: true,
        items: [
          {
            label: 'Properties',
            icon: 'pi pi-building',
            styleClass: url.startsWith('/admin/verifications/property') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/property'),
          },
          {
            label: 'Users',
            icon: 'pi pi-verified',
            styleClass: url.startsWith('/admin/verifications/user') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/user'),
          },
          {
            label: 'Leases',
            icon: 'pi pi-file-check',
            styleClass: url.startsWith('/admin/verifications/lease') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/lease'),
          },
        ],
      },
    ];
  });

  profileMenuItems: MenuItem[] = [
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  constructor() {
    this.syncTabFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.syncTabFromUrl(e.urlAfterRedirects);
        this.currentUrl.set(e.urlAfterRedirects);
      });
  }

  private syncTabFromUrl(url: string): void {
    const idx = TAB_ROUTES.findIndex((r) => url.startsWith(r));
    this.activeTab = idx >= 0 ? String(idx) : '0';
  }

  navigateTab(value: string): void {
    const route = TAB_ROUTES[Number(value)];
    if (route) this.router.navigate([route]);
  }

  navigateDrawerItem(route: string): void {
    this.router.navigate([route]);
    this.drawerVisible = false;
  }

  logout() {
    this.store.dispatch(AuthActions.logout());
  }
}
