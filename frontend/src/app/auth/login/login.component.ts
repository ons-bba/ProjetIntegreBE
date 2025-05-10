import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        RouterModule,
        MatSnackBarModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    loginForm: FormGroup;
    error: string | null = null;
    isLoading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.loginForm = this.fb.group({
            name: ['', Validators.required],
            password: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.error = null;

        const { name, password } = this.loginForm.value;
        this.authService.login(name, password).subscribe({
            next: (response) => {
                this.snackBar.open('Connexion réussie !', 'Fermer', {
                    duration: 3000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top'
                });
                const user = this.authService.getUser();
                if (user?.role === 'Admin') {
                    this.router.navigate(['/admin']);
                } else if (user?.role === 'Customer') {
                    this.router.navigate(['/customer']);
                } else {
                    this.error = 'Rôle inconnu';
                    this.snackBar.open(this.error!, 'Fermer', { // Use non-null assertion
                        duration: 3000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                        panelClass: ['error-snackbar']
                    });
                    this.isLoading = false;
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.error = err.error?.message || 'Nom d\'utilisateur ou mot de passe invalide';
                this.snackBar.open(this.error!, 'Fermer', { // Use non-null assertion
                    duration: 3000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top',
                    panelClass: ['error-snackbar']
                });
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }
}