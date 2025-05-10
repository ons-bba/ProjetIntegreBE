import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../shared/api.service';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ServiceDialogComponent } from './services-dialog/services-dialog.component';
import { provideNativeDateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// Custom date formats for DD/MM/YYYY
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  services: any[] = [];
  modelName = 'services';
  formFields!: { [key: string]: any };
  editForm!: FormGroup;
  categoryOptions: string[] = [
    'Nettoyage et Détail',
    'Entretien et Réparations',
    'Carburant et Commodité',
    'Sécurité et Suivi',
    'Confort et Personnalisation',
    'Sécurité et Soutien',
    'Assurance et Rapports',
    'Pièces et Accessoires'
  ];

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadServices();
  }

  initializeForm(): void {
    this.formFields = {
      category: {
        default: '',
        validators: [Validators.required],
        type: 'select',
        options: this.categoryOptions
      },
      name: { default: '', validators: [Validators.required] },
      description: { default: '', validators: [Validators.required] },
      price: { default: 0, validators: [Validators.required, Validators.min(0)] },
      duration: { default: 0, validators: [Validators.required, Validators.min(0)] },
      isBundleOnly: { default: false, validators: [Validators.required] },
      status: { default: 'Active', validators: [] },
      offerDiscount: { default: 0, validators: [Validators.min(0)] },
      offerStartDate: { default: null, validators: [] },
      offerEndDate: { default: null, validators: [] }
    };

    const formControls: { [key: string]: any } = {};
    for (const field in this.formFields) {
      if (Object.prototype.hasOwnProperty.call(this.formFields, field)) {
        formControls[field] = [this.formFields[field].default, this.formFields[field].validators || []];
      }
    }
    this.editForm = this.fb.group(formControls);
  }

  loadServices(): void {
    this.api.get<any[]>(this.modelName).subscribe({
      next: (services) => {
        this.services = services;
        console.log('Services loaded:', this.services);
      },
      error: (err) => console.error('Error loading services:', err)
    });
  }

  openEditDialog(item?: any): void {
    let selectedItem = null;
    if (item) {
      selectedItem = { ...item };
      this.editForm.patchValue(selectedItem);
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

    // Create a new injector that includes the DateAdapter, MAT_DATE_FORMATS, and MAT_DATE_LOCALE
    const dialogInjector = Injector.create({
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
      ],
      parent: this.injector
    });

    const dialogRef = this.dialog.open(ServiceDialogComponent, {
      width: '400px',
      data: { form: this.editForm, fields: this.formFields, modelName: this.modelName, selectedItem },
      injector: dialogInjector
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveService(selectedItem);
      } else if (result === 'delete' && selectedItem) {
        this.deleteService(selectedItem._id);
      }
    });
  }

  saveService(selectedItem: any): void {
    const value = this.editForm.value;
    if (selectedItem) {
      this.api.put<any>(`${this.modelName}/${selectedItem._id}`, value).subscribe({
        next: () => {
          alert('Service updated successfully!');
          this.loadServices();
        },
        error: (err) => {
          console.error('Error updating service:', err);
          alert('Failed to update service: ' + (err.error?.message || 'Unknown error'));
        }
      });
    } else {
      this.api.post<any>(this.modelName, value).subscribe({
        next: () => {
          alert('Service created successfully!');
          this.loadServices();
        },
        error: (err) => {
          console.error('Error creating service:', err);
          alert('Failed to create service: ' + (err.error?.message || 'Unknown error'));
        }
      });
    }
  }

  deleteService(id: string): void {
    if (confirm('Are you sure you want to delete this service?')) {
      this.api.delete<any>(`${this.modelName}/${id}`).subscribe({
        next: () => {
          alert('Service deleted successfully!');
          this.loadServices();
        },
        error: (err) => {
          console.error('Error deleting service:', err);
          alert('Failed to delete service: ' + (err.error?.message || 'Unknown error'));
        }
      });
    }
  }
}