import { Injectable, signal, computed, inject } from '@angular/core';
import { PropertyDetail } from './property.service';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class CompareService {
  private messageService = inject(MessageService);
  
  // Store the full property details in memory.
  // This persists across route changes.
  private selectedPropertiesSig = signal<PropertyDetail[]>([]);
  
  public readonly selectedProperties = this.selectedPropertiesSig.asReadonly();
  
  public readonly canCompare = computed(() => this.selectedPropertiesSig().length >= 2);
  
  public readonly selectionCount = computed(() => this.selectedPropertiesSig().length);

  toggleSelection(property: PropertyDetail) {
    const current = this.selectedPropertiesSig();
    const isAlreadySelected = current.find(p => p.id === property.id);
    
    if (isAlreadySelected) {
      // Remove it
      this.selectedPropertiesSig.set(current.filter(p => p.id !== property.id));
    } else {
      // Check limit before adding
      if (current.length >= 3) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Comparison Limit Reached',
          detail: 'You can only compare up to 3 properties at a time.',
          life: 3000
        });
        return;
      }
      this.selectedPropertiesSig.set([...current, property]);
    }
  }
  
  removeProperty(propertyId: number) {
    const current = this.selectedPropertiesSig();
    this.selectedPropertiesSig.set(current.filter(p => p.id !== propertyId));
  }

  clearSelection() {
    this.selectedPropertiesSig.set([]);
  }

  isSelected(propertyId: number): boolean {
    return !!this.selectedPropertiesSig().find(p => p.id === propertyId);
  }
}
