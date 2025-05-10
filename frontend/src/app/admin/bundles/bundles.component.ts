import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { BundleDialogComponent } from './bundle-dialog/bundle-dialog.component';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { provideNativeDateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// Custom date formats for DD/MM/YYYY
const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-bundles',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './bundles.component.html',
  styleUrls: ['./bundles.component.scss']
})
export class BundlesComponent implements OnInit {
  bundles: any[] = [];
  modelName = 'bundles';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  services: any[] = [];
  isLoadingOptions = true;
  isLoading: boolean = true;
  expandedServices: { [key: string]: boolean } = {};
  expandedDescriptions: { [key: string]: boolean } = {};

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private injector: Injector
  ) {
    console.log('ApiService injected:', this.api);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownOptions();
  }

  loadDropdownOptions(): void {
    this.api.get<any[]>('services').subscribe({
      next: (services) => {
        this.services = services;
        this.formFields['serviceIds'].options = services.map((service: any) => ({
          value: service._id,
          label: service.name
        }));
        this.isLoadingOptions = false;
        this.loadBundles();
      },
      error: (err) => {
        console.error('Error loading services:', err);
        this.isLoadingOptions = false;
        this.loadBundles();
      }
    });
  }

  initializeForm(): void {
    this.formFields = {
      name: { default: '', validators: [Validators.required] },
      description: { default: '', validators: [Validators.required] },
      serviceIds: {
        default: [],
        validators: [Validators.required, Validators.minLength(1)],
        type: 'select',
        multiple: true,
        options: []
      },
      price: { default: 0, validators: [Validators.required, Validators.min(0)] },
      discount: { default: 0, validators: [Validators.required, Validators.min(0)] },
      timeLimitedDiscount: { default: null, validators: [Validators.min(0)] },
      discountStartDate: { default: null, validators: [] },
      discountEndDate: { default: null, validators: [] },
      isActive: { default: true, validators: [] },
      createdAt: { default: new Date(), validators: [] }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls);
  }

  loadBundles(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (bundles) => {
        this.bundles = bundles;
        console.log('Bundles loaded:', this.bundles);
        this.bundles.forEach(bundle => {
          this.expandedServices[bundle._id] = false;
          this.expandedDescriptions[bundle._id] = false;
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading bundles:', err);
        this.isLoading = false;
      }
    });
  }

  openEditDialog(item?: any): void {
    if (this.isLoadingOptions) {
      console.warn('Dropdown options are still loading. Please wait.');
      return;
    }

    let selectedItem = null;
    if (item) {
      selectedItem = { ...item };
      const patchValue = { ...item };
      patchValue.serviceIds = item.serviceIds.map((service: any) => service._id);
      patchValue.isActive = item.isActive; 
      this.editForm.patchValue(patchValue);
    } else {
      selectedItem = null;
      const defaults: { [key: string]: any } = {};
      for (const field in this.formFields) {
        if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
          defaults[field] = this.formFields[field].default !== undefined ? this.formFields[field].default : '';
        }
      }
      this.editForm.reset(defaults);
    }

    const dialogInjector = Injector.create({
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
      ],
      parent: this.injector
    });

    const dialogRef = this.dialog.open(BundleDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem },
      injector: dialogInjector
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveBundle(selectedItem);
      }
    });
  }

  saveBundle(selectedItem: any): void {
    const value = this.editForm.value;
    // Convert isActive to boolean explicitly
    const isActiveValue = value.isActive;
    value.isActive = isActiveValue === true || isActiveValue === 'true';
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, value).subscribe({
        next: () => this.loadBundles(),
        error: (err) => console.error('Error updating bundle:', err)
      });
    } else {
      this.api.post<any>(this.modelName, value).subscribe({
        next: () => this.loadBundles(),
        error: (err) => console.error('Error creating bundle:', err)
      });
    }
  }

  deleteBundle(id: string): void {
    this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
      next: () => this.loadBundles(),
      error: (err) => console.error('Error deleting bundle:', err)
    });
  }

  getServiceNames(serviceIds: any[]): string {
    if (!serviceIds || serviceIds.length === 0) return 'None';
    const names = serviceIds.map(item => {
      if (item && typeof item === 'object' && item.name) {
        return item.name;
      }
      const service = this.services.find(s => s._id === item);
      return service ? service.name : 'Unknown';
    });
    return names.join(', ');
  }

  getTruncatedServiceNames(serviceIds: any[], bundleId: string): string {
    const names = serviceIds.map(item => {
      if (item && typeof item === 'object' && item.name) {
        return item.name;
      }
      const service = this.services.find(s => s._id === item);
      return service ? service.name : 'Unknown';
    });

    if (names.length === 0) return 'None';
    if (this.expandedServices[bundleId] || names.length <= 2) {
      return names.join(', ');
    }
    return `${names.slice(0, 2).join(', ')}...`;
  }

  toggleServices(bundleId: string): void {
    this.expandedServices[bundleId] = !this.expandedServices[bundleId];
  }

  getTruncatedDescription(description: string, bundleId: string): string {
    const maxLength = 100;
    if (!description) return 'None';
    if (this.expandedDescriptions[bundleId] || description.length <= maxLength) {
      return description;
    }
    return `${description.substring(0, maxLength)}...`;
  }

  toggleDescription(bundleId: string): void {
    this.expandedDescriptions[bundleId] = !this.expandedDescriptions[bundleId];
  }

  isDescriptionLong(description: string): boolean {
    const maxLength = 100;
    return description?.length > maxLength;
  }
}