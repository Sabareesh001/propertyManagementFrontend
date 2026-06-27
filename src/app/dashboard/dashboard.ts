import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ScrollTop } from 'primeng/scrolltop';
import { PropertyCardComponent } from '../shared/property-card/property-card';
import { PropertyService } from '../core/services/property.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PropertyCardComponent, FormsModule, InputTextModule, IconFieldModule, InputIconModule, ScrollTop],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  private propertyService = inject(PropertyService);

  searchQuery = signal('');

  readonly allProperties = this.propertyService.getAll();

  filteredProperties = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allProperties;
    return this.allProperties.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.addressLine.toLowerCase().includes(q)
    );
  });
}
