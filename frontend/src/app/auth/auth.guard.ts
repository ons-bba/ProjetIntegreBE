import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (this.authService.isLoggedIn()) {
            return true;
        }
        this.router.navigate(['/login']);
        return false;
    }
}

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (this.authService.isAdmin()) {
            return true;
        }
        this.router.navigate(['/login']);
        return false;
    }
}

@Injectable({
    providedIn: 'root'
})
export class CustomerGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (this.authService.isCustomer() || this.authService.isAdmin()) {
            return true; // Allow Customers or Admins
        }
        if (this.authService.isLoggedIn()) {
            this.router.navigate(['/admin']);
        } else {
            this.authService.logout()
            this.router.navigate(['/login']);
        }
        return false;
    }
}