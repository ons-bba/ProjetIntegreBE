import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-fuel-credit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelectModule
  ],
  templateUrl: './fuel-credits-dialog.component.html',
  styleUrls: ['./fuel-credits-dialog.component.scss']
})
export class FuelCreditDialogComponent implements OnInit {
  users: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<FuelCreditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { form: FormGroup; fields: { [key: string]: any }; modelName: string; selectedItem: any }
  ) {
    this.users = this.data.fields['customerId'].options || [];
    console.log('FuelCreditDialogComponent initialized with data:', this.data);
  }

  ngOnInit(): void {
    const dateControl = this.data.form.get('date');
    if (dateControl) {
      if (!dateControl.value) {
        // Set default value to today's date in "yyyy-MM-dd" format
        const today = new Date();
        dateControl.setValue(this.formatDateToYMD(today));
      } else {
        // Convert the existing value to "yyyy-MM-dd" format
        const dateValue = new Date(dateControl.value);
        if (!isNaN(dateValue.getTime())) {
          dateControl.setValue(this.formatDateToYMD(dateValue));
        } else {
          console.error('Invalid date value for date:', dateControl.value);
          dateControl.setValue(this.formatDateToYMD(new Date()));
        }
      }
      console.log('Date form control initial value:', dateControl.value);
    } else {
      console.error('Date form control is not found in the form group');
    }

    if (this.data.selectedItem && this.data.selectedItem.customerId) {
      const customerId = typeof this.data.selectedItem.customerId === 'object'
        ? this.data.selectedItem.customerId._id
        : this.data.selectedItem.customerId;
      this.data.form.patchValue({ customerId });
    }
  }

  // Helper function to format a Date object to "yyyy-MM-dd"
  private formatDateToYMD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.data.form.markAsPristine();
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (this.data.form.valid) {
      const formValue = this.data.form.value;
      if (formValue.date) {
        // Convert "yyyy-MM-dd" back to ISO 8601 format for the server
        formValue.date = new Date(formValue.date).toISOString();
      }
      this.data.form.patchValue(formValue);
      this.dialogRef.close(true);
    } else {
      console.error('Form is invalid:', this.data.form.errors);
    }
  }
}