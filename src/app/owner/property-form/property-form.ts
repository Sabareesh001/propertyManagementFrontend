import { Component, OnInit, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { take, switchMap, of, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { PropertyService, PropertyPayload, PropertyImagePayload, PropertyDocument, AddPropertyDocumentPayload } from '../../core/services/property.service';
import { selectCurrentUser } from '../../store/auth/auth.selectors';

interface CityOption {
  label: string;
  value: number;
}

interface ImageEntry {
  id: string;
  url: string;
  file: File | null;
  description: string;
  displayOrder: number;
}

interface PendingDeed {
  file: File;
  documentNumber: string;
  previewName: string;
}

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
    MessageModule,
    DividerModule,
    ProgressSpinnerModule,
    ChipModule,
  ],
  providers: [MessageService],
  templateUrl: './property-form.html',
  styleUrl: './property-form.css',
})
export class PropertyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private propertyService = inject(PropertyService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private store = inject(Store);

  @ViewChild('thumbnailInput') thumbnailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('deedInput') deedInput!: ElementRef<HTMLInputElement>;

  isEdit = signal(false);
  propertyId = signal<number | null>(null);
  verificationStatusId = signal<number | null>(null);
  notFound = signal(false);
  loading = signal(false);
  saving = signal(false);
  thumbnailUrl = signal<string | null>(null);
  thumbnailFile = signal<File | null>(null);
  additionalImages = signal<ImageEntry[]>([]);
  backendFieldErrors = signal<Record<string, string[]>>({});
  backendErrorMessage = signal<string | null>(null);

  existingDeeds = signal<PropertyDocument[]>([]);
  deedsToRemove = signal<string[]>([]);
  pendingDeed = signal<PendingDeed | null>(null);
  pendingDeedNumber = signal<string>('');
  deedNumberError = signal<string | null>(null);

  cities: CityOption[] = [
    { label: 'Bengaluru', value: 1 },
    { label: 'Mumbai', value: 2 },
    { label: 'Delhi', value: 3 },
    { label: 'Chennai', value: 4 },
    { label: 'Hyderabad', value: 5 },
    { label: 'Pune', value: 6 },
  ];

  visitPreferenceOptions = [
    { label: 'All Days', value: 'AllDays' },
    { label: 'Weekdays (Mon-Fri)', value: 'Weekdays' },
    { label: 'Weekends (Sat-Sun)', value: 'Weekends' },
    { label: 'Specific Days', value: 'Specific' },
  ];

  dayOptions = [
    { label: 'Monday', value: 'Monday' },
    { label: 'Tuesday', value: 'Tuesday' },
    { label: 'Wednesday', value: 'Wednesday' },
    { label: 'Thursday', value: 'Thursday' },
    { label: 'Friday', value: 'Friday' },
    { label: 'Saturday', value: 'Saturday' },
    { label: 'Sunday', value: 'Sunday' },
  ];

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    description: ['', Validators.maxLength(2000)],
    addressLine: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
    cityId: [null, Validators.required],
    monthlyRent: [null, [Validators.required, Validators.min(0)]],
    upfrontPayment: [null, [Validators.required, Validators.min(0)]],
    securityDeposit: [null, [Validators.required, Validators.min(0)]],
    visitPreferences: ['AllDays', Validators.required],
    specificVisitDays: [[]],
    visitStartTime: ['09:00', Validators.required],
    visitEndTime: ['18:00', Validators.required],
  });

  get isVerified(): boolean {
    return this.verificationStatusId() === 3;
  }

  get pageTitle(): string {
    return this.isEdit() ? 'Edit Property' : 'Add New Property';
  }

  get submitLabel(): string {
    return this.isEdit() ? 'Save Changes' : 'Create Property';
  }

  /** Returns backend error messages for a specific form field, or null if none. */
  backendErrorsFor(field: string): string[] | null {
    const errors = this.backendFieldErrors();
    // Backend sends PascalCase keys; try both PascalCase and the raw key.
    const pascal = field.charAt(0).toUpperCase() + field.slice(1);
    const msgs = errors[pascal] ?? errors[field] ?? null;
    return msgs?.length ? msgs : null;
  }

  private clearBackendErrors(): void {
    this.backendFieldErrors.set({});
    this.backendErrorMessage.set(null);
  }

  private handleApiError(err: unknown, fallbackSummary: string): void {
    const e = err as { error?: unknown };
    const body = e?.error as Record<string, unknown> | null | undefined;
    let toastDetail: string;

    // Resolve field errors: backend sends either { errors: { Field: [msgs] } }
    // or the field map directly as the top-level body { Field: [msgs] }.
    const fieldMap: Record<string, string[]> | null =
      this.asFieldErrorsMap(body?.['errors']) ??
      this.asFieldErrorsMap(body);

    if (fieldMap) {
      this.backendFieldErrors.set(fieldMap);
      this.backendErrorMessage.set(null);
      toastDetail = Object.values(fieldMap).flat().join(' ');
    } else {
      const msg =
        (body?.['detail'] as string | undefined) ??
        (body?.['message'] as string | undefined) ??
        'Something went wrong. Please try again.';
      this.backendErrorMessage.set(msg);
      this.backendFieldErrors.set({});
      toastDetail = msg;
    }

    this.messageService.add({
      severity: 'error',
      summary: fallbackSummary,
      detail: toastDetail,
      life: 5000,
    });
  }

  /** Returns the object as a field-errors map if every present value is a string array, else null. */
  private asFieldErrorsMap(obj: unknown): Record<string, string[]> | null {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const entries = Object.entries(obj as Record<string, unknown>);
    if (!entries.length) return null;
    if (!entries.every(([, v]) => Array.isArray(v))) return null;
    return obj as Record<string, string[]>;
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.clearBackendErrors());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.isEdit.set(true);
    this.propertyId.set(id);
    this.loading.set(true);

    this.store.select(selectCurrentUser).pipe(take(1)).subscribe((user) => {
      this.propertyService.getById(id).subscribe({
        next: (property) => {
          if (user && property.ownerId !== user.id) {
            this.notFound.set(true);
            this.loading.set(false);
            return;
          }

          this.verificationStatusId.set(property.verificationStatusId);
          this.form.patchValue({
            title: property.title,
            description: property.description ?? '',
            addressLine: property.addressLine,
            cityId: property.cityId,
            monthlyRent: property.monthlyRent,
            upfrontPayment: property.upfrontPayment,
            securityDeposit: property.securityDeposit,
            visitPreferences: property.visitPreferences || 'AllDays',
            specificVisitDays: property.specificVisitDays ? property.specificVisitDays.split(',') : [],
            visitStartTime: property.visitStartTime ? property.visitStartTime.substring(0, 5) : '09:00',
            visitEndTime: property.visitEndTime ? property.visitEndTime.substring(0, 5) : '18:00',
          });

          this.thumbnailUrl.set(property.thumbnailImgUrl);
          this.additionalImages.set(
            property.propertyImages.map((img) => ({
              id: img.id,
              url: img.imageUrl,
              file: null,
              description: img.description ?? '',
              displayOrder: img.displayOrder,
            })),
          );

          // Load existing documents (deeds)
          this.propertyService.getDocuments(id).subscribe({
            next: (docs) => {
              this.existingDeeds.set(docs.filter(d => d.documentTypeId === 2));
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    });
  }

  openThumbnailPicker(): void {
    this.thumbnailInput.nativeElement.value = '';
    this.thumbnailInput.nativeElement.click();
  }

  onThumbnailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const prev = this.thumbnailUrl();
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.thumbnailFile.set(file);
    this.thumbnailUrl.set(URL.createObjectURL(file));
  }

  removeThumbnail(): void {
    const prev = this.thumbnailUrl();
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.thumbnailFile.set(null);
    this.thumbnailUrl.set(null);
  }

  openGalleryPicker(): void {
    this.galleryInput.nativeElement.value = '';
    this.galleryInput.nativeElement.click();
  }

  onGalleryChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const current = this.additionalImages();
    const nextOrder = current.length > 0
      ? Math.max(...current.map(i => i.displayOrder)) + 1
      : 1;
    const newEntries: ImageEntry[] = files.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      file,
      description: '',
      displayOrder: nextOrder + idx,
    }));
    this.additionalImages.set([...current, ...newEntries]);
  }

  removeImage(id: string): void {
    const img = this.additionalImages().find(i => i.id === id);
    if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
    this.additionalImages.set(
      this.additionalImages()
        .filter(i => i.id !== id)
        .map((entry, idx) => ({ ...entry, displayOrder: idx + 1 }))
    );
  }

  updateImageDescription(id: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.additionalImages.update(imgs =>
      imgs.map(img => img.id === id ? { ...img, description: value } : img)
    );
  }

  // ── Deed upload ──────────────────────────────────────────────────────────

  openDeedPicker(): void {
    this.deedInput.nativeElement.value = '';
    this.deedInput.nativeElement.click();
  }

  onDeedChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingDeed.set({ file, documentNumber: this.pendingDeedNumber(), previewName: file.name });
    this.deedNumberError.set(null);
  }

  onDeedNumberChange(value: string): void {
    this.pendingDeedNumber.set(value);
    if (this.pendingDeed()) {
      this.pendingDeed.update(d => d ? { ...d, documentNumber: value } : null);
    }
    this.deedNumberError.set(null);
  }

  clearPendingDeed(): void {
    this.pendingDeed.set(null);
    this.pendingDeedNumber.set('');
    this.deedNumberError.set(null);
  }

  markDeedForRemoval(id: string): void {
    this.deedsToRemove.update(ids => [...ids, id]);
    this.existingDeeds.update(deeds => deeds.filter(d => d.id !== id));
  }

  private validateDeedNumber(num: string): boolean {
    return /^[a-zA-Z0-9\-]{4,50}$/.test(num);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    // Validate pending deed if one is staged
    const pending = this.pendingDeed();
    if (pending) {
      const num = pending.documentNumber.trim();
      if (!num) {
        this.deedNumberError.set('Document number is required.');
        return;
      }
      if (!this.validateDeedNumber(num)) {
        this.deedNumberError.set('4–50 characters, letters, digits, and hyphens only.');
        return;
      }
    }

    this.saving.set(true);

    // Gather any newly-picked files that need uploading first.
    const thumbFile = this.thumbnailFile();
    const galleryEntries = this.additionalImages();
    const filesToUpload: File[] = [];
    if (thumbFile) filesToUpload.push(thumbFile);
    galleryEntries.forEach((e) => {
      if (e.file) filesToUpload.push(e.file);
    });

    if (filesToUpload.length === 0) {
      // Nothing new to upload — every image already has a permanent URL.
      this.persist(this.buildPayload(this.thumbnailUrl(), galleryEntries.map((e) => e.url)));
      return;
    }

    this.propertyService.uploadImages(filesToUpload).subscribe({
      next: ({ urls }) => {
        let idx = 0;
        const thumbUrl = thumbFile ? urls[idx++] : this.thumbnailUrl();
        const galleryUrls = galleryEntries.map((e) => (e.file ? urls[idx++] : e.url));
        this.persist(this.buildPayload(thumbUrl, galleryUrls));
      },
      error: (err) => {
        this.saving.set(false);
        this.handleApiError(err, 'Image upload failed');
      },
    });
  }

  /** Builds the create/update payload, mapping resolved image URLs onto the gallery entries. */
  private buildPayload(thumbnailImgUrl: string | null, galleryUrls: string[]): PropertyPayload {
    const v = this.form.value;
    const entries = this.additionalImages();
    const propertyImages: PropertyImagePayload[] = entries.map((entry, i) => ({
      // New entries carry a temporary `new-…` id; send null so the backend creates them.
      id: entry.id.startsWith('new-') ? null : entry.id,
      imageUrl: galleryUrls[i],
      description: entry.description || null,
      displayOrder: entry.displayOrder,
    }));

    return {
      title: v.title,
      description: v.description || null,
      addressLine: v.addressLine,
      cityId: v.cityId,
      monthlyRent: v.monthlyRent,
      upfrontPayment: v.upfrontPayment,
      securityDeposit: v.securityDeposit,
      thumbnailImgUrl,
      propertyImages,
      visitPreferences: v.visitPreferences,
      specificVisitDays: v.visitPreferences === 'Specific' ? (v.specificVisitDays || []).join(',') : null,
      visitStartTime: v.visitStartTime ? `${v.visitStartTime}:00` : null,
      visitEndTime: v.visitEndTime ? `${v.visitEndTime}:00` : null,
    };
  }

  private persist(payload: PropertyPayload): void {
    const request$ = this.isEdit()
      ? this.propertyService.update(this.propertyId()!, payload)
      : this.propertyService.create(payload);

    request$.pipe(
      switchMap((property) => {
        const pid = property.id as unknown as number;
        const pending = this.pendingDeed();
        const removals = this.deedsToRemove();

        // Build remove observables
        const remove$ = removals.length
          ? forkJoin(removals.map(did => this.propertyService.removeDocument(pid, did)))
          : of(null);

        // Build add observable: upload PDF then attach
        const add$ = pending
          ? this.propertyService.uploadDocument(pending.file).pipe(
              switchMap(({ url }) => {
                const docPayload: AddPropertyDocumentPayload = {
                  documentTypeId: 2,
                  documentNumber: pending.documentNumber.trim(),
                  documentUrl: url,
                };
                return this.propertyService.addDocument(pid, docPayload);
              }),
            )
          : of(null);

        return forkJoin([remove$, add$]);
      }),
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.isEdit() ? 'Property updated' : 'Property created',
          life: 2000,
        });
        setTimeout(() => this.router.navigate(['/owner/properties']), 300);
      },
      error: (err) => {
        this.saving.set(false);
        this.handleApiError(err, this.isEdit() ? 'Update failed' : 'Create failed');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/owner/properties']);
  }

  fieldError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
