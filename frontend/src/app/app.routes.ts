import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { CustomerDashboardComponent } from './customer/customer-dashboard/customer-dashboard.component';
import { ServicesComponent } from './customer/services/services.component';
import { ReservationComponent } from './customer/make-reservation/make-reservation.component';
import { ReservationsComponent } from './customer/reservations/reservations.component';
import { BundlesComponent } from './customer/bundles/bundles.component';
import { MakeSubscriptionComponent } from './customer/make-subscription/make-subscription.component'; // Add this import
import { UsersComponent } from './admin/users/users.component';
import { ServicesComponent as AdminServicesComponent } from './admin/services/services.component';
import { ReservationsComponent as AdminReservationsComponent } from './admin/reservations/reservations.component';
import { SubscriptionsComponent } from './admin/subscriptions/subscriptions.component';
import { CouponsComponent } from './admin/coupons/coupons.component';
import { BundlesComponent as AdminBundlesComponent } from './admin/bundles/bundles.component';
import { FuelCreditsComponent } from './admin/fuel-credits/fuel-credits.component';
import { AuthGuard, AdminGuard, CustomerGuard } from './auth/auth.guard';
import { SubscriptionComponent } from './customer/subscription/subscription.component';
import { RegisterComponent } from './auth/register/register.component';
import { AdminMonitoringComponent } from './admin/admin-monitoring/admin-monitoring.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: 'customer',
        component: CustomerDashboardComponent,
        canActivate: [AuthGuard, CustomerGuard],
        children: [
            { path: 'services', component: ServicesComponent },
            { path: 'bundles', component: BundlesComponent },
            { path: 'reservation', component: ReservationComponent },
            { path: 'reservation/:id', component: ReservationComponent },
            { path: 'reservations', component: ReservationsComponent },
            { path: 'subscriptions', component: SubscriptionComponent },
            { path: 'subscription', component: MakeSubscriptionComponent }, 
            { path: 'subscription/:id', component: MakeSubscriptionComponent }, 
            { path: '', redirectTo: 'services', pathMatch: 'full' }
        ]
    },
    {
        path: 'admin',
        component: AdminDashboardComponent, 
        canActivate: [AuthGuard, AdminGuard],
        children: [
            { path: 'monitoring', component: AdminMonitoringComponent },
            { path: 'users', component: UsersComponent },
            { path: 'services', component: AdminServicesComponent },
            { path: 'reservations', component: AdminReservationsComponent },
            { path: 'subscriptions', component: SubscriptionsComponent },
            { path: 'coupons', component: CouponsComponent },
            { path: 'bundles', component: AdminBundlesComponent },
            { path: 'fuel-credits', component: FuelCreditsComponent },
            { path: '', redirectTo: 'monitoring', pathMatch: 'full' }
        ]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];