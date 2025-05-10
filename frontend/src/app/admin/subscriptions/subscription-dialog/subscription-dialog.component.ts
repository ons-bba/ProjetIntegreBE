import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-subscription-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatIconModule // Add MatIconModule for the clear button
  ],
  templateUrl: './subscription-dialog.component.html',
  styleUrls: ['./subscription-dialog.component.scss']
})
export class SubscriptionDialogComponent implements OnInit {
  customerOptions: { value: string, label: string }[] = [];
  serviceOptions: { value: string, label: string }[] = [];
  fuelCreditOptions: { value: string, label: string }[] = [];
  minDate: Date = new Date(); // Minimum date for startDate and offerStartDate

  constructor(
    public dialogRef: MatDialogRef<SubscriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any }
  ) {
    this.customerOptions = this.data.fields['customerId'].options || [];
    this.serviceOptions = this.data.fields['serviceIds'].options || [];
    this.fuelCreditOptions = this.data.fields['fuelCreditId'].options || [];
  }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);

    const dateFields = ['startDate', 'endDate', 'offerStartDate', 'offerEndDate'];
    dateFields.forEach(field => {
      const control = this.data.form.get(field);
      if (control && control.value) {
        control.setValue(new Date(control.value));
      }
    });
  }

  // Date filter for startDate and offerStartDate (must be on or after current date)
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

  // Date filter for offerEndDate (must be on or after offerStartDate)
  offerEndDateFilter = (date: Date | null): boolean => {
    if (!date || !this.data.form.get('offerStartDate')?.value) {
      return false;
    }
    const offerStartDate = new Date(this.data.form.get('offerStartDate')?.value);
    offerStartDate.setHours(0, 0, 0, 0);
    return date >= offerStartDate;
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

  // Handle offerStartDate change
  onOfferStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the offer start date. Please select a date on or after today.');
      this.data.form.get('offerStartDate')?.setValue(null);
    }

    // If offerEndDate is before the new offerStartDate, reset it
    if (this.data.form.get('offerStartDate')?.value && this.data.form.get('offerEndDate')?.value) {
      const offerStartDate = new Date(this.data.form.get('offerStartDate')?.value);
      const offerEndDate = new Date(this.data.form.get('offerEndDate')?.value);
      offerStartDate.setHours(0, 0, 0, 0);
      offerEndDate.setHours(0, 0, 0, 0);
      if (offerEndDate < offerStartDate) {
        this.data.form.get('offerEndDate')?.setValue(null);
      }
    }
  }

  // Handle offerEndDate change
  onOfferEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.data.form.get('offerStartDate')?.value) {
      alert('Please select an offer start date first.');
      this.data.form.get('offerEndDate')?.setValue(null);
      return;
    }

    const offerStartDate = new Date(this.data.form.get('offerStartDate')?.value);
    offerStartDate.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < offerStartDate) {
      alert('Offer end date cannot be before the offer start date. Please select a date on or after the offer start date.');
      this.data.form.get('offerEndDate')?.setValue(null);
    }
  }

  // Clear offerStartDate
  clearOfferStartDate(): void {
    this.data.form.get('offerStartDate')?.setValue(null);
    this.data.form.get('offerEndDate')?.setValue(null); // Clear offerEndDate if offerStartDate is cleared
    this.data.form.updateValueAndValidity();
  }

  // Clear offerEndDate
  clearOfferEndDate(): void {
    this.data.form.get('offerEndDate')?.setValue(null);
    this.data.form.updateValueAndValidity();
  }

  // Clear startDate
  clearStartDate(): void {
    this.data.form.get('startDate')?.setValue(null);
    this.data.form.get('endDate')?.setValue(null); // Clear endDate if startDate is cleared
    this.data.form.updateValueAndValidity();
  }

  // Clear endDate
  clearEndDate(): void {
    this.data.form.get('endDate')?.setValue(null);
    this.data.form.updateValueAndValidity();
  }

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      const dateFields = ['startDate', 'endDate', 'offerStartDate', 'offerEndDate'];
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