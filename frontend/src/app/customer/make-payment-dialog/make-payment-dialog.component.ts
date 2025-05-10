import { Component, Inject, AfterViewInit, ViewChild, OnInit, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-make-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './make-payment-dialog.component.html',
  styleUrls: ['./make-payment-dialog.component.scss'],
})
export class MakePaymentDialogComponent implements OnInit, AfterViewInit {
  amount: number;
  originalAmount: number;
  customerEmail: string;
  cardError: string | null = null;
  isProcessing: boolean = false;
  stripeLoaded: boolean = false;
  stripe: any;
  cardElement: any;
  couponCode: string = '';
  couponApplied: boolean = false;
  couponDiscount: number = 0;

  @ViewChild('cardElement') cardElementRef!: ElementRef;

  constructor(
    private dialogRef: MatDialogRef<MakePaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { amount: number, email: string },
    private http: HttpClient
  ) {
    console.log('Dialog data received:', this.data); // Debug log
    this.originalAmount = this.data.amount;
    this.amount = this.data.amount;
    this.customerEmail = this.data.email;
    console.log('Customer email set to:', this.customerEmail); // Debug log
    if (!this.customerEmail) {
      console.error('Customer email is undefined in MakePaymentDialogComponent');
      this.cardError = 'Error: Customer email is not provided.';
    }
  }

  async ngOnInit(): Promise<void> {
    console.log('MakePaymentDialogComponent ngOnInit called');
    try {
      this.stripe = await loadStripe(environment.stripePublishableKey);
      console.log('loadStripe result:', this.stripe);
      if (this.stripe) {
        this.stripeLoaded = true;
        console.log('Stripe.js loaded, stripeLoaded set to true');
        this.initializeCardElement();
      } else {
        this.cardError = 'Failed to load payment form. Please try again later.';
        console.log('Stripe.js failed to load (stripe is null/undefined)');
      }
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.cardError = 'Failed to load payment form. Please try again later.';
    }
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit called, stripeLoaded:', this.stripeLoaded);
    if (this.stripeLoaded && !this.cardElement) {
      console.log('Retrying card element initialization in ngAfterViewInit');
      this.initializeCardElement();
    }
  }

  initializeCardElement(): void {
    console.log('initializeCardElement called, stripeLoaded:', this.stripeLoaded, 'stripe:', this.stripe);
    if (!this.stripeLoaded || !this.stripe) {
      console.log('Skipping card element creation due to Stripe not being loaded');
      return;
    }

    console.log('cardElementRef:', this.cardElementRef);
    if (!this.cardElementRef || !this.cardElementRef.nativeElement) {
      console.error('cardElementRef is undefined or nativeElement is missing');
      this.cardError = 'Failed to initialize payment form due to missing card element container.';
      return;
    }

    try {
      const elements = this.stripe.elements();
      console.log('Stripe elements created:', elements);
      this.cardElement = elements.create('card');
      console.log('Card element created:', this.cardElement);
      this.cardElement.mount(this.cardElementRef.nativeElement);
      console.log('Card element mounted successfully');

      // Remove validation for testing purposes
      this.cardElement.on('change', (event: any) => {
        if (event.error) {
          this.cardError = event.error.message;
        } else {
          this.cardError = null;
        }
      });
    } catch (error) {
      console.error('Error initializing Stripe card element:', error);
      this.cardError = 'Failed to initialize payment form. Please try again.';
    }
  }

  async processPayment(): Promise<void> {
    console.log('processPayment called');
    if (this.isProcessing || !this.stripeLoaded) {
      console.log('Cannot process payment: ', {
        isProcessing: this.isProcessing,
        stripeLoaded: this.stripeLoaded,
      });
      return;
    }
    this.isProcessing = true;
    this.cardError = null;

    try {
      const amountInMillimes = Math.round(this.amount * 1000);
      console.log('Sending create-payment-intent request:', { amount: amountInMillimes, currency: 'TND' });

      const response = await this.http
        .post<{ clientSecret: string }>(`${environment.apiUrl}/create-payment-intent`, {
          amount: amountInMillimes,
          currency: 'TND',
        })
        .toPromise();

      if (!response || !response.clientSecret) {
        throw new Error('Failed to create payment intent: Invalid response from server.');
      }

      const clientSecret = response.clientSecret;
      console.log('Received clientSecret:', clientSecret);

      // Simulate a successful payment for testing purposes
      console.log('Simulating successful payment for testing...');
      const paymentIntentId = clientSecret.split('_secret_')[0]; // Extract payment intent ID from clientSecret
      try {
        await this.http
          .post(`${environment.apiUrl}/send-email`, {
            to: this.customerEmail,
            subject: 'Payment Confirmation',
            body: `Thank you for your payment of ${this.amount} TND! Payment ID: ${paymentIntentId}`,
          })
          .toPromise();
        console.log('Confirmation email sent successfully');
        this.cardError = 'Payment successful! Confirmation email sent.';
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        this.cardError = 'Payment succeeded, but failed to send confirmation email.';
      }
      this.isProcessing = false;
      this.dialogRef.close({ success: true, paymentIntentId });
    } catch (error: any) {
      if (error.error && error.error.error) {
        this.cardError = error.error.error;
      } else if (error.message.includes('network')) {
        this.cardError = 'Network error: Please disable ad blockers or whitelist stripe.com and try again.';
      } else {
        this.cardError = error.message || 'An error occurred while processing your request.';
      }
      this.isProcessing = false;
      console.error('Error in processPayment:', error);
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}