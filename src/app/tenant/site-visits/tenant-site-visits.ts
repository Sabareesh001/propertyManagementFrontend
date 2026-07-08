import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SiteVisitService, SiteVisitResponseDto } from '../../core/services/site-visit.service';

@Component({
  selector: 'app-tenant-site-visits',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, TagModule, ButtonModule],
  template: `
    <div class="page-container">
      <div class="header">
        <h2>My Scheduled Site Visits</h2>
      </div>
      @if (loading()) {
        <p>Loading...</p>
      } @else {
        <p-table [value]="visits()" [paginator]="true" [rows]="10" styleClass="p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>Property</th>
              <th>Visit Date & Time</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-visit>
            <tr>
              <td>
                <a [routerLink]="['/property', visit.propertyId]" style="text-decoration: none; font-weight: bold; color: var(--primary-color);">
                  {{ visit.property?.title }}
                </a>
              </td>
              <td>{{ visit.visitDate | date:'medium' }}</td>
              <td>
                <p-tag [value]="visit.statusName" [severity]="getSeverity(visit.statusId)"></p-tag>
              </td>
              <td>{{ visit.remarks || '-' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" style="text-align: center;">No site visits scheduled.</td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .header { margin-bottom: 2rem; }
    h2 { margin: 0; font-size: 1.8rem; }
  `]
})
export class TenantSiteVisitsComponent implements OnInit {
  private siteVisitService = inject(SiteVisitService);
  
  visits = signal<SiteVisitResponseDto[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.siteVisitService.getMyRequests().subscribe({
      next: (data) => {
        this.visits.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getSeverity(statusId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    switch (statusId) {
      case 1: return 'warn'; // Pending
      case 2: return 'success'; // Approved
      case 3: return 'danger'; // Cancelled
      default: return 'info';
    }
  }
}
