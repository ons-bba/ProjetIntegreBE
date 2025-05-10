import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-customer-dashboard',
    standalone: true,
    imports: [RouterModule, CommonModule],
    templateUrl: './customer-dashboard.component.html',
    styleUrls: ['./customer-dashboard.component.scss']
})
export class CustomerDashboardComponent {
    selectedModule: string = 'mobility-core'; // Default module

    constructor(private router: Router) {}

    onModuleChange(module: string) {
        this.selectedModule = module;
    }
}