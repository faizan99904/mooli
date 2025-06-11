import { Component, ViewChild } from '@angular/core';
import {
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexChart,
  ApexFill,
  ApexDataLabels,
  ApexLegend,
  ChartComponent,
  NgApexchartsModule
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  fill: ApexFill;
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
};

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss']
})
export class PieChartComponent {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: ChartOptions;

  constructor() {
    this.chartOptions = {
      series: [20, 50, 30],
      chart: {
        width: '100%', // Full width
        type: "donut"
      },
      dataLabels: {
        enabled: true
      },
      fill: {
        type: "fill",
        colors: ["#2C83B6", "#9367B4", "#A5D8A2"],
      },
      legend: {
        formatter: function (val, opts) {
          return opts.w.globals.series[opts.seriesIndex].toString();
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: '100%' // Also full width on small screens
            },
            legend: {
              enabled: false
            }
          }
        }
      ]
    };
  }
}
