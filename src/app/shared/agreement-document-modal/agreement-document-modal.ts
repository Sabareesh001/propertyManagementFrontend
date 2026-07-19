import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { SafeUrlPipe } from '../pipes/safe-url.pipe';

export interface RuleSection {
  title: string;
  rules: string[];
}

const DUMMY_RULES: RuleSection[] = [
  {
    title: 'Occupancy & Conduct',
    rules: [
      'Only the tenant(s) named on the lease may reside at the property; guests staying beyond 14 consecutive days require owner approval.',
      'Quiet hours are observed from 10:00 PM to 7:00 AM daily.',
      'Smoking is prohibited inside the premises and within 25 feet of any entrance.',
    ],
  },
  {
    title: 'Maintenance & Property Care',
    rules: [
      'Tenant must report maintenance issues within 48 hours of discovery.',
      'No structural alterations, painting, or permanent fixtures without written owner consent.',
      'Tenant is responsible for routine upkeep including lawn care, unless otherwise stated in the lease.',
    ],
  },
  {
    title: 'Payments & Fees',
    rules: [
      'Rent is due on the 1st of each month; a grace period of 5 days applies before late fees accrue.',
      'Returned payments incur an administrative fee as outlined in the lease agreement.',
      'Security deposits are refundable within 30 days of move-out, subject to a property condition assessment.',
    ],
  },
  {
    title: 'Pets & Vehicles',
    rules: [
      'Pets must be registered with the owner and comply with any breed or weight restrictions.',
      'Vehicles must be parked only in designated areas; no on-street or lawn parking.',
    ],
  },
  {
    title: 'Termination & Renewal',
    rules: [
      'Either party must provide written notice at least 30 days prior to lease termination or non-renewal.',
      'Early termination may be subject to fees as detailed in the signed agreement.',
    ],
  },
];

@Component({
  selector: 'app-agreement-document-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TabsModule, SafeUrlPipe],
  templateUrl: './agreement-document-modal.html',
  styleUrl: './agreement-document-modal.css',
})
export class AgreementDocumentModalComponent {
  @Input() visible = false;
  @Input() title = 'Lease Agreement';
  @Input() set documentUrl(url: string | null) {
    this._documentUrl = url;
    this.safeDocumentUrl = url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
  get documentUrl(): string | null {
    return this._documentUrl;
  }
  @Output() visibleChange = new EventEmitter<boolean>();

  private _documentUrl: string | null = null;
  safeDocumentUrl: SafeResourceUrl | null = null;

  ruleSections = DUMMY_RULES;

  constructor(private sanitizer: DomSanitizer) {}

  close(): void {
    this.visibleChange.emit(false);
  }
}
