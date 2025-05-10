import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../shared/api.service';

interface Subscription {
    _id: string;
    customerId: string;
    planName: string;
    serviceIds: string[];
    price: number;
    offerDiscount: number;
    offerStartDate?: string;
    offerEndDate?: string;
    startDate: string;
    endDate?: string;
    status: 'active' | 'inactive' | 'expired';
    fuelCreditId?: string;
    qrCode?: string;
    createdAt: string;
}

@Component({
    selector: 'app-subscription',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    templateUrl: './subscription.component.html',
    styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
    subscriptions: Subscription[] = [];
    filteredSubscriptions: Subscription[] = [];
    searchName: string = '';
    minPrice: number | null = null;
    maxPrice: number | null = null;
    selectedStatus: string = 'All Statuses';

    constructor(private apiService: ApiService) { }

    ngOnInit(): void {
        this.loadSubscriptions();
    }

    loadSubscriptions(): void {
        this.apiService.get<Subscription[]>('subscriptions/customer').subscribe({
            next: (subscriptions) => {
                console.log('Fetched subscriptions:', subscriptions);
                this.subscriptions = subscriptions;
                this.filteredSubscriptions = [...this.subscriptions];
                this.applyFilters();
            },
            error: (error) => {
                console.error('Error fetching subscriptions:', error);
                alert('Failed to load subscriptions.');
            }
        });
    }

    applyFilters(): void {
        this.filteredSubscriptions = this.subscriptions.filter(subscription => {
            const matchesName = this.searchName
                ? subscription.planName.toLowerCase().includes(this.searchName.toLowerCase())
                : true;

            const minPriceValue = this.minPrice !== null && this.minPrice !== undefined && !isNaN(Number(this.minPrice))
                ? Number(this.minPrice)
                : null;

            const maxPriceValue = this.maxPrice !== null && this.maxPrice !== undefined && !isNaN(Number(this.maxPrice))
                ? Number(this.maxPrice)
                : null;

            const effectivePrice = subscription.price - (subscription.offerDiscount || 0);
            const matchesPrice = (minPriceValue !== null ? effectivePrice >= minPriceValue : true) &&
                                (maxPriceValue !== null ? effectivePrice <= maxPriceValue : true);

            const matchesStatus = this.selectedStatus !== 'All Statuses'
                ? subscription.status === this.selectedStatus.toLowerCase()
                : true;

            return matchesName && matchesPrice && matchesStatus;
        });
    }

    onSearchNameChange(): void {
        this.applyFilters();
    }

    onMinPriceChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.minPrice = input.value ? Number(input.value) : null;
        this.applyFilters();
    }

    onMaxPriceChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.maxPrice = input.value ? Number(input.value) : null;
        this.applyFilters();
    }

    onStatusChange(): void {
        this.applyFilters();
    }

    canCancelSubscription(startDate: string): boolean {
        const now = new Date();
        const start = new Date(startDate);

        if (isNaN(start.getTime())) {
            console.error('Invalid start date:', startDate);
            return false;
        }

        const diffInMs = start.getTime() - now.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);
        return diffInHours >= 24;
    }

    cancelSubscription(subscriptionId: string, startDate: string): void {
        console.log('Cancelling subscription with ID:', subscriptionId);
        if (!this.canCancelSubscription(startDate)) {
            alert('You can only cancel subscriptions at least 24 hours before the start date.');
            return;
        }

        if (confirm('Are you sure you want to cancel this subscription? This will delete the subscription permanently.')) {
            this.apiService.delete(`subscriptions/${subscriptionId}`).subscribe({
                next: () => {
                    alert('Subscription cancelled and deleted successfully!');
                    this.loadSubscriptions();
                },
                error: (error) => {
                    console.error('Error cancelling subscription:', error);
                    alert('Failed to cancel subscription: ' + (error.error?.message || 'Unknown error'));
                }
            });
        }
    }

    downloadQRCode(subscription: Subscription): void {
        console.log('Downloading QR code for subscription ID:', subscription._id);
        if (!subscription.qrCode) {
            alert('No QR code available to download.');
            return;
        }

        const link = document.createElement('a');
        link.href = subscription.qrCode;
        link.download = `subscription-qr-${subscription._id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    onQRCodeError(subscription: Subscription): void {
        subscription.qrCode = undefined;
    }
}