import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../shared/api.service';
import { Service } from '../../shared/models';

@Component({
    selector: 'app-services',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    templateUrl: './services.component.html',
    styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
    services: Service[] = [];
    filteredServices: Service[] = [];
    filters = {
        category: '',
        name: '',
        minPrice: null as number | null,
        maxPrice: null as number | null,
        status: ''
    };

    constructor(
        private apiService: ApiService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadServices();
    }

    loadServices(): void {
        const queryParams = new URLSearchParams();
        if (this.filters.category) queryParams.set('category', this.filters.category);
        if (this.filters.name) queryParams.set('name', this.filters.name);
        if (this.filters.minPrice !== null) queryParams.set('minPrice', this.filters.minPrice.toString());
        if (this.filters.maxPrice !== null) queryParams.set('maxPrice', this.filters.maxPrice.toString());
        if (this.filters.status) queryParams.set('status', this.filters.status);

        this.apiService.get<Service[]>(`services?${queryParams.toString()}`).subscribe({
            next: (services) => {
                console.log('Fetched services:', services); // Debug log
                this.services = services;
                this.filteredServices = services;
            },
            error: (error) => {
                console.error('Error fetching services:', error);
                alert('Failed to load services.');
            }
        });
    }

    applyFilters(): void {
        this.loadServices();
    }

    reserveService(serviceId: string): void {
        console.log('Reserving service with ID:', serviceId); // Debug log
        this.router.navigate(['/customer/reservation', serviceId]);
    }
}