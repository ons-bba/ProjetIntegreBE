import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

// Custom date format for DD/MM/YYYY
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
  selector: 'app-coupon-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatIconModule
  ],
  templateUrl: './coupon-dialog.component.html',
  styleUrls: ['./coupon-dialog.component.scss'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ]
})
export class CouponDialogComponent implements OnInit {
  serviceOptions: any[] = [];
  bundleOptions: any[] = [];
  minDate: Date = new Date(); // Minimum date for startDate

  constructor(
    public dialogRef: MatDialogRef<CouponDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any },
    private dateAdapter: DateAdapter<Date>
  ) {
    this.dateAdapter.setLocale('en-GB');
    this.serviceOptions = this.data.fields['serviceId'].options || [];
    this.bundleOptions = this.data.fields['bundleId'].options || [];
  }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);

    const dateFields = ['startDate', 'endDate'];
    dateFields.forEach(field => {
      const control = this.data.form.get(field);
      if (control && control.value) {
        control.setValue(new Date(control.value));
      }
    });

    // Dynamically enable/disable serviceId and bundleId based on type
    this.data.form.get('type')?.valueChanges.subscribe(type => {
      const serviceIdControl = this.data.form.get('serviceId');
      const bundleIdControl = this.data.form.get('bundleId');
      const discountControl = this.data.form.get('discount');

      if (type === 'freeService') {
        serviceIdControl?.enable();
        bundleIdControl?.disable();
        bundleIdControl?.setValue(null);
        discountControl?.setValue(0);
      } else if (type === 'freeBundle') {
        bundleIdControl?.enable();
        serviceIdControl?.disable();
        serviceIdControl?.setValue(null);
        discountControl?.setValue(0);
      } else if (type === 'reduction') {
        serviceIdControl?.enable();
        bundleIdControl?.enable();
        // Default to serviceId if available, unless bundleId is already selected
        if (!serviceIdControl?.value && !bundleIdControl?.value && this.serviceOptions.length > 0) {
          serviceIdControl?.setValue(this.serviceOptions[0]?.value || null);
        }
      } else {
        serviceIdControl?.disable();
        bundleIdControl?.disable();
        serviceIdControl?.setValue(null);
        bundleIdControl?.setValue(null);
        discountControl?.setValue(0);
      }

      this.data.form.updateValueAndValidity();
    });

    // Clear bundleId if serviceId is selected
    this.data.form.get('serviceId')?.valueChanges.subscribe(serviceId => {
      const type = this.data.form.get('type')?.value;
      const bundleIdControl = this.data.form.get('bundleId');
      if (type === 'reduction' && serviceId) {
        bundleIdControl?.setValue(null);
      }
    });

    // Clear serviceId if bundleId is selected
    this.data.form.get('bundleId')?.valueChanges.subscribe(bundleId => {
      const type = this.data.form.get('type')?.value;
      const serviceIdControl = this.data.form.get('serviceId');
      if (type === 'reduction' && bundleId) {
        serviceIdControl?.setValue(null);
      }
    });

    // Handle Edit mode
    if (this.data.selectedItem) {
      const patchValue = { ...this.data.selectedItem };
      this.data.form.patchValue(patchValue);
      const type = this.data.form.get('type')?.value;
      const serviceIdControl = this.data.form.get('serviceId');
      const bundleIdControl = this.data.form.get('bundleId');
      if (type === 'reduction') {
        // In Edit mode, ensure mutual exclusivity but don't enforce selection
        if (serviceIdControl?.value && bundleIdControl?.value) {
          bundleIdControl?.setValue(null); // Prioritize serviceId
        } else if (!serviceIdControl?.value && !bundleIdControl?.value && this.serviceOptions.length > 0) {
          serviceIdControl?.setValue(this.serviceOptions[0]?.value || null);
        }
      }
    }

    const initialType = this.data.form.get('type')?.value;
    this.data.form.get('type')?.setValue(initialType);
    this.data.form.updateValueAndValidity();
  }

  // Date filter for startDate (must be on or after current date)
  startDateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Date filter for endDate (must be on or after startDate)
  endDateFilter = (date: Date | null): boolean => {
    if (!date || !this.data.form.get('startDate')?.value) {
      return false;
    }
    const startDate = new Date(this.data.form.get('startDate')?.value);
    startDate.setHours(0, 0, 0, 0);
    return date >= startDate;
  };

  // Handle startDate change
  onStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the start date. Please select a date on or after today.');
      this.data.form.get('startDate')?.setValue(null);
    }

    // If endDate is before the new startDate, reset it
    if (this.data.form.get('startDate')?.value && this.data.form.get('endDate')?.value) {
      const startDate = new Date(this.data.form.get('startDate')?.value);
      const endDate = new Date(this.data.form.get('endDate')?.value);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < startDate) {
        this.data.form.get('endDate')?.setValue(null);
      }
    }
  }

  // Handle endDate change
  onEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.data.form.get('startDate')?.value) {
      alert('Please select a start date first.');
      this.data.form.get('endDate')?.setValue(null);
      return;
    }

    const startDate = new Date(this.data.form.get('startDate')?.value);
    startDate.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < startDate) {
      alert('End date cannot be before the start date. Please select a date on or after the start date.');
      this.data.form.get('endDate')?.setValue(null);
    }
  }

  // Clear startDate
  clearStartDate(): void {
    this.data.form.get('startDate')?.setValue(null);
    this.data.form.get('endDate')?.setValue(null); // Reset endDate if startDate is cleared
  }

  // Clear endDate
  clearEndDate(): void {
    this.data.form.get('endDate')?.setValue(null);
  }

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      const dateFields = ['startDate', 'endDate'];
      dateFields.forEach(field => {
        if (formValue[field]) {
          const date = new Date(formValue[field]);
          formValue[field] = date.toISOString(); // Format to ISO 8601
        }
      });

      this.data.form.patchValue(formValue);
      this.data.form.markAsPristine();
      this.dialogRef.close(true);
    }
  }
}