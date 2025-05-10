import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../shared/api.service';
import { Bundle } from '../../shared/models';

@Component({
    selector: 'app-bundles',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule
    ],
    templateUrl: './bundles.component.html',
    styleUrls: ['./bundles.component.scss']
})
export class BundlesComponent implements OnInit {
    bundles: Bundle[] = [];
    filteredBundles: Bundle[] = [];
    filters = {
        name: '',
        minPrice: null as number | null,
        maxPrice: null as number | null,
        isActive: '' as string
    };

    constructor(
        private apiService: ApiService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadBundles();
    }

    loadBundles(): void {
        const queryParams = new URLSearchParams();
        if (this.filters.name) queryParams.set('name', this.filters.name);
        if (this.filters.minPrice !== null) queryParams.set('minPrice', this.filters.minPrice.toString());
        if (this.filters.maxPrice !== null) queryParams.set('maxPrice', this.filters.maxPrice.toString());
        if (this.filters.isActive !== '') queryParams.set('isActive', this.filters.isActive);

        this.apiService.get<Bundle[]>(`bundles?${queryParams.toString()}`).subscribe({
            next: (bundles) => {
                console.log('Fetched bundles:', bundles);
                this.bundles = bundles;
                this.filteredBundles = bundles;
            },
            error: (error) => {
                console.error('Error fetching bundles:', error);
                alert('Failed to load bundles.');
            }
        });
    }

    applyFilters(): void {
        this.loadBundles();
    }

    reserveBundle(bundleId: string): void {
        console.log('Reserving bundle with ID:', bundleId);
        this.router.navigate(['/customer/reservation', bundleId]);
    }
}