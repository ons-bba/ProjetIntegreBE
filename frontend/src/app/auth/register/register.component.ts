import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        RouterModule 
    ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
    registerForm: FormGroup;
    error: string | null = null;
    isLoading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        // Clear localStorage at component initialization to ensure no stale token exists
        localStorage.removeItem('token');
        console.log('Cleared localStorage token at registration start');

        this.registerForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            name: ['', Validators.required],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit(): void {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.error = null;

        const { email, name, password } = this.registerForm.value;
        const role = 'Customer';
        this.authService.register(email, name, password, role).subscribe({
            next: (response) => {
                console.log('Registration successful:', response);
                this.authService.logout();
                console.log('Forced logout after registration');
                alert('Registration successful! Please log in.');
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.isLoading = false;
                this.error = err.error?.message || 'Error during registration';
                console.error('Registration error:', err);
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/login']);
    }
}