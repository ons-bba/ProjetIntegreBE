import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Add MatSnackBar

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule // Add MatSnackBarModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  modelName = 'users';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackBar: MatSnackBar // Add MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsers();
  }

  initializeForm(): void {
    this.formFields = {
      name: { default: '', validators: [Validators.required] },
      email: { default: '', validators: [Validators.required, Validators.email] }, // Add email field
      password: { default: '', validators: [Validators.required, Validators.minLength(6)] }, // Add minLength for password
      role: {
        default: 'Customer',
        validators: [Validators.required],
        type: 'select',
        options: ['Admin', 'Customer']
      }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls);
  }

  loadUsers(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (users) => {
        this.users = users;
        console.log('Users loaded:', this.users);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openEditDialog(item?: any): void {
    let selectedItem = null;
    if (item) {
      selectedItem = { ...item };
      const patchValue = { ...item };
      delete patchValue.createdAt;
      this.editForm.patchValue(patchValue);
    } else {
      selectedItem = null;
      const defaults: { [key: string]: any } = {};
      for (const field in this.formFields) {
        if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
          defaults[field] = this.formFields[field].default !== undefined ? this.formFields[field].default : '';
        }
      }
      this.editForm.reset(defaults);
    }

    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveUser(selectedItem);
      }
    });
  }

  saveUser(selectedItem: any): void {
    const value = this.editForm.value;
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, value).subscribe({
        next: () => {
          this.loadUsers();
          this.snackBar.open('Utilisateur mis à jour avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        },
        error: (err) => {
          console.error('Error updating user:', err);
          this.snackBar.open('Erreur lors de la mise à jour de l\'utilisateur', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.api.post<any>(this.modelName, value).subscribe({
        next: () => {
          this.loadUsers();
          this.snackBar.open('Utilisateur créé avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        },
        error: (err) => {
          console.error('Error creating user:', err);
          this.snackBar.open('Erreur lors de la création de l\'utilisateur', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  deleteUser(id: string): void {
    this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
      next: () => {
        this.loadUsers();
        this.snackBar.open('Utilisateur supprimé avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.snackBar.open('Erreur lors de la suppression de l\'utilisateur', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}