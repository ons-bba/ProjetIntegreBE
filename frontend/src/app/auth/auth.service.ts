import { Injectable } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { Observable } from 'rxjs';
import { AuthResponse, User } from '../shared/models';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private user: User | null = null; // Cache the user object for faster access

    constructor(private api: ApiService) { }

    register(email: string, name: string, password: string, role: string): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('auth/register', { email, name, password, role }).pipe(
            tap(response => {
                localStorage.setItem('token', response.token);
                this.user = this.decodeUser(response.token); // Cache the user after registration
            })
        );
    }
    
    login(name: string, password: string): Observable<AuthResponse> {
        return this.api.post<AuthResponse>('auth/login', { name, password }).pipe(
            tap(response => {
                localStorage.setItem('token', response.token);
                this.user = this.decodeUser(response.token); // Cache the user after login
            })
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        this.user = null; // Clear the cached user
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    private decodeUser(token: string): User | null {
        try {
            const decoded: any = jwtDecode(token);
            return {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email, // Extract email from the token
                role: decoded.role
            };
        } catch (error) {
            console.error('Invalid token:', error);
            this.logout();
            return null;
        }
    }

    getUser(): User | null {
        if (this.user) {
            return this.user; // Return cached user if available
        }
        const token = this.getToken();
        if (!token) return null;
        this.user = this.decodeUser(token); // Cache the user if not already cached
        return this.user;
    }

    getUserEmail(): string | null {
        const user = this.getUser();
        return user?.email || null;
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        if (!token) return false;
        const user = this.getUser();
        return !!user;
    }

    isAdmin(): boolean {
        const user = this.getUser();
        return user?.role === 'Admin';
    }

    isCustomer(): boolean {
        const user = this.getUser();
        return user?.role === 'Customer';
    }
}