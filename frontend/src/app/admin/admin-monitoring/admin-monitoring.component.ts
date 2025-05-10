import { Component, OnInit } from '@angular/core';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ApiService } from '../../shared/api.service';
import { DashboardData } from '../../shared/models';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-monitoring',
  standalone: true,
  imports: [HighchartsChartModule, FormsModule, CommonModule],
  templateUrl: './admin-monitoring.component.html',
  styleUrls: ['./admin-monitoring.component.scss']
})
export class AdminMonitoringComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  updateFlag = false;
  selectedTimePeriod: string = 'monthly';

  revenueBreakdownChartOptions: Highcharts.Options = {
    chart: { type: 'pie', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Revenue Breakdown by Source', style: { color: '#333', fontSize: '18px' } },
    tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b> (TND {point.y:,.0f})' },
    accessibility: { enabled: false },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.1f}%',
          style: { color: '#333', fontSize: '12px' }
        },
        colors: ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1']
      }
    },
    series: [{ type: 'pie', name: 'Revenue', data: [] }],
    credits: { enabled: false }
  };

  topServicesChartOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Top Performing Services', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Service', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'bar', name: 'Revenue', data: [], color: '#FFCC99' }],
    credits: { enabled: false }
  };

  topBundlesChartOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Top Performing Bundles', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Bundle', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'bar', name: 'Revenue', data: [], color: '#FF99CC' }],
    credits: { enabled: false }
  };

  subscriptionPerformanceChartOptions: Highcharts.Options = {
    chart: { type: 'column', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Subscription Plan Performance', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Plan', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'column', name: 'Revenue', data: [], color: '#CC99FF' }],
    credits: { enabled: false }
  };

  couponUsageChartOptions: Highcharts.Options = {
    chart: { type: 'line', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Coupon Usage Trends', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Coupon Code', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Uses', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Uses: <b>{point.y}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'line', name: 'Uses', data: [], color: '#FF99CC', marker: { enabled: true } }],
    credits: { enabled: false }
  };

  underperformingChartOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Underperforming Services/Bundles', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Service/Bundle', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'bar', name: 'Revenue', data: [], color: '#FF6666' }],
    credits: { enabled: false }
  };

  topCustomersChartOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Top Customers by Revenue', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Customer', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'bar', name: 'Revenue', data: [], color: '#66CCCC' }],
    credits: { enabled: false }
  };

  lowCustomersChartOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Arial, sans-serif' } },
    title: { text: 'Low Customers by Revenue', style: { color: '#333', fontSize: '18px' } },
    xAxis: { 
      categories: [], 
      title: { text: 'Customer', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    yAxis: { 
      title: { text: 'Revenue (TND)', style: { color: '#666' } },
      labels: { style: { color: '#666', fontSize: '12px' } }
    },
    tooltip: { pointFormat: 'Revenue: <b>TND {point.y:,.0f}</b>' },
    accessibility: { enabled: false },
    series: [{ type: 'bar', name: 'Revenue', data: [], color: '#FF9966' }],
    credits: { enabled: false }
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    Highcharts.setOptions({ lang: { thousandsSep: ',' } });
    this.fetchData();
  }

  fetchData(): void {
    this.apiService.get<DashboardData>(`monitoring?period=${this.selectedTimePeriod}`).subscribe({
      next: (data) => {
        console.log('Dashboard data received:', data);

        this.revenueBreakdownChartOptions = {
          ...this.revenueBreakdownChartOptions,
          series: [{
            type: 'pie',
            name: 'Revenue',
            data: data.revenueBreakdown
          }]
        };

        this.topServicesChartOptions = {
          ...this.topServicesChartOptions,
          xAxis: { categories: data.topServices.categories, title: { text: 'Service' } },
          series: [{ type: 'bar', name: 'Revenue', data: data.topServices.data, color: '#FFCC99' }]
        };

        this.topBundlesChartOptions = {
          ...this.topBundlesChartOptions,
          xAxis: { categories: data.topBundles.categories, title: { text: 'Bundle' } },
          series: [{ type: 'bar', name: 'Revenue', data: data.topBundles.data, color: '#FF99CC' }]
        };

        this.subscriptionPerformanceChartOptions = {
          ...this.subscriptionPerformanceChartOptions,
          xAxis: { categories: data.subscriptionPerformance.categories, title: { text: 'Plan' } },
          series: [{ type: 'column', name: 'Revenue', data: data.subscriptionPerformance.data, color: '#CC99FF' }]
        };

        this.couponUsageChartOptions = {
          ...this.couponUsageChartOptions,
          xAxis: { categories: data.couponUsage.categories, title: { text: 'Coupon Code' } },
          series: [{ type: 'line', name: 'Uses', data: data.couponUsage.data, color: '#FF99CC' }]
        };

        this.underperformingChartOptions = {
          ...this.underperformingChartOptions,
          xAxis: { categories: data.underperforming.categories, title: { text: 'Service/Bundle' } },
          series: [{ type: 'bar', name: 'Revenue', data: data.underperforming.data, color: '#FF6666' }]
        };

        this.topCustomersChartOptions = {
          ...this.topCustomersChartOptions,
          xAxis: { categories: data.topCustomers.categories, title: { text: 'Customer' } },
          series: [{ type: 'bar', name: 'Revenue', data: data.topCustomers.data, color: '#66CCCC' }]
        };

        this.lowCustomersChartOptions = {
          ...this.lowCustomersChartOptions,
          xAxis: { categories: data.lowCustomers.categories, title: { text: 'Customer' } },
          series: [{ type: 'bar', name: 'Revenue', data: data.lowCustomers.data, color: '#FF9966' }]
        };

        setTimeout(() => {
          this.updateFlag = true;
        }, 0);
      },
      error: (error) => {
        console.error('Error fetching dashboard data:', error);
      }
    });
  }

  updateCharts(): void {
    this.fetchData();
  }
}