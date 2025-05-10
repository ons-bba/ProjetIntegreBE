import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
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

// Custom date formats for DD/MM/YYYY
const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: { dateInput: 'DD/MM/YYYY', monthYearLabel: 'MMM YYYY', dateA11yLabel: 'LL', monthYearA11yLabel: 'MMMM YYYY' },
};

// Define interfaces
interface SubscriptionPlan { _id: string; name: string; }
interface Service { _id: string; name: string; price: number; }

@Component({
  selector: 'app-make-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }],
  templateUrl: './make-subscription.component.html',
  styleUrls: ['./make-subscription.component.scss'],
})
export class MakeSubscriptionComponent implements OnInit {
  plans: SubscriptionPlan[] = [
    { _id: '1', name: 'Abonnement Entretien de Base' },
    { _id: '2', name: 'Abonnement Sécurité Premium' },
    { _id: '3', name: 'Abonnement Confort Luxe' },
    { _id: '4', name: 'Abonnement Gestion de Flotte' },
  ];
  services: Service[] = [];
  subscriptionForm = { planId: '', serviceIds: [] as string[], startDate: null as Date | null, endDate: null as Date | null, couponCode: '' };
  subscriptionId: string | null = null;
  minDate: Date = new Date();
  totalCost = 0;
  originalPrice = 0;
  offerDiscount = 0;
  discountPercentage = 0;
  isCouponApplied = false;
  appliedCouponCode: string | null = null;
  isSubmitting = false;
  isApplyingCoupon = false;
  couponServiceId: string | null = null;
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
    this.subscriptionId = this.route.snapshot.paramMap.get('id');
    if (this.subscriptionId) {
      this.apiService.get<any>(`subscriptions/${this.subscriptionId}`).subscribe({
        next: (subscription) => {
          this.subscriptionForm.planId = this.plans.find(p => p.name === subscription.planName)?._id || '';
          this.subscriptionForm.serviceIds = subscription.serviceIds || [];
          this.subscriptionForm.couponCode = subscription.couponCode || '';
          if (subscription.startDate) {
            const startDate = new Date(subscription.startDate);
            startDate.setHours(0, 0, 0, 0);
            this.subscriptionForm.startDate = startDate;
          }
          if (subscription.endDate) {
            const endDate = new Date(subscription.endDate);
            endDate.setHours(0, 0, 0, 0);
            this.subscriptionForm.endDate = endDate;
          }
          this.totalCost = subscription.price || 0;
          this.offerDiscount = subscription.offerDiscount || 0;
          this.calculateTotalCost();
        },
        error: () => {
          alert('Failed to load subscription details.');
          this.router.navigate(['/customer/subscriptions']);
        },
      });
    }

    this.submitSubject.pipe(debounceTime(1000), take(1)).subscribe(() => this.submitSubscriptionInternal());
    this.applyCouponSubject.pipe(debounceTime(500)).subscribe(() => this.applyCouponInternal());
  }

  startDateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  endDateFilter = (date: Date | null): boolean => {
    if (!date || !this.subscriptionForm.startDate) return false;
    const startDate = new Date(this.subscriptionForm.startDate);
    startDate.setHours(0, 0, 0, 0);
    return date >= startDate;
  };

  onStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate && selectedDate < today) {
      alert('Past dates are not allowed for the start date.');
      this.subscriptionForm.startDate = null;
    }
    if (this.subscriptionForm.startDate && this.subscriptionForm.endDate && new Date(this.subscriptionForm.endDate) < new Date(this.subscriptionForm.startDate)) {
      this.subscriptionForm.endDate = null;
    }
  }

  onEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    const selectedDate = event.value;
    if (!this.subscriptionForm.startDate) {
      alert('Please select a start date first.');
      this.subscriptionForm.endDate = null;
    } else if (selectedDate && selectedDate < new Date(this.subscriptionForm.startDate)) {
      alert('End date cannot be before the start date.');
      this.subscriptionForm.endDate = null;
    }
  }

  clearStartDate(): void { this.subscriptionForm.startDate = this.subscriptionForm.endDate = null; }
  clearEndDate(): void { this.subscriptionForm.endDate = null; }

  loadServices(): void {
    this.apiService.get<Service[]>('services').subscribe({
      next: services => {
        this.services = services;
        this.calculateTotalCost();
      },
      error: () => alert('Failed to load services.')
    });
  }

  onPlanChange(): void { this.resetCouponState(); this.calculateTotalCost(); }
  onServiceChange(): void { this.resetCouponState(); this.calculateTotalCost(); }

  calculateTotalCost(): void {
    let servicesCost = 0, discountedServiceCost = 0;
    this.subscriptionForm.serviceIds.forEach(serviceId => {
      const service = this.services.find(s => s._id === serviceId);
      if (service) {
        if (this.isCouponApplied && this.couponServiceId === serviceId) {
          const discountAmount = (service.price * this.discountPercentage) / 100;
          discountedServiceCost = service.price - discountAmount;
          this.offerDiscount = discountAmount;
        } else {
          servicesCost += service.price;
        }
      }
    });
    this.originalPrice = servicesCost + (discountedServiceCost > 0 ? this.offerDiscount / (1 - this.discountPercentage / 100) : 0);
    this.totalCost = servicesCost + discountedServiceCost;
  }

  resetCouponState(): void {
    this.isCouponApplied = false;
    this.appliedCouponCode = this.couponServiceId = null;
    this.offerDiscount = this.discountPercentage = 0;
    this.calculateTotalCost();
  }

  applyCoupon(): void {
    if (this.isApplyingCoupon) return;
    this.isApplyingCoupon = true;
    this.applyCouponSubject.next();
  }

  private applyCouponInternal(): void {
    const { couponCode, planId, serviceIds } = this.subscriptionForm;
    if (!couponCode.trim()) { alert('Please enter a valid coupon code.'); this.isApplyingCoupon = false; return; }
    if (!planId) { alert('Please select a subscription plan.'); this.isApplyingCoupon = false; return; }
    if (!serviceIds.length) { alert('Please select at least one service.'); this.isApplyingCoupon = false; return; }
    if (this.isCouponApplied && couponCode === this.appliedCouponCode) { alert('This coupon has already been applied.'); this.isApplyingCoupon = false; return; }

    this.resetCouponState();
    this.apiService.post('coupons/verify', { code: couponCode.trim(), itemType: 'service', itemIds: serviceIds }).subscribe({
      next: (response: any) => {
        if (response.message === 'Coupons verified') {
          const applicableResult = response.results.find((r: any) => r.isApplicable);
          if (applicableResult) {
            const serviceId = serviceIds[response.results.indexOf(applicableResult)];
            this.offerDiscount = applicableResult.originalPrice - applicableResult.newPrice;
            this.discountPercentage = (this.offerDiscount / applicableResult.originalPrice) * 100;
            this.isCouponApplied = true;
            this.appliedCouponCode = couponCode;
            this.couponServiceId = serviceId;
            alert(`Coupon "${couponCode}" applied! Discount: ${this.discountPercentage.toFixed(2)}% (${this.offerDiscount.toLocaleString('en-TN', { style: 'currency', currency: 'TND' })})`);
            this.calculateTotalCost();
          } else {
            alert('The coupon does not apply to any of the selected services.');
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

  submitSubscription(form: NgForm): void {
    if (this.isSubmitting) return;
    const { planId, serviceIds, startDate, endDate } = this.subscriptionForm;
    if (!planId) { alert('Please select a subscription plan.'); return; }
    if (!serviceIds.length) { alert('Please select at least one service.'); return; }
    if (!startDate) { alert('Please select a start date.'); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) { alert('The start date cannot be in the past.'); return; }
    if (endDate && endDate < startDate) { alert('The end date cannot be before the start date.'); return; }

    const customerEmail = this.authService.getUserEmail();
    if (!customerEmail) { alert('User email not found. Please log in again.'); this.router.navigate(['/login']); return; }

    const dialogRef = this.dialog.open(MakePaymentDialogComponent, { width: '500px', data: { amount: this.totalCost, email: customerEmail }, disableClose: false });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.isSubmitting = true;
        this.submitSubscriptionInternal(result.paymentIntentId);
      }
    });
  }

  private async submitSubscriptionInternal(paymentIntentId?: string): Promise<void> {
    const selectedPlan = this.plans.find(plan => plan._id === this.subscriptionForm.planId);
    const subscriptionData = {
      planName: selectedPlan?.name || '',
      price: this.totalCost,
      serviceIds: this.subscriptionForm.serviceIds,
      offerStartDate: this.subscriptionForm.startDate?.toISOString(),
      offerEndDate: this.subscriptionForm.endDate?.toISOString(),
      startDate: this.subscriptionForm.startDate?.toISOString(),
      endDate: this.subscriptionForm.endDate?.toISOString(),
      status: 'active',
      couponCode: this.isCouponApplied && this.subscriptionForm.couponCode.trim() ? this.subscriptionForm.couponCode.trim() : undefined,
      paymentIntentId
    };

    try {
      const response = await (this.subscriptionId
        ? this.apiService.put(`subscriptions/${this.subscriptionId}`, subscriptionData)
        : this.apiService.post('subscriptions', subscriptionData)).toPromise();
      alert(this.subscriptionId ? 'Subscription updated successfully!' : 'Subscription created successfully!');
      this.router.navigate(['/customer/subscriptions']);
    } catch (error: any) {
      alert(`Failed to submit subscription: ${error.error?.message || 'Unknown error'}`);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel(): void { this.router.navigate(['/customer/subscriptions']); }
}