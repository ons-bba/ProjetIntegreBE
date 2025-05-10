import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, MatToolbarModule, MatButtonModule, MatMenuModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavBarComponent implements OnInit {
    user: { id: string; name: string; role: string } | null = null;
    isLoggedIn: boolean = false;
    isCustomer: boolean = false;
    isAdmin: boolean = false;

    constructor(
        public authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.updateAuthState();
        // Subscribe to router events to update auth state on navigation
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateAuthState();
            this.cdr.detectChanges(); // Ensure UI updates
        });
    }

    updateAuthState(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.user = this.authService.getUser();
        this.isCustomer = this.authService.isCustomer();
        this.isAdmin = this.authService.isAdmin();
        console.log('Navbar auth state:', { isLoggedIn: this.isLoggedIn, user: this.user });
    }

    logout(): void {
        this.authService.logout();
        this.updateAuthState();
        this.router.navigate(['/login']);
    }

    getHomeRoute(): string {
        if (this.isAdmin) {
            return '/admin';
        } else if (this.isCustomer) {
            return '/customer';
        } else {
            return '/login';
        }
    }
}