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
  selector: 'app-service-dialog',
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
  templateUrl: './services-dialog.component.html',
  styleUrls: ['./services-dialog.component.scss']
})
export class ServiceDialogComponent implements OnInit {
  categoryOptions: string[] = [
    'Nettoyage et Détail',
    'Entretien et Réparations',
    'Carburant et Commodité',
    'Sécurité et Suivi',
    'Confort et Personnalisation',
    'Sécurité et Soutien',
    'Assurance et Rapports',
    'Pièces et Accessoires'
  ];

  minDate: Date = new Date(); // Minimum date for offer start date (today)

  constructor(
    public dialogRef: MatDialogRef<ServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any }
  ) { }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);

    // Ensure category field is set up as a select
    if (!this.data.fields['category']) {
      this.data.fields['category'] = {
        default: '',
        validators: [],
        type: 'select',
        options: this.categoryOptions
      };
    }
    this.data.fields['category'].options = this.categoryOptions;

    // Format date fields for the date picker (excluding createdAt)
    const dateFields = ['offerStartDate', 'offerEndDate'];
    dateFields.forEach(field => {
      const control = this.data.form.get(field);
      if (control && control.value) {
        control.setValue(new Date(control.value));
      }
    });
  }

  // Date filter for offer start date (must be on or after current date)
  offerStartDateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Date filter for offer end date (must be on or after offer start date)
  offerEndDateFilter = (date: Date | null): boolean => {
    if (!date || !this.data.form.get('offerStartDate')?.value) {
      return false;
    }
    const startDate = new Date(this.data.form.get('offerStartDate')?.value);
    startDate.setHours(0, 0, 0, 0);
    return date >= startDate;
  };

  // Handle offer start date change
  onOfferStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the offer start date. Please select a date on or after today.');
      this.data.form.get('offerStartDate')?.setValue(null);
    }

    // If end date is before the new start date, reset it
    if (this.data.form.get('offerStartDate')?.value && this.data.form.get('offerEndDate')?.value) {
      const startDate = new Date(this.data.form.get('offerStartDate')?.value);
      const endDate = new Date(this.data.form.get('offerEndDate')?.value);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < startDate) {
        this.data.form.get('offerEndDate')?.setValue(null);
      }
    }
  }

  // Handle offer end date change
  onOfferEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.data.form.get('offerStartDate')?.value) {
      alert('Please select an offer start date first.');
      this.data.form.get('offerEndDate')?.setValue(null);
      return;
    }

    const startDate = new Date(this.data.form.get('offerStartDate')?.value);
    startDate.setHours(0, 0, 0, 0);

    if (selectedDate && selectedDate < startDate) {
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

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      const dateFields = ['offerStartDate', 'offerEndDate'];
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

  onDelete(): void {
    if (confirm('Are you sure you want to delete this service?')) {
      this.dialogRef.close('delete');
    }
  }
}