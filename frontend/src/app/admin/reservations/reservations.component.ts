import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { ReservationDialogComponent } from './reservation-dialog/reservation-dialog.component';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reservation } from '../../shared/models';
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
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  modelName = 'reservations';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  customers: any[] = [];
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
    this.loadReservations();
  }

  loadDropdownOptions(): void {
    console.log('Starting to load dropdown options...');
    forkJoin({
      customers: this.api.get<any[]>('users/customers').pipe(
        catchError(err => {
          console.error('Error fetching customers:', err);
          return of([]);
        })
      ),
      services: this.api.get<any[]>('services').pipe(
        catchError(err => {
          console.error('Error fetching services:', err);
          return of([]);
        })
      ),
      bundles: this.api.get<any[]>('bundles').pipe(
        catchError(err => {
          console.error('Error fetching bundles:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: ({ customers, services, bundles }) => {
        console.log('Customers fetched:', customers);
        console.log('Services fetched:', services);
        console.log('Bundles fetched:', bundles);

        this.customers = customers || [];
        this.formFields['customerId'].options = this.customers.map((customer: any) => ({
          value: customer._id,
          label: customer.name || 'Unknown'
        }));
        console.log('Customer options set:', this.formFields['customerId'].options);

        this.services = services || [];
        this.formFields['serviceId'].options = this.services.map((service: any) => ({
          value: service._id,
          label: service.name || 'Unknown'
        }));
        console.log('Service options set:', this.formFields['serviceId'].options);

        this.bundles = bundles || [];
        this.formFields['bundleId'].options = this.bundles.map((bundle: any) => ({
          value: bundle._id,
          label: bundle.name || 'Unknown'
        }));
        console.log('Bundle options set:', this.formFields['bundleId'].options);

        this.isLoadingOptions = false;
        console.log('Dropdown options loading complete, isLoadingOptions:', this.isLoadingOptions);
      },
      error: (err) => {
        console.error('Unexpected error in forkJoin:', err);
        this.isLoadingOptions = false;
      }
    });
  }

  initializeForm(): void {
    this.formFields = {
      customerId: { default: undefined, validators: [Validators.required], type: 'select', options: [] },
      serviceId: { default: undefined, validators: [], type: 'select', options: [] },
      bundleId: { default: undefined, validators: [], type: 'select', options: [] },
      status: {
        default: 'Pending',
        validators: [Validators.required],
        type: 'select',
        options: [
          { value: 'Pending', label: 'Pending' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Cancelled', label: 'Cancelled' }
        ]
      },
      bookingDate: { default: new Date(), validators: [Validators.required] },
      completionDate: { default: undefined, validators: [] },
      totalCost: { default: 0, validators: [Validators.required, Validators.min(0)] },
      notes: { default: '', validators: [] }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls, {
      validators: this.serviceOrBundleValidator
    });
  }

  serviceOrBundleValidator(form: FormGroup) {
    const serviceId = form.get('serviceId')?.value;
    const bundleId = form.get('bundleId')?.value;

    const isValid = (serviceId && !bundleId) || (!serviceId && bundleId);
    if (!isValid) {
      return { serviceOrBundleRequired: true };
    }
    return null;
  }

  loadReservations(): void {
    this.api.get<Reservation[]>(this.modelName).subscribe({
      next: (reservations) => {
        this.reservations = reservations;
        console.log('Reservations loaded:', this.reservations);
      },
      error: (err) => console.error('Error loading reservations:', err)
    });
  }

  openEditDialog(item?: Reservation): void {
    if (this.isLoadingOptions) {
      console.warn('Dropdown options are still loading. Please wait.');
      return;
    }

    console.log('Opening dialog with formFields:', this.formFields);

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
          defaults[field] = this.formFields[field].default;
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

    const dialogRef = this.dialog.open(ReservationDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem },
      injector: dialogInjector // Pass the custom injector
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveReservation(selectedItem);
      }
    });
  }

  saveReservation(selectedItem: Reservation | null): void {
    const value = { ...this.editForm.value };
    // Remove null and undefined fields from the payload
    const cleanedValue = Object.fromEntries(
      Object.entries(value).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    console.log('Form data being sent:', cleanedValue);
    if (selectedItem) {
      this.api.put<Reservation>(`${this.modelName}/${selectedItem._id}`, cleanedValue).subscribe({
        next: () => this.loadReservations(),
        error: (err) => console.error('Error updating reservation:', err)
      });
    } else {
      this.api.post<Reservation>(`${this.modelName}/admin`, cleanedValue).subscribe({
        next: () => this.loadReservations(),
        error: (err) => {
          console.error('Error creating reservation:', err);
          console.error('Server error details:', err.error);
        }
      });
    }
  }

  deleteReservation(id: string): void {
    if (confirm('Are you sure you want to delete this reservation?')) {
      this.api.delete<Reservation>(`${this.modelName}/${id}`).subscribe({
        next: () => this.loadReservations(),
        error: (err) => console.error('Error deleting reservation:', err)
      });
    }
  }

  getCustomerName(customerId: string): string {
    const customer = this.customers.find(c => c._id === customerId);
    return customer ? customer.name : 'Unknown';
  }

  getServiceName(serviceId?: string): string {
    if (!serviceId) return 'None';
    const service = this.services.find(s => s._id === serviceId);
    return service ? service.name : 'None';
  }

  getBundleName(bundleId?: string): string {
    if (!bundleId) return 'None';
    const bundle = this.bundles.find(b => b._id === bundleId);
    return bundle ? bundle.name : 'None';
  }

  downloadQRCode(qrCode: string | undefined, reservationId: string): void {
    if (!qrCode) {
      alert('No QR code available to download.');
      return;
    }
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `reservation-${reservationId}-qrcode.png`;
    link.click();
  }

  onQRCodeError(reservation: Reservation): void {
    console.error(`Failed to load QR code for reservation ${reservation._id}`);
    reservation.qrCode = undefined;
  }
}