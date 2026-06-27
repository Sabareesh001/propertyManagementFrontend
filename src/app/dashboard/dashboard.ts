import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ScrollTop } from 'primeng/scrolltop';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { PropertyCardComponent } from '../shared/property-card/property-card';
import { PropertyService, PropertyDetail } from '../core/services/property.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    PropertyCardComponent,
    FormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ScrollTop,
    ProgressSpinnerModule,
    ButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private propertyService = inject(PropertyService);

  searchQuery = signal('');
  allProperties = signal<PropertyDetail[]>([]);
  loading = signal(true);
  error = signal(false);

  filteredProperties = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.allProperties();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.addressLine.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.propertyService.getAll().subscribe({
      next: (properties) => {
        this.allProperties.set(properties);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
