import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/api.service';
import { Reservation, Service, Bundle } from '../../shared/models';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatDatepickerModule
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  services: { [key: string]: Service } = {};
  bundles: { [key: string]: Bundle } = {};
  customers: { [key: string]: string } = {};

  // Search and filter properties
  searchQuery: string = '';
  filters = {
    status: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  };

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.apiService.get<Reservation[]>('reservations/customer').subscribe({
      next: (reservations) => {
        this.reservations = reservations;
        this.filteredReservations = reservations;
        this.loadRelatedData();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching reservations:', error);
        alert('Failed to load reservations: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }

  loadRelatedData(): void {
    // Fetch services
    const serviceIds = [...new Set(this.reservations.map(r => r.serviceId).filter(id => id))] as string[];
    if (serviceIds.length > 0) {
      serviceIds.forEach(id => {
        this.apiService.get<Service>(`services/${id}`).subscribe({
          next: (service) => {
            this.services[id] = service;
          },
          error: (error) => {
            console.error(`Error fetching service ${id}:`, error);
          }
        });
      });
    }

    // Fetch bundles
    const bundleIds = [...new Set(this.reservations.map(r => r.bundleId).filter(id => id))] as string[];
    if (bundleIds.length > 0) {
      bundleIds.forEach(id => {
        this.apiService.get<Bundle>(`bundles/${id}`).subscribe({
          next: (bundle) => {
            this.bundles[id] = bundle;
          },
          error: (error) => {
            console.error(`Error fetching bundle ${id}:`, error);
          }
        });
      });
    }

    // Fetch customers
    const customerIds = [...new Set(this.reservations.map(r => r.customerId))] as string[];
    if (customerIds.length > 0) {
      customerIds.forEach(id => {
        this.apiService.get<{ name: string }>(`users/${id}`).subscribe({
          next: (user) => {
            this.customers[id] = user.name;
          },
          error: (error) => {
            console.error(`Error fetching customer ${id}:`, error);
            this.customers[id] = 'Unknown Customer';
          }
        });
      });
    }
  }

  applyFilters(): void {
    let filtered = [...this.reservations];

    // Apply search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(reservation =>
        this.getCustomerName(reservation.customerId).toLowerCase().includes(query) ||
        this.getServiceName(reservation.serviceId).toLowerCase().includes(query) ||
        this.getBundleName(reservation.bundleId).toLowerCase().includes(query) ||
        reservation.status.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.filters.status) {
      filtered = filtered.filter(reservation => reservation.status === this.filters.status);
    }

    // Apply date range filter
    if (this.filters.startDate) {
      const startDate = new Date(this.filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(reservation => {
        const bookingDate = new Date(reservation.bookingDate);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= startDate;
      });
    }
    if (this.filters.endDate) {
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(reservation => {
        const bookingDate = new Date(reservation.bookingDate);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate <= endDate;
      });
    }

    this.filteredReservations = filtered;
  }

  // Date filter for endDate (must be on or after startDate)
  endDateFilter = (date: Date | null): boolean => {
    if (!date || !this.filters.startDate) {
      return true; // Allow all dates if startDate is not set
    }
    const startDate = new Date(this.filters.startDate);
    startDate.setHours(0, 0, 0, 0);
    return date >= startDate;
  };

  // Handle startDate change
  onStartDateChange(): void {
    // If endDate is before the new startDate, reset it
    if (this.filters.startDate && this.filters.endDate) {
      const start = new Date(this.filters.startDate);
      const end = new Date(this.filters.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (end < start) {
        this.filters.endDate = null;
      }
    }
    this.applyFilters();
  }

  // Handle endDate change
  onEndDateChange(): void {
    if (!this.filters.startDate) {
      alert('Please select a start date first.');
      this.filters.endDate = null;
      this.applyFilters();
      return;
    }

    const startDate = new Date(this.filters.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (this.filters.endDate && new Date(this.filters.endDate) < startDate) {
      alert('End date cannot be before the start date. Please select a date on or after the start date.');
      this.filters.endDate = null;
    }
    this.applyFilters();
  }

  getCustomerName(customerId: string): string {
    return this.customers[customerId] || 'Unknown Customer';
  }

  getServiceName(serviceId?: string): string {
    return serviceId ? (this.services[serviceId]?.name || 'N/A') : 'N/A';
  }

  getBundleName(bundleId?: string): string {
    return bundleId ? (this.bundles[bundleId]?.name || 'N/A') : 'N/A';
  }

  onQRCodeError(reservation: Reservation): void {
    reservation.qrCode = undefined; // Remove invalid QR code
  }

  canCancelReservation(bookingDate: string): boolean {
    const now = new Date();
    const booking = new Date(bookingDate);
    const diffInMs = booking.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours >= 24;
  }

  cancelReservation(reservationId: string, bookingDate: string): void {
    if (!this.canCancelReservation(bookingDate)) {
      alert('You can only cancel reservations at least 24 hours before the booking date.');
      return;
    }

    if (confirm('Are you sure you want to cancel this reservation? This will delete the reservation permanently.')) {
      this.apiService.delete(`reservations/${reservationId}`).subscribe({
        next: () => {
          alert('Reservation cancelled and deleted successfully!');
          this.loadReservations();
        },
        error: (error) => {
          console.error('Error cancelling reservation:', error);
          alert('Failed to cancel reservation: ' + (error.error?.message || 'Unknown error'));
        }
      });
    }
  }

  downloadQRCode(qrCode: string | undefined, reservationId: string): void {
    if (!qrCode) {
      alert('No QR code available to download.');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `reservation-qr-${reservationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}