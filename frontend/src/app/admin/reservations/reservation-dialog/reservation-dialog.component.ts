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
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reservation-dialog',
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
  templateUrl: './reservation-dialog.component.html',
  styleUrls: ['./reservation-dialog.component.scss']
})
export class ReservationDialogComponent implements OnInit {
  customerOptions: any[] = [];
  serviceOptions: any[] = [];
  bundleOptions: any[] = [];
  minDate: Date = new Date(); // Minimum date for bookingDate

  constructor(
    public dialogRef: MatDialogRef<ReservationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any }
  ) {
    this.customerOptions = this.data.fields['customerId'].options || [];
    this.serviceOptions = this.data.fields['serviceId'].options || [];
    this.bundleOptions = this.data.fields['bundleId'].options || [];
    console.log('Customer options in dialog:', this.customerOptions);
    console.log('Service options in dialog:', this.serviceOptions);
    console.log('Bundle options in dialog:', this.bundleOptions);
  }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);

    const dateFields = ['bookingDate', 'completionDate'];
    dateFields.forEach(field => {
      const control = this.data.form.get(field);
      if (control && control.value) {
        control.setValue(new Date(control.value));
      }
    });

    // Ensure dropdown values are set correctly
    if (this.data.selectedItem) {
      const patchValue = { ...this.data.selectedItem };
      this.data.form.patchValue(patchValue);
    }

    // Add value change listeners to clear the other field
    this.data.form.get('serviceId')?.valueChanges.subscribe(value => {
      if (value) {
        this.data.form.get('bundleId')?.setValue(null);
      }
    });

    this.data.form.get('bundleId')?.valueChanges.subscribe(value => {
      if (value) {
        this.data.form.get('serviceId')?.setValue(null);
      }
    });
  }

  // Date filter for bookingDate (must be on or after current date)
  bookingDateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Date filter for completionDate (must be on or after bookingDate)
  completionDateFilter = (date: Date | null): boolean => {
    if (!date || !this.data.form.get('bookingDate')?.value) {
      return false;
    }
    const bookingDate = new Date(this.data.form.get('bookingDate')?.value);
    bookingDate.setHours(0, 0, 0, 0);
    return date >= bookingDate;
  };

  // Handle bookingDate change
  onBookingDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the booking date. Please select a date on or after today.');
      this.data.form.get('bookingDate')?.setValue(null);
    }

    // If completionDate is before the new bookingDate, reset it
    if (this.data.form.get('bookingDate')?.value && this.data.form.get('completionDate')?.value) {
      const bookingDate = new Date(this.data.form.get('bookingDate')?.value);
      const completionDate = new Date(this.data.form.get('completionDate')?.value);
      bookingDate.setHours(0, 0, 0, 0);
      completionDate.setHours(0, 0, 0, 0);
      if (completionDate < bookingDate) {
        this.data.form.get('completionDate')?.setValue(null);
      }
    }
  }

  // Handle completionDate change
  onCompletionDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.data.form.get('bookingDate')?.value) {
      alert('Please select a booking date first.');
      this.data.form.get('completionDate')?.setValue(null);
      return;
    }

    const bookingDate = new Date(this.data.form.get('bookingDate')?.value);
    bookingDate.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < bookingDate) {
      alert('Completion date cannot be before the booking date. Please select a date on or after the booking date.');
      this.data.form.get('completionDate')?.setValue(null);
    }
  }

  // Clear bookingDate
  clearBookingDate(): void {
    this.data.form.get('bookingDate')?.setValue(null);
    this.data.form.get('completionDate')?.setValue(null); // Clear completion date if booking date is cleared
    this.data.form.updateValueAndValidity();
  }

  // Clear completionDate
  clearCompletionDate(): void {
    this.data.form.get('completionDate')?.setValue(null);
    this.data.form.updateValueAndValidity();
  }

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      const dateFields = ['bookingDate', 'completionDate'];
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