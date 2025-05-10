export interface User {
    id: string;
    name: string;
    role: 'Admin' | 'Customer';
    email: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Service {
    _id: string;
    name: string;
    category: string;
    description: string;
    price: number;
    duration: number;
    status: string;
    isBundleOnly: boolean;
}

export interface Reservation {
    _id: string;
    customerId: string;
    serviceId?: string;
    bundleId?: string;
    status: 'Pending' | 'Completed' | 'Cancelled';
    bookingDate: string;
    completionDate?: string;
    totalCost: number;
    qrCode?: string;
    couponId?: string;
    notes?: string;
    createdAt: string;
}

export interface Bundle {
    _id: string;
    name: string;
    description: string;
    serviceIds: Service[];
    price: number;
    discount: number;
    timeLimitedDiscount: number | null;
    discountStartDate?: Date | null;
    discountEndDate?: Date | null;
    isActive: boolean;
    createdAt: Date;
}

export interface DashboardData {
    revenueBreakdown: Array<{
      name: string;
      y: number;
      color: string;
    }>;
    topServices: {
      categories: string[];
      data: number[];
    };
    topBundles: { 
        categories: string[];
         data: number[] 
    };
    subscriptionPerformance: {
      categories: string[];
      data: number[];
    };
    couponUsage: {
      categories: string[];
      data: number[];
    };
    underperforming: {
      categories: string[];
      data: number[];
    };
    topCustomers: {
      categories: string[];
      data: number[];
    };
    lowCustomers: {
      categories: string[];
      data: number[];
    };
}