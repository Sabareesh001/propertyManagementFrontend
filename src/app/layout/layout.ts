import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Tabs, TabList, Tab } from 'primeng/tabs';
import { SplitButton } from 'primeng/splitbutton';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { PanelMenu } from 'primeng/panelmenu';
import { Message } from 'primeng/message';
import { Popover } from 'primeng/popover';
import { OverlayBadge } from 'primeng/overlaybadge';
import { MenuItem } from 'primeng/api';
import { Store } from '@ngrx/store';
import { AuthActions } from '../store/auth/auth.actions';
import { ThemeService } from '../core/services/theme.service';
import { StripeService } from '../core/services/stripe.service';
import { UserVerificationService, VerificationStatus } from '../core/services/user-verification.service';
import { VerifyUserModalComponent } from '../shared/verify-user-modal/verify-user-modal';
import { ChatbotWidgetComponent } from '../shared/chatbot-widget/chatbot-widget';
import { NotificationService, NotificationDto } from '../core/services/notification.service';
import { selectIsOwner, selectIsAdmin, selectIsLoggedIn } from '../store/auth/auth.selectors';

const TAB_ROUTES = [
  '/dashboard', 
  '/owner/dashboard', 
  '/my-requests', 
  '/site-visits',
  '/owner/properties', 
  '/owner/received-requests', 
  '/owner/site-visits',
  '/leases', 
  '/complaints', 
  '/owner/complaints'
]

const OWNER_MENU_ITEMS = [
  { label: 'Overview', icon: 'pi pi-chart-line', route: '/owner/dashboard' },
  { label: 'My Properties', icon: 'pi pi-building', route: '/owner/properties' },
  { label: 'Received Requests', icon: 'pi pi-inbox', route: '/owner/received-requests' },
  { label: 'Cancellations', icon: 'pi pi-file-excel', route: '/owner/cancellations/requests' },
  { label: 'Site Visit Requests', icon: 'pi pi-map-marker', route: '/owner/site-visits' },
  { label: 'Property Complaints', icon: 'pi pi-flag-fill', route: '/owner/complaints' },
];

const ALL_DRAWER_ITEMS = [
  { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard', ownerOnly: false, loggedInOnly: false, adminOnly: false, hideForAdmin: true },
  { label: 'Overview', icon: 'pi pi-chart-line', route: '/owner/dashboard', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'My Requests', icon: 'pi pi-file-edit', route: '/my-requests', ownerOnly: false, loggedInOnly: true, adminOnly: false, hideForAdmin: true },
  { label: 'Site Visits', icon: 'pi pi-map', route: '/site-visits', ownerOnly: false, loggedInOnly: true, adminOnly: false, hideForAdmin: true },
  { label: 'My Properties', icon: 'pi pi-building', route: '/owner/properties', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'Received Requests', icon: 'pi pi-inbox', route: '/owner/received-requests', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'Cancellations', icon: 'pi pi-file-excel', route: '/owner/cancellations/requests', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'Site Visit Requests', icon: 'pi pi-map-marker', route: '/owner/site-visits', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'Leases', icon: 'pi pi-file-check', route: '/leases', ownerOnly: false, loggedInOnly: true, adminOnly: false, hideForAdmin: true },
  { label: 'My Cancellations', icon: 'pi pi-file-excel', route: '/cancellations', ownerOnly: false, loggedInOnly: true, adminOnly: false, hideForAdmin: true },
  { label: 'My Complaints', icon: 'pi pi-flag', route: '/complaints', ownerOnly: false, loggedInOnly: true, adminOnly: false, hideForAdmin: true },
  { label: 'Property Complaints', icon: 'pi pi-flag-fill', route: '/owner/complaints', ownerOnly: true, loggedInOnly: false, adminOnly: false, hideForAdmin: false },
  { label: 'Property Verifications', icon: 'pi pi-building', route: '/admin/verifications/property', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'User Verifications', icon: 'pi pi-verified', route: '/admin/verifications/user', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Lease Templates', icon: 'pi pi-file-check', route: '/admin/verifications/lease', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Signed Leases', icon: 'pi pi-verified', route: '/admin/verifications/signed-lease', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Cancellation Templates', icon: 'pi pi-file-excel', route: '/admin/verifications/cancellation-template', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Signed Cancellations', icon: 'pi pi-verified', route: '/admin/verifications/cancellation-signed', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Revenue', icon: 'pi pi-chart-line', route: '/admin/finance/revenue', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Transactions', icon: 'pi pi-credit-card', route: '/admin/finance/transactions', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
  { label: 'Charges', icon: 'pi pi-receipt', route: '/admin/finance/charges', ownerOnly: false, loggedInOnly: false, adminOnly: true, hideForAdmin: false },
];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Tabs, TabList, Tab, SplitButton, Button, Drawer, PanelMenu, Message, Popover, OverlayBadge, DatePipe, VerifyUserModalComponent, ChatbotWidgetComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  private store = inject(Store);
  private router = inject(Router);
  private stripeService = inject(StripeService);
  private userVerificationService = inject(UserVerificationService);
  themeService = inject(ThemeService);
  notificationService = inject(NotificationService);

  drawerVisible = false;
  activeTab = '0';
  currentUrl = signal(this.router.url);

  isOwner = toSignal(this.store.select(selectIsOwner), { initialValue: false });
  isAdmin = toSignal(this.store.select(selectIsAdmin), { initialValue: false });
  isLoggedIn = toSignal(this.store.select(selectIsLoggedIn), { initialValue: false });

  /** null = status unknown/not fetched yet; true/false = fetched. */
  private stripeOnboarded = signal<boolean | null>(null);
  private stripeStatusRequested = false;
  onboardLoading = signal(false);

  showStripeReminder = computed(
    () => this.isOwner() && !this.isAdmin() && this.stripeOnboarded() === false,
  );

  /** null = status unknown/not fetched yet. */
  private verificationStatus = signal<VerificationStatus | null>(null);
  private verificationStatusRequested = false;
  verifyModalVisible = false;

  showVerifyReminder = computed(() => {
    const status = this.verificationStatus();
    return !this.isAdmin() && (status === 'Unverified' || status === 'Rejected');
  });
  showVerifyPending = computed(
    () => !this.isAdmin() && this.verificationStatus() === 'Pending',
  );
  verifyReminderText = computed(() =>
    this.verificationStatus() === 'Rejected'
      ? 'Your identity verification was rejected. Please resubmit your documents.'
      : 'Verify your identity to list properties or submit lease proposals.',
  );
  verifyButtonLabel = computed(() =>
    this.verificationStatus() === 'Rejected' ? 'Resubmit Documents' : 'Get Verified',
  );

  navItems = computed(() =>
    ALL_DRAWER_ITEMS.filter(
      (item) =>
        (!item.ownerOnly || this.isOwner()) &&
        (!item.loggedInOnly || this.isLoggedIn()) &&
        (!item.adminOnly || this.isAdmin()) &&
        (!item.hideForAdmin || !this.isAdmin()),
    ),
  );

  ownerMenuItems = computed<MenuItem[]>(() => {
    const url = this.currentUrl();
    return OWNER_MENU_ITEMS.map((item) => ({
      label: item.label,
      icon: item.icon,
      styleClass: url.startsWith(item.route) ? 'nav-item-active' : '',
      command: () => this.navigateDrawerItem(item.route),
    }));
  });

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
            label: 'Lease Templates',
            icon: 'pi pi-file-check',
            styleClass:
              url.startsWith('/admin/verifications/lease') &&
              !url.startsWith('/admin/verifications/signed-lease')
                ? 'nav-item-active'
                : '',
            command: () => this.navigateDrawerItem('/admin/verifications/lease'),
          },
          {
            label: 'Signed Leases',
            icon: 'pi pi-verified',
            styleClass: url.startsWith('/admin/verifications/signed-lease') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/signed-lease'),
          },
          {
            label: 'Cancellation Templates',
            icon: 'pi pi-file-excel',
            styleClass: url.startsWith('/admin/verifications/cancellation-template') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/cancellation-template'),
          },
          {
            label: 'Signed Cancellations',
            icon: 'pi pi-verified',
            styleClass: url.startsWith('/admin/verifications/cancellation-signed') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/verifications/cancellation-signed'),
          },
        ],
      },
      {
        label: 'Finance',
        icon: 'pi pi-wallet',
        expanded: true,
        items: [
          {
            label: 'Revenue',
            icon: 'pi pi-chart-line',
            styleClass: url.startsWith('/admin/finance/revenue') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/finance/revenue'),
          },
          {
            label: 'Transactions',
            icon: 'pi pi-credit-card',
            styleClass: url.startsWith('/admin/finance/transactions') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/finance/transactions'),
          },
          {
            label: 'Charges',
            icon: 'pi pi-receipt',
            styleClass: url.startsWith('/admin/finance/charges') ? 'nav-item-active' : '',
            command: () => this.navigateDrawerItem('/admin/finance/charges'),
          },
        ],
      },
      {
        label: 'Complaints',
        icon: 'pi pi-flag',
        styleClass: url.startsWith('/admin/complaints') ? 'nav-item-active' : '',
        command: () => this.navigateDrawerItem('/admin/complaints'),
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
    effect(() => {
      if (this.isLoggedIn() && !this.isAdmin() && !this.verificationStatusRequested) {
        this.verificationStatusRequested = true;
        this.userVerificationService.getStatus().subscribe({
          next: (res) => this.verificationStatus.set(res.status),
          // Leave status unknown — better no banner than a wrong one.
          error: () => this.verificationStatus.set(null),
        });
      }
    });

    effect(() => {
      if (this.isOwner() && !this.stripeStatusRequested) {
        this.stripeStatusRequested = true;
        this.stripeService.getStatus().subscribe({
          next: (status) => this.stripeOnboarded.set(status.isOnboarded),
          // No Stripe account yet — the owner still needs to onboard.
          error: () => this.stripeOnboarded.set(false),
        });
      }
    });

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

  openVerifyModal(): void {
    this.verifyModalVisible = true;
  }

  onVerificationSubmitted(): void {
    this.verificationStatus.set('Pending');
  }

  startStripeOnboarding(): void {
    if (this.onboardLoading()) return;
    this.onboardLoading.set(true);
    this.stripeService.onboard().subscribe({
      next: (res) => {
        window.location.href = res.onboardingUrl;
      },
      error: () => this.onboardLoading.set(false),
    });
  }

  logout() {
    this.store.dispatch(AuthActions.logout());
  }

  selectNotification(n: NotificationDto, popover: Popover): void {
    if (!n.isRead) this.notificationService.markAsRead(n.id);
    const route = this.notificationService.routeForNotification(n);
    if (route) this.router.navigate([route]);
    popover.hide();
  }
}
