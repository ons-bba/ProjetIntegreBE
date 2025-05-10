import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { CouponDialogComponent } from './coupon-dialog/coupon-dialog.component';
import { Validators, FormBuilder, FormGroup, AbstractControl } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
  selector: 'app-coupons',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './coupons.component.html',
  styleUrls: ['./coupons.component.scss']
})
export class CouponsComponent implements OnInit {
  coupons: any[] = [];
  modelName = 'coupons';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  services: any[] = [];
  bundles: any[] = [];
  isLoadingOptions = true;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownOptions();
    this.loadCoupons();
  }

  loadDropdownOptions(): void {
    forkJoin({
      services: this.api.get<any[]>('services'),
      bundles: this.api.get<any[]>('bundles')
    }).subscribe({
      next: ({ services, bundles }) => {
        this.services = services;
        this.formFields['serviceId'].options = services.map((service: any) => ({
          value: service._id,
          label: service.name
        }));

        this.bundles = bundles;
        this.formFields['bundleId'].options = bundles.map((bundle: any) => ({
          value: bundle._id,
          label: bundle.name
        }));

        this.isLoadingOptions = false;
      },
      error: (err) => {
        console.error('Error loading dropdown options:', err);
        this.isLoadingOptions = false;
      }
    });
  }

  initializeForm(): void {
    this.formFields = {
      code: { default: '', validators: [Validators.required, Validators.minLength(12)] },
      type: {
        default: 'reduction',
        validators: [Validators.required],
        type: 'select',
        options: ['reduction', 'freeService', 'freeBundle', 'fuelCredit']
      },
      discount: {
        default: 0,
        validators: [
          Validators.min(0),
          this.conditionalRequired('type', 'reduction'),
          this.conditionalMin('type', 'reduction', 1)
        ]
      },
      serviceId: {
        default: null,
        validators: [
          this.conditionalRequired('type', 'freeService')
        ]
      },
      bundleId: {
        default: null,
        validators: [
          this.conditionalRequired('type', 'freeBundle')
        ]
      },
      startDate: { default: new Date(), validators: [Validators.required] },
      endDate: {
        default: new Date(Date.now() + 86400000),
        validators: [Validators.required, this.endDateValidator()]
      },
      maxUses: { default: 1, validators: [Validators.required, Validators.min(1)] },
      uses: { default: 0, validators: [Validators.min(0)] }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls);
  }

  loadCoupons(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        console.log('Coupons loaded:', this.coupons);
      },
      error: (err) => console.error('Error loading coupons:', err)
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

    const dialogRef = this.dialog.open(CouponDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem },
      injector: dialogInjector
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveCoupon(selectedItem);
      }
    });
  }

  saveCoupon(selectedItem: any): void {
    const formValue = this.editForm.value;
    const payload: { [key: string]: any } = {};
    for (const key in formValue) {
      if (Object.prototype.hasOwnProperty.call(formValue, key) && formValue[key] !== null) {
        payload[key] = formValue[key];
      }
    }
    console.log('Form value before sending:', payload);
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, payload).subscribe({
        next: () => this.loadCoupons(),
        error: (err) => {
          console.error('Error updating coupon:', err);
          console.error('Error details:', JSON.stringify(err.error, null, 2));
        }
      });
    } else {
      this.api.post<any>(this.modelName, payload).subscribe({
        next: () => this.loadCoupons(),
        error: (err) => {
          console.error('Error creating coupon:', err);
          console.error('Error details:', JSON.stringify(err.error, null, 2));
        }
      });
    }
  }

  deleteCoupon(id: string): void {
    this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
      next: () => this.loadCoupons(),
      error: (err) => console.error('Error deleting coupon:', err)
    });
  }

  getServiceName(serviceId: string): string {
    const service = this.services.find(s => s._id === serviceId);
    return service ? service.name : 'None';
  }

  getBundleName(bundleId: string): string {
    const bundle = this.bundles.find(b => b._id === bundleId);
    return bundle ? bundle.name : 'None';
  }

  conditionalRequired(controlName: string, requiredValue: string): any {
    return (control: AbstractControl) => {
      const form = control.parent;
      if (!form) return null;
      const typeControl = form.get(controlName);
      return typeControl && typeControl.value === requiredValue ? Validators.required(control) : null;
    };
  }

  conditionalMin(controlName: string, requiredValue: string, min: number): any {
    return (control: AbstractControl) => {
      const form = control.parent;
      if (!form) return null;
      const typeControl = form.get(controlName);
      return typeControl && typeControl.value === requiredValue && control.value <= min
        ? { minDiscount: { requiredMin: min, actual: control.value } }
        : null;
    };
  }

  endDateValidator(): any {
    return (control: AbstractControl) => {
      const form = control.parent;
      if (!form) return null;
      const startDate = form.get('startDate')?.value;
      const endDate = control.value;
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        return { invalidEndDate: true };
      }
      return null;
    };
  }
}