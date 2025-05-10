const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/mc-auth');
const Reservation = require('../model/mc-reservation');
const Subscription = require('../model/mc-subscription');
const FuelCredit = require('../model/mc-fuelCredit');
const Service = require('../model/mc-service');
const Bundle = require('../model/mc-bundle');
const Coupon = require('../model/mc-coupon');
const User = require('../model/mc-user');

// GET aggregated data for monitoring dashboard (Admin only)
router.get('/', auth(['Admin']), async (req, res) => {
  try {
    // Parse the time period from query parameters
    const period = req.query.period || 'monthly';
    let days;
    switch (period) {
      case 'weekly':
        days = 7;
        break;
      case 'monthly':
        days = 30;
        break;
      case 'yearly':
        days = 365;
        break;
      default:
        return res.status(400).json({ message: 'Invalid period parameter. Use "weekly", "monthly", or "yearly".' });
    }

    // Calculate the start date for filtering
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all required data in parallel with date filters
    const [
      reservations,
      subscriptions,
      fuelCredits,
      services,
      bundles,
      coupons,
      users
    ] = await Promise.all([
      Reservation.find({
        bookingDate: { $gte: startDate }
      }).populate('customerId'),
      Subscription.find({
        startDate: { $gte: startDate }
      }),
      FuelCredit.find({
        date: { $gte: startDate }
      }),
      Service.find(),
      Bundle.find(),
      Coupon.find({
        startDate: { $lte: new Date() }, 
        endDate: { $gte: startDate }    
      }),
      User.find({ role: 'Customer' })
    ]);

    // 1. Revenue Breakdown
    const reservationRevenue = reservations.reduce((sum, res) => sum + res.totalCost, 0);
    const subscriptionRevenue = subscriptions.reduce((sum, sub) => sum + sub.price, 0);
    const fuelCreditRevenue = fuelCredits.reduce((sum, fc) => sum + (fc.amount || 0), 0);

    const revenueBreakdown = [
      { name: 'Reservations', y: reservationRevenue, color: '#FF9999' },
      { name: 'Subscriptions', y: subscriptionRevenue, color: '#99CCFF' },
      { name: 'Fuel Credits', y: fuelCreditRevenue, color: '#99FF99' }
    ];

    // 2. Top Performing Services (excluding bundles)
    const serviceRevenueMap = new Map();
    reservations.forEach(res => {
      if (res.serviceId && !res.bundleId) { // Only include reservations with a service and no bundle
        const serviceId = res.serviceId.toString();
        const currentRevenue = serviceRevenueMap.get(serviceId) || 0;
        serviceRevenueMap.set(serviceId, currentRevenue + res.totalCost);
      }
    });

    const serviceMap = new Map(services.map(s => [s._id.toString(), s.name]));
    const topServicesCategories = [];
    const topServicesData = [];
    serviceRevenueMap.forEach((revenue, serviceId) => {
      const serviceName = serviceMap.get(serviceId) || `Service ${serviceId}`;
      topServicesCategories.push(serviceName);
      topServicesData.push(revenue);
    });

    const topServices = {
      categories: topServicesCategories.length > 0 ? topServicesCategories : ['No Data'],
      data: topServicesData.length > 0 ? topServicesData : [0]
    };

    // 3. Top Performing Bundles (new section)
    const bundleRevenueMap = new Map();
    reservations.forEach(res => {
      if (res.bundleId) { // Only include reservations with a bundle
        const bundleId = res.bundleId.toString();
        const currentRevenue = bundleRevenueMap.get(bundleId) || 0;
        bundleRevenueMap.set(bundleId, currentRevenue + res.totalCost);
      }
    });

    const bundleMap = new Map(bundles.map(b => [b._id.toString(), b.name]));
    const topBundlesCategories = [];
    const topBundlesData = [];
    bundleRevenueMap.forEach((revenue, bundleId) => {
      const bundleName = bundleMap.get(bundleId) || `Bundle ${bundleId}`;
      topBundlesCategories.push(bundleName);
      topBundlesData.push(revenue);
    });

    const topBundles = {
      categories: topBundlesCategories.length > 0 ? topBundlesCategories : ['No Data'],
      data: topBundlesData.length > 0 ? topBundlesData : [0]
    };

    // 4. Subscription Plan Performance
    const planRevenueMap = new Map();
    subscriptions.forEach(sub => {
      const planName = sub.planName;
      const currentRevenue = planRevenueMap.get(planName) || 0;
      planRevenueMap.set(planName, currentRevenue + sub.price);
    });

    const subscriptionCategories = Array.from(planRevenueMap.keys());
    const subscriptionData = Array.from(planRevenueMap.values());

    const subscriptionPerformance = {
      categories: subscriptionCategories,
      data: subscriptionData
    };

    // 5. Coupon Usage Trends
    const couponCategories = coupons.map(c => c.code);
    const couponData = coupons.map(c => c.uses);

    const couponUsage = {
      categories: couponCategories,
      data: couponData
    };

    // 6. Underperforming Services/Bundles
    const serviceRevenueMapForUnderperforming = new Map();
    const bundleRevenueMapForUnderperforming = new Map();

    reservations.forEach(res => {
      if (res.serviceId && !res.bundleId) {
        const serviceId = res.serviceId.toString();
        const currentRevenue = serviceRevenueMapForUnderperforming.get(serviceId) || 0;
        serviceRevenueMapForUnderperforming.set(serviceId, currentRevenue + res.totalCost);
      }
      if (res.bundleId) {
        const bundleId = res.bundleId.toString();
        const currentRevenue = bundleRevenueMapForUnderperforming.get(bundleId) || 0;
        bundleRevenueMapForUnderperforming.set(bundleId, currentRevenue + res.totalCost);
      }
    });

    const underperformingServices = services
      .filter(s => !serviceRevenueMapForUnderperforming.has(s._id.toString()))
      .map(s => ({ name: s.name, id: s._id, type: 'Service' }));

    const underperformingBundles = bundles
      .filter(b => !bundleRevenueMapForUnderperforming.has(b._id.toString()))
      .map(b => ({ name: b.name, id: b._id, type: 'Bundle' }));

    const underperformingItems = [...underperformingServices, ...underperformingBundles];
    const underperformingCategories = underperformingItems.map(item => `${item.name} (${item.type})`);
    const underperformingData = underperformingItems.map(() => 0);

    const underperforming = {
      categories: underperformingCategories,
      data: underperformingData
    };

    // 7. Top Customers by Revenue
    const customerRevenueMap = new Map();
    reservations.forEach(res => {
      if (res.customerId) {
        const customerId = res.customerId._id.toString();
        const currentRevenue = customerRevenueMap.get(customerId) || 0;
        customerRevenueMap.set(customerId, currentRevenue + res.totalCost);
      }
    });

    const userMap = new Map(users.map(u => [u._id.toString(), u.name]));
    const topCustomers = Array.from(customerRevenueMap.entries())
      .map(([customerId, revenue]) => ({
        name: userMap.get(customerId) || `Customer ${customerId}`,
        revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topCustomersData = {
      categories: topCustomers.length > 0 ? topCustomers.map(c => c.name) : ['No Data'],
      data: topCustomers.length > 0 ? topCustomers.map(c => c.revenue) : [0]
    };

    // 8. Low Customers by Revenue
    const lowCustomers = users
      .filter(user => !customerRevenueMap.has(user._id.toString()))
      .map(user => ({
        name: user.name,
        revenue: 0
      }))
      .slice(0, 5);

    const lowCustomersData = {
      categories: lowCustomers.length > 0 ? lowCustomers.map(c => c.name) : ['No Data'],
      data: lowCustomers.length > 0 ? lowCustomers.map(c => c.revenue) : [0]
    };

    // Send the aggregated data to the frontend
    res.json({
      revenueBreakdown,
      topServices,
      topBundles, // New section
      subscriptionPerformance,
      couponUsage,
      underperforming,
      topCustomers: topCustomersData,
      lowCustomers: lowCustomersData
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

module.exports = router;