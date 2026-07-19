import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { SiteVisitService, SiteVisitResponseDto } from '../../core/services/site-visit.service';
import { PropertyService } from '../../core/services/property.service';

@Component({
  selector: 'app-owner-site-visits',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, TextareaModule, ToastModule, SelectModule, MultiSelectModule, 
    InputTextModule, TooltipModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="page-container">
      <div class="header">
        <h2>Site Visit Requests</h2>
      </div>
      @if (loading()) {
        <p>Loading...</p>
      } @else {
        <p-table [value]="visits()" [paginator]="true" [rows]="10" styleClass="p-datatable-striped responsive-table" [scrollable]="true">
            <ng-template pTemplate="header">
            <tr>
              <th>Property</th>
              <th>Tenant</th>
              <th>Requested Date & Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-visit>
            <tr>
              <td data-label="Property">
                <div class="flex align-items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
                  <a [routerLink]="['/property', visit.propertyId]" style="text-decoration: none; font-weight: bold; color: var(--primary-color);">
                    {{ visit.property?.title }}
                  </a>
                </div>
              </td>
              <td data-label="Tenant">{{ visit.tenant?.firstName }} {{ visit.tenant?.lastName }} <br> <small>{{ visit.tenant?.email }}</small></td>
              <td data-label="Requested Date & Time">{{ visit.visitDate | date:'MMM d, y, h:mm a' }}</td>
              <td data-label="Status">
                <p-tag [value]="visit.statusName" [severity]="getSeverity(visit.statusId)"></p-tag>
              </td>
              <td data-label="Action">
                @if (visit.statusId === 1) {
                  <div class="action-buttons">
                    <p-button icon="pi pi-check" styleClass="p-button-sm" severity="success" [outlined]="true" [rounded]="true" label="Approve" (onClick)="openActionDialog(visit, 2)"></p-button>
                    <p-button icon="pi pi-times" styleClass="p-button-sm" severity="danger" [outlined]="true" [rounded]="true" label="Cancel" (onClick)="openActionDialog(visit, 3)"></p-button>
                  </div>
                } @else {
                  <span class="text-sm text-gray-500">{{ visit.remarks || 'No remarks' }}</span>
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" style="text-align: center;">No site visits requested.</td>
            </tr>
          </ng-template>
        </p-table>
      }
      
      <p-dialog [(visible)]="dialogVisible" [header]="dialogTitle" [modal]="true" [style]="{ width: '90vw', maxWidth: '400px' }">
        <div class="mt-3">
          <label for="remarks" style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Remarks (Optional)</label>
          <textarea id="remarks" pInputTextarea [(ngModel)]="remarks" rows="3" style="width: 100%; box-sizing: border-box; resize: vertical; border-radius: 6px;"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Close" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="dialogVisible = false"></p-button>
          <p-button [label]="dialogActionLabel" [icon]="dialogActionIcon" [severity]="dialogActionSeverity" (onClick)="submitAction()"></p-button>
        </ng-template>
      </p-dialog>

      <!-- End of Action Dialog -->
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; width: 100%; box-sizing: border-box; }
    .header { margin-bottom: 2rem; }
    h2 { margin: 0; font-size: 1.5rem; }
    .action-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    :host ::ng-deep .responsive-table { width: 100%; }

    @media (max-width: 768px) {
      .page-container { padding: 1rem; }
      h2 { font-size: 1.25rem; }

      :host ::ng-deep .responsive-table table,
      :host ::ng-deep .responsive-table thead,
      :host ::ng-deep .responsive-table tbody,
      :host ::ng-deep .responsive-table tr,
      :host ::ng-deep .responsive-table td { display: block; width: 100%; box-sizing: border-box; }

      :host ::ng-deep .responsive-table thead { display: none; }

      :host ::ng-deep .responsive-table tbody tr,
      :host ::ng-deep .responsive-table tr {
        margin-bottom: 1rem;
        border: 1px solid var(--p-content-border-color);
        border-radius: 8px;
        overflow: hidden;
      }

      :host ::ng-deep .responsive-table td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        text-align: right;
        border: none;
        border-bottom: 1px solid var(--p-content-border-color);
        padding: 0.75rem 1rem;
      }

      :host ::ng-deep .responsive-table td:last-child { border-bottom: none; }

      :host ::ng-deep .responsive-table td::before {
        content: attr(data-label);
        font-weight: 600;
        text-align: left;
        color: var(--p-text-muted-color);
        flex-shrink: 0;
      }

      .action-buttons { justify-content: flex-end; }
    }
  `]
})
export class OwnerSiteVisitsComponent implements OnInit {
  private siteVisitService = inject(SiteVisitService);
  private propertyService = inject(PropertyService);
  private messageService = inject(MessageService);
  
  visits = signal<SiteVisitResponseDto[]>([]);
  loading = signal(true);
  
  // Action Dialog state
  dialogVisible = false;
  dialogTitle = '';
  dialogActionLabel = '';
  dialogActionIcon = '';
  dialogActionSeverity: 'success' | 'danger' = 'success';
  remarks = '';
  
  selectedVisit: SiteVisitResponseDto | null = null;
  selectedStatusId: number = 0;

  ngOnInit() {
    this.loadVisits();
  }

  loadVisits() {
    this.loading.set(true);
    this.siteVisitService.getOwnerRequests().subscribe({
      next: (data) => {
        this.visits.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openActionDialog(visit: SiteVisitResponseDto, statusId: number) {
    this.selectedVisit = visit;
    this.selectedStatusId = statusId;
    this.remarks = '';
    
    if (statusId === 2) {
      this.dialogTitle = 'Approve Site Visit';
      this.dialogActionLabel = 'Approve';
      this.dialogActionIcon = 'pi pi-check';
      this.dialogActionSeverity = 'success';
    } else {
      this.dialogTitle = 'Cancel Site Visit';
      this.dialogActionLabel = 'Cancel Visit';
      this.dialogActionIcon = 'pi pi-times';
      this.dialogActionSeverity = 'danger';
    }
    
    this.dialogVisible = true;
  }

  submitAction() {
    if (!this.selectedVisit) return;
    
    this.siteVisitService.updateStatus(this.selectedVisit.id, {
      statusId: this.selectedStatusId,
      remarks: this.remarks
    }).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Status updated successfully.'});
        this.loadVisits();
      },
      error: (err) => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to update status.'});
      }
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
