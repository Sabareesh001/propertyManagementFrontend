import { Component, Input, Output, EventEmitter, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SiteVisitService } from '../../core/services/site-visit.service';
import { PropertyDetail } from '../../core/services/property.service';

@Component({
  selector: 'app-schedule-visit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, DatePickerModule],
  templateUrl: './schedule-visit-modal.html',
  styleUrl: './schedule-visit-modal.css'
})
export class ScheduleVisitModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() property: PropertyDetail | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() visitScheduled = new EventEmitter<void>();

  private siteVisitService = inject(SiteVisitService);

  visitDate: Date | null = null;
  visitTime: Date | null = null;
  submitting = signal(false);
  error = signal<string | null>(null);

  minDate = new Date();
  disabledDays: number[] = [];
  minTime: string | null = null;
  maxTime: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['property'] && this.property) {
      this.updateRestrictions();
      
      // Reset selections when property changes
      this.visitDate = null;
      this.visitTime = null;
      this.error.set(null);
    }
  }

  updateRestrictions() {
    this.disabledDays = [];
    this.minTime = null;
    this.maxTime = null;
    
    if (!this.property) return;

    if (this.property.visitStartTime) {
      this.minTime = this.property.visitStartTime.substring(0, 5); // "10:00:00" -> "10:00"
    }
    if (this.property.visitEndTime) {
      this.maxTime = this.property.visitEndTime.substring(0, 5); // "18:00:00" -> "18:00"
    }

    if (!this.property.visitPreferences) return;

    const pref = this.property.visitPreferences;
    if (pref === 'Weekdays') {
      this.disabledDays = [0, 6];
    } else if (pref === 'Weekends') {
      this.disabledDays = [1, 2, 3, 4, 5];
    } else if (pref === 'Specific' && this.property.specificVisitDays) {
      const allowedDaysStr = this.property.specificVisitDays.split(',').map(d => d.trim().toLowerCase());
      const dayMap: { [key: string]: number } = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      
      const allowedDayIndexes = allowedDaysStr.map(d => dayMap[d]).filter(d => d !== undefined);
      
      this.disabledDays = [0,1,2,3,4,5,6].filter(d => !allowedDayIndexes.includes(d));
    }
  }

  format12Hr(time24: string): string {
    if (!time24) return '';
    const parts = time24.split(':').map(Number);
    if (parts.length < 2) return time24;
    
    const h = parts[0];
    const m = parts[1];
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.error.set(null);
  }

  submit() {
    if (!this.visitDate || !this.visitTime || !this.property) {
      this.error.set('Please select both a date and a time.');
      return;
    }
    
    const selectedDateTime = new Date(this.visitDate);
    selectedDateTime.setHours(this.visitTime.getHours(), this.visitTime.getMinutes(), 0, 0);

    // Make sure the chosen date and time is not in the past
    if (selectedDateTime < new Date()) {
      this.error.set('You cannot schedule a visit in the past.');
      return;
    }

    // Double check time boundaries
    if (this.minTime && this.maxTime) {
       const selectedMinutes = this.visitTime.getHours() * 60 + this.visitTime.getMinutes();
       
       const startParts = this.minTime.split(':').map(Number);
       const startMinutes = startParts[0] * 60 + startParts[1];
       
       const endParts = this.maxTime.split(':').map(Number);
       const endMinutes = endParts[0] * 60 + endParts[1];
       
       if (selectedMinutes < startMinutes || selectedMinutes > endMinutes) {
           this.error.set(`Please select a time between ${this.format12Hr(this.minTime)} and ${this.format12Hr(this.maxTime)}.`);
           return;
       }
    }
    
    const isoDate = selectedDateTime.toISOString();
    
    this.submitting.set(true);
    this.error.set(null);

    this.siteVisitService.requestVisit(this.property.id, { visitDate: isoDate }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.visitScheduled.emit();
        this.close();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.detail || err.error?.message || 'Failed to schedule visit.');
      }
    });
  }
}
