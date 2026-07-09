import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { CompareService } from '../core/services/compare.service';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-compare-properties',
  standalone: true,
  imports: [CommonModule, ButtonModule, MessageModule, TooltipModule],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export class ComparePropertiesComponent {
  public compareService = inject(CompareService);
  private location = inject(Location);
  private router = inject(Router);

  get properties() {
    return this.compareService.selectedProperties();
  }

  get analytics() {
    const props = this.properties;
    if (props.length < 2) return null;

    let bestRent = props[0];
    let bestInitialCost = props[0];

    for (const p of props) {
      if (p.monthlyRent < bestRent.monthlyRent) {
        bestRent = p;
      }
      
      const currentInitial = p.upfrontPayment + p.securityDeposit;
      const bestInitial = bestInitialCost.upfrontPayment + bestInitialCost.securityDeposit;
      if (currentInitial < bestInitial) {
        bestInitialCost = p;
      }
    }

    return {
      bestRent,
      bestInitialCost
    };
  }

  goBack() {
    this.location.back();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  getThumbnail(property: any): string {
    if (property.thumbnailImgUrl) return property.thumbnailImgUrl;
    if (property.propertyImages?.length) return property.propertyImages[0].imageUrl;
    return '';
  }

  getSpecificDays(prop: any): string {
    if (prop.visitPreferences === 'Weekends') {
      return 'Saturday, Sunday';
    } else if (prop.visitPreferences === 'Weekdays') {
      return 'Monday - Friday';
    } else if (prop.visitPreferences === 'Specific' && prop.specificVisitDays) {
      return prop.specificVisitDays.replace(/,/g, ', ');
    }
    return 'All Days';
  }

  removeProperty(id: number) {
    this.compareService.removeProperty(id);
    if (this.properties.length === 0) {
      this.router.navigate(['/dashboard']);
    }
  }

  goToProperty(id: number) {
    this.router.navigate(['/property', id]);
  }
}
