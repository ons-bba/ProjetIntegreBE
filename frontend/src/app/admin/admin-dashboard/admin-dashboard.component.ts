import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        RouterModule,
        CommonModule
    ],
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
    selectedModule: string = 'mobility-core'; // Default module

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    onModuleChange(module: string) {
        this.selectedModule = module;
    }
}