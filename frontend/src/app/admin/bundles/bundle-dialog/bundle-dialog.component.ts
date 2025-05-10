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
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
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
  selector: 'app-bundle-dialog',
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
    MatIconModule // Add MatIconModule for the clear button
  ],
  templateUrl: './bundle-dialog.component.html',
  styleUrls: ['./bundle-dialog.component.scss'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ]
})
export class BundleDialogComponent implements OnInit {
  serviceOptions: any[] = [];
  minDate: Date = new Date(); // Minimum date for discountStartDate

  constructor(
    public dialogRef: MatDialogRef<BundleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any }
  ) {
    this.serviceOptions = this.data.fields['serviceIds'].options || [];
  }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);

    const dateFields = ['discountStartDate', 'discountEndDate'];
    dateFields.forEach(field => {
      const control = this.data.form.get(field);
      if (control && control.value) {
        control.setValue(new Date(control.value));
      }
    });
  }

  // Date filter for discountStartDate (must be on or after current date)
  discountStartDateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Date filter for discountEndDate (must be on or after discountStartDate)
  discountEndDateFilter = (date: Date | null): boolean => {
    if (!date || !this.data.form.get('discountStartDate')?.value) {
      return false;
    }
    const discountStartDate = new Date(this.data.form.get('discountStartDate')?.value);
    discountStartDate.setHours(0, 0, 0, 0);
    return date >= discountStartDate;
  };

  // Handle discountStartDate change
  onDiscountStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the discount start date. Please select a date on or after today.');
      this.data.form.get('discountStartDate')?.setValue(null);
    }

    // If discountEndDate is before the new discountStartDate, reset it
    if (this.data.form.get('discountStartDate')?.value && this.data.form.get('discountEndDate')?.value) {
      const discountStartDate = new Date(this.data.form.get('discountStartDate')?.value);
      const discountEndDate = new Date(this.data.form.get('discountEndDate')?.value);
      discountStartDate.setHours(0, 0, 0, 0);
      discountEndDate.setHours(0, 0, 0, 0);
      if (discountEndDate < discountStartDate) {
        this.data.form.get('discountEndDate')?.setValue(null);
      }
    }
  }

  // Handle discountEndDate change
  onDiscountEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.data.form.get('discountStartDate')?.value) {
      alert('Please select a discount start date first.');
      this.data.form.get('discountEndDate')?.setValue(null);
      return;
    }

    const discountStartDate = new Date(this.data.form.get('discountStartDate')?.value);
    discountStartDate.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < discountStartDate) {
      alert('Discount end date cannot be before the discount start date. Please select a date on or after the discount start date.');
      this.data.form.get('discountEndDate')?.setValue(null);
    }
  }

  // Clear discountStartDate
  clearDiscountStartDate(): void {
    this.data.form.get('discountStartDate')?.setValue(null);
    this.data.form.get('discountEndDate')?.setValue(null); // Clear end date if start date is cleared
    this.data.form.updateValueAndValidity();
  }

  // Clear discountEndDate
  clearDiscountEndDate(): void {
    this.data.form.get('discountEndDate')?.setValue(null);
    this.data.form.updateValueAndValidity();
  }

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      const dateFields = ['discountStartDate', 'discountEndDate'];
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