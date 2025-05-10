import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, take } from 'rxjs/operators';
import { MakePaymentDialogComponent } from '../make-payment-dialog/make-payment-dialog.component';
import { AuthService } from '../../auth/auth.service';
import { ApiService } from '../../shared/api.service';
import { Service, Bundle } from '../../shared/models';

// Custom date formats for DD/MM/YYYY
const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: { dateInput: 'DD/MM/YYYY', monthYearLabel: 'MMM YYYY', dateA11yLabel: 'LL', monthYearA11yLabel: 'MMMM YYYY' },
};

@Component({
  selector: 'app-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }],
  templateUrl: './make-reservation.component.html',
  styleUrls: ['./make-reservation.component.scss'],
})
export class ReservationComponent implements OnInit {
  services: Service[] = [];
  bundles: Bundle[] = [];
  reservation = { serviceId: '', bundleId: '', startDate: null as Date | null, endDate: null as Date | null, time: '', couponCode: '' as string | undefined };
  selectedService: Service | null = null;
  selectedBundle: Bundle | null = null;
  minDate: Date = new Date();
  totalCost = 0;
  originalPrice = 0;
  offerDiscount = 0;
  discountPercentage = 0;
  isCouponApplied = false;
  appliedCouponCode: string | null = null;
  isSubmitting = false;
  isApplyingCoupon = false;
  timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  private submitSubject = new Subject<void>();
  private applyCouponSubject = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dateAdapter: DateAdapter<Date>,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.dateAdapter.setLocale('en-GB');
  }

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);
    this.loadServices();
    this.loadBundles();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.apiService.get<Service>(`services/${id}`).subscribe({
        next: (service) => {
          this.reservation.serviceId = id;
          this.selectedService = service;
          this.calculateTotalCost();
        },
        error: () => {
          this.apiService.get<Bundle>(`bundles/${id}`).subscribe({
            next: (bundle) => {
              this.reservation.bundleId = id;
              this.selectedBundle = bundle;
              this.calculateTotalCost();
            },
            error: () => {
              alert('Failed to load item details.');
              this.router.navigate(['/customer/services']);
            },
          });
        },
      });
    }

    this.submitSubject.pipe(debounceTime(1000), take(1)).subscribe(() => this.submitReservationInternal());
    this.applyCouponSubject.pipe(debounceTime(500)).subscribe(() => this.applyCouponInternal());
  }

  startDateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  endDateFilter = (date: Date | null): boolean => {
    if (!date || !this.reservation.startDate) return false;
    const startDate = new Date(this.reservation.startDate);
    startDate.setHours(0, 0, 0, 0);
    return date >= startDate;
  };

  onStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the start date.');
      this.reservation.startDate = null;
    }
    if (this.reservation.startDate && this.reservation.endDate && new Date(this.reservation.endDate) < new Date(this.reservation.startDate)) {
      this.reservation.endDate = null;
    }
  }

  onEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.reservation.startDate) {
      alert('Please select a start date first.');
      this.reservation.endDate = null;
    } else if (selectedDate && selectedDate < new Date(this.reservation.startDate)) {
      alert('End date cannot be before the start date.');
      this.reservation.endDate = null;
    }
  }

  clearStartDate(): void { this.reservation.startDate = this.reservation.endDate = null; }
  clearEndDate(): void { this.reservation.endDate = null; }

  loadServices(): void {
    this.apiService.get<Service[]>('services').subscribe({ next: services => this.services = services, error: () => alert('Failed to load services.') });
  }

  loadBundles(): void {
    this.apiService.get<Bundle[]>('bundles').subscribe({ next: bundles => this.bundles = bundles, error: () => alert('Failed to load bundles.') });
  }

  onServiceChange(): void {
    if (this.reservation.serviceId) {
      this.reservation.bundleId = '';
      this.selectedBundle = null;
      this.selectedService = this.services.find(service => service._id === this.reservation.serviceId) || null;
      this.resetCouponState();
      this.calculateTotalCost();
    } else this.deselectItem();
  }

  onBundleChange(): void {
    if (this.reservation.bundleId) {
      this.reservation.serviceId = '';
      this.selectedService = null;
      this.selectedBundle = this.bundles.find(bundle => bundle._id === this.reservation.bundleId) || null;
      this.resetCouponState();
      this.calculateTotalCost();
    } else this.deselectItem();
  }

  deselectItem(): void {
    this.reservation.serviceId = this.reservation.bundleId = '';
    this.selectedService = this.selectedBundle = null;
    this.resetCouponState();
    this.totalCost = this.originalPrice = this.offerDiscount = 0;
  }

  calculateTotalCost(): void {
    if (this.selectedService) {
      this.originalPrice = this.selectedService.price;
      this.totalCost = this.originalPrice - (this.offerDiscount || 0);
    } else if (this.selectedBundle) {
      this.originalPrice = this.selectedBundle.price - (this.selectedBundle.discount || 0) - (this.selectedBundle.timeLimitedDiscount || 0);
      this.totalCost = this.originalPrice - (this.offerDiscount || 0);
    } else this.totalCost = this.originalPrice = this.offerDiscount = 0;
  }

  resetCouponState(): void {
    this.isCouponApplied = false;
    this.appliedCouponCode = null;
    this.offerDiscount = this.discountPercentage = 0;
    this.calculateTotalCost();
  }

  applyCoupon(): void {
    if (this.isApplyingCoupon) return;
    this.isApplyingCoupon = true;
    this.applyCouponSubject.next();
  }

  private applyCouponInternal(): void {
    const { couponCode, serviceId, bundleId } = this.reservation;
    if (!couponCode?.trim()) { alert('Please enter a valid coupon code.'); this.isApplyingCoupon = false; return; }
    if (!serviceId && !bundleId) { alert('Please select a service or bundle.'); this.isApplyingCoupon = false; return; }
    if (this.isCouponApplied && couponCode === this.appliedCouponCode) { alert('This coupon has already been applied.'); this.isApplyingCoupon = false; return; }

    this.resetCouponState();
    const itemType = serviceId ? 'service' : 'bundle';
    this.apiService.post('coupons/verify', { code: couponCode, itemType, itemIds: [serviceId || bundleId] }).subscribe({
      next: (response: any) => {
        if (response.message === 'Coupons verified' && response.results[0]) {
          const result = response.results[0];
          if (result.isApplicable) {
            this.totalCost = result.newPrice;
            this.offerDiscount = result.originalPrice - result.newPrice;
            this.discountPercentage = (this.offerDiscount / result.originalPrice) * 100;
            this.isCouponApplied = true;
            this.appliedCouponCode = couponCode;
            alert(`Coupon "${couponCode}" applied! Discount: ${this.discountPercentage.toFixed(2)}% (${this.offerDiscount.toLocaleString('en-TN', { style: 'currency', currency: 'TND' })})`);
          } else {
            alert(`Failed to apply coupon: ${result.errorMessage || 'Coupon is not applicable.'}`);
            this.resetCouponState();
          }
        } else {
          alert('Failed to verify coupon.');
          this.resetCouponState();
        }
        this.isApplyingCoupon = false;
      },
      error: (error) => {
        alert(`Failed to apply coupon: ${error.error?.message || error.error?.errors?.map((err: any) => err.msg).join(', ') || 'Unknown error'}`);
        this.resetCouponState();
        this.isApplyingCoupon = false;
      },
    });
  }

  submitReservation(): void {
    if (this.isSubmitting) return;
    const { serviceId, bundleId, startDate, endDate, time } = this.reservation;
    if (!serviceId && !bundleId) { alert('Please select either a service or a bundle.'); return; }
    if (!startDate || !endDate || !time) { alert('Please select both a start date, an end date, and a time.'); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) { alert('The start date cannot be in the past.'); return; }
    if (endDate < startDate) { alert('The end date cannot be before the start date.'); return; }

    const customerEmail = this.authService.getUserEmail();
    if (!customerEmail) { alert('User email not found. Please log in again.'); this.router.navigate(['/login']); return; }

    const dialogRef = this.dialog.open(MakePaymentDialogComponent, { width: '500px', data: { amount: this.totalCost, email: customerEmail }, disableClose: false });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.isSubmitting = true;
        this.submitReservationInternal(result.paymentIntentId);
      }
    });
  }

  private async submitReservationInternal(paymentIntentId?: string): Promise<void> {
    const [hours, minutes] = this.reservation.time.split(':').map(Number);
    const bookingDate = new Date(this.reservation.startDate!);
    bookingDate.setHours(hours, minutes, 0, 0);

    const reservationData = {
      serviceId: this.reservation.serviceId || undefined,
      bundleId: this.reservation.bundleId || undefined,
      bookingDate: bookingDate.toISOString(),
      endDate: this.reservation.endDate?.toISOString(),
      couponCode: this.reservation.couponCode?.trim() || undefined,
      totalCost: this.totalCost,
      paymentIntentId
    };

    try {
      const response: any = await this.apiService.post('reservations/customer', reservationData).toPromise();
      if (response.message === 'Reservation created') {
        alert('Reservation submitted successfully!');
        this.reservation = { serviceId: '', bundleId: '', startDate: null, endDate: null, time: '', couponCode: undefined };
        this.selectedService = this.selectedBundle = null;
        this.totalCost = this.originalPrice = this.offerDiscount = this.discountPercentage = 0;
        this.isCouponApplied = false;
        this.appliedCouponCode = null;
        this.router.navigate(['/customer/reservations']);
      } else {
        alert('Unexpected response from server.');
      }
    } catch (error: any) {
      alert(`Failed to submit reservation: ${error.error?.message || 'Unknown error'}`);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel(): void { this.router.navigate(['/customer/reservations']); }
}