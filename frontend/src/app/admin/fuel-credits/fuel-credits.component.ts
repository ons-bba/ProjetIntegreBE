import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { FuelCreditDialogComponent } from './fuel-credits-dialog/fuel-credits-dialog.component';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-fuel-credits',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './fuel-credits.component.html',
  styleUrls: ['./fuel-credits.component.scss']
})
export class FuelCreditsComponent implements OnInit {
  fuelCredits: any[] = [];
  modelName = 'fuelCredits';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  customers: any[] = [];
  isLoadingOptions = true;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownOptions();
    this.loadFuelCredits();
  }

  loadDropdownOptions(): void {
    this.api.get<any[]>('users/customers').subscribe({
      next: (customers) => {
        this.customers = customers;
        this.formFields['customerId'].options = customers.map((customer: any) => ({
          value: customer._id,
          label: customer.name
        }));
        this.isLoadingOptions = false;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.isLoadingOptions = false;
      }
    });
  }

  initializeForm(): void {
    this.formFields = {
      customerId: {
        default: undefined,
        validators: [Validators.required],
        type: 'select',
        options: []
      },
      credits: {
        default: 0,
        validators: [Validators.required, Validators.min(1)],
        type: 'number'
      },
      restCredits: {
        default: 0,
        validators: [Validators.min(0)],
        type: 'number'
      },
      date: { // Renamed from createdAt to date to match the backend schema
        default: new Date(),
        validators: [Validators.required],
        type: 'date'
      }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls, {
      validators: this.creditAmountValidator
    });
  }

  creditAmountValidator(form: FormGroup) {
    const credits = form.get('credits')?.value;
    const restCredits = form.get('restCredits')?.value;

    if (restCredits > credits) {
      return { restCreditsExceeds: true };
    }
    return null;
  }

  loadFuelCredits(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (fuelCredits) => {
        this.fuelCredits = fuelCredits;
        console.log('Fuel Credits loaded:', this.fuelCredits);
      },
      error: (err) => console.error('Error loading fuel credits:', err)
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
      // Map amount to restCredits
      if (item.amount !== undefined) {
        patchValue.restCredits = item.amount;
        delete patchValue.amount;
      }
      if (item.customerId && typeof item.customerId === 'object') {
        patchValue.customerId = item.customerId._id;
      }
      this.editForm.patchValue(patchValue);
    } else {
      selectedItem = null;
      const defaults: { [key: string]: any } = {};
      for (const field in this.formFields) {
        if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
          defaults[field] = this.formFields[field].default;
        }
      }
      this.editForm.reset(defaults);
    }

    const dialogRef = this.dialog.open(FuelCreditDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveFuelCredit(selectedItem);
      }
    });
  }

  saveFuelCredit(selectedItem: any): void {
    const value = { ...this.editForm.value };
    // Map restCredits back to amount for the API
    if (value.restCredits !== undefined) {
      value.amount = value.restCredits;
      delete value.restCredits;
    }
    // Ensure date is in ISO 8601 format
    if (value.date) {
      value.date = new Date(value.date).toISOString();
    }
    // Remove null and undefined fields from the payload
    const cleanedValue = Object.fromEntries(
      Object.entries(value).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    console.log('Form data being sent:', cleanedValue);
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, cleanedValue).subscribe({
        next: () => this.loadFuelCredits(),
        error: (err) => console.error('Error updating fuel credit:', err)
      });
    } else {
      this.api.post<any>(this.modelName, cleanedValue).subscribe({
        next: () => this.loadFuelCredits(),
        error: (err) => {
          console.error('Error creating fuel credit:', err);
          console.error('Server error details:', err.error);
        }
      });
    }
  }

  deleteFuelCredit(id: string): void {
    this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
      next: () => this.loadFuelCredits(),
      error: (err) => console.error('Error deleting fuel credit:', err)
    });
  }

  getCustomerName(customerId: string | { _id: string; name: string }): string {
    const id = typeof customerId === 'object' ? customerId._id : customerId;
    const customer = this.customers.find(c => c._id === id);
    return customer ? customer.name : 'Unknown';
  }
}