import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { SubscriptionDialogComponent } from './subscription-dialog/subscription-dialog.component';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
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
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.scss']
})
export class SubscriptionsComponent implements OnInit {
  subscriptions: any[] = [];
  modelName = 'subscriptions';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  customers: any[] = [];
  services: any[] = [];
  fuelCredits: any[] = [];
  isLoadingOptions = true;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private injector: Injector // Add Injector
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownOptions();
    this.loadSubscriptions();
  }

  loadDropdownOptions(): void {
    forkJoin({
      customers: this.api.get<any[]>('users/customers'),
      services: this.api.get<any[]>('services'),
      fuelCredits: this.api.get<any[]>('fuelCredits')
    }).subscribe({
      next: ({ customers, services, fuelCredits }) => {
        this.customers = customers;
        this.formFields['customerId'].options = customers.map((customer: any) => ({
          value: customer._id,
          label: customer.name
        }));

        this.services = services;
        this.formFields['serviceIds'].options = services.map((service: any) => ({
          value: service._id,
          label: service.name
        }));

        this.fuelCredits = fuelCredits;
        this.formFields['fuelCreditId'].options = fuelCredits.map((fuelCredit: any) => ({
          value: fuelCredit._id,
          label: `Credits: ${fuelCredit.credits}, Amount: ${fuelCredit.amount}`
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
      customerId: { default: null, validators: [Validators.required], type: 'select', options: [] },
      planName: { default: '', validators: [Validators.required] },
      serviceIds: {
        default: [],
        validators: [Validators.required, Validators.minLength(1)],
        type: 'select',
        multiple: true,
        options: []
      },
      price: { default: 0, validators: [Validators.required, Validators.min(0)] },
      offerDiscount: { default: 0, validators: [Validators.min(0)] },
      offerStartDate: { default: null, validators: [] },
      offerEndDate: { default: null, validators: [] },
      startDate: { default: new Date(), validators: [Validators.required] },
      endDate: { default: null, validators: [] },
      status: { default: 'active', validators: [Validators.required], type: 'select', options: ['active', 'inactive', 'expired'] },
      fuelCreditId: { default: null, validators: [], type: 'select', options: [] }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls);
  }

  loadSubscriptions(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions;
        console.log('Subscriptions loaded:', this.subscriptions);
      },
      error: (err) => console.error('Error loading subscriptions:', err)
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

    // Create a new injector that includes the DateAdapter, MAT_DATE_FORMATS, and MAT_DATE_LOCALE
    const dialogInjector = Injector.create({
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
      ],
      parent: this.injector
    });

    const dialogRef = this.dialog.open(SubscriptionDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem },
      injector: dialogInjector // Pass the custom injector
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveSubscription(selectedItem);
      }
    });
  }

  saveSubscription(selectedItem: any): void {
    const value = this.editForm.value;
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, value).subscribe({
        next: () => this.loadSubscriptions(),
        error: (err) => console.error('Error updating subscription:', err)
      });
    } else {
      this.api.post<any>(this.modelName, value).subscribe({
        next: () => this.loadSubscriptions(),
        error: (err) => console.error('Error creating subscription:', err)
      });
    }
  }

  deleteSubscription(id: string): void {
    this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
      next: () => this.loadSubscriptions(),
      error: (err) => console.error('Error deleting subscription:', err)
    });
  }

  getCustomerName(customerId: string): string {
    const customer = this.customers.find(c => c._id === customerId);
    return customer ? customer.name : 'Unknown';
  }

  getServiceNames(serviceIds: string[]): string {
    if (!serviceIds || !Array.isArray(serviceIds)) return 'None';
    const names = serviceIds.map(id => {
      const service = this.services.find(s => s._id === id);
      return service ? service.name : 'Unknown';
    });
    return names.join(', ') || 'None';
  }

  getFuelCreditDetails(fuelCreditId: string): string {
    const fuelCredit = this.fuelCredits.find(fc => fc._id === fuelCreditId);
    if (!fuelCredit) return 'None';
    return `Credits: ${fuelCredit.credits}, Amount: ${fuelCredit.amount}`;
  }

  downloadQRCode(qrCode: string, subscriptionId: string): void {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `subscription-${subscriptionId}-qrcode.png`;
    link.click();
  }

  onQRCodeError(subscription: any): void {
    console.error(`Failed to load QR code for subscription ${subscription._id}`);
    subscription.qrCode = null;
  }
}