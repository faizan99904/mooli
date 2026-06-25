import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ApexDataLabels,
  ApexGrid,
  ApexTooltip,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import {
  buildSidebarVitalItems,
  buildVitalAlerts,
  buildVitalHistoryRows,
  buildVitalMiniCharts,
  buildVitalTrendVisits,
  filterVitalTrendVisitsByRange,
  getPatientAgeYears,
  SidebarVitalItem,
  VitalAlert,
  VitalHistoryRow,
  VitalMiniChartData,
  VitalStatus,
  VitalsTrendRange,
} from '../prescription/vitals-analytics';
import { forkJoin } from 'rxjs';
import { WardDataService } from './services/ward-data.service';

@Component({
  selector: 'app-ward-vitals-trends',
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './ward-vitals-trends.component.html',
  styleUrl: './ward-vitals-trends.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardVitalsTrendsComponent implements OnChanges {
  @Input() patientId = '';
  @Input() patientName = '';
  @Input() refreshToken = 0;
  @Output() recordVitals = new EventEmitter<void>();

  loading = false;
  sidebarVitalItems: SidebarVitalItem[] = [];
  vitalAlerts: VitalAlert[] = [];
  vitalMiniCharts: VitalMiniChartData[] = [];
  vitalHistoryRows: VitalHistoryRow[] = [];
  vitalsTrendRange: VitalsTrendRange = '1m';

  readonly vitalsTrendRanges: Array<{ key: VitalsTrendRange; label: string }> = [
    { key: '7d', label: '7 Days' },
    { key: '1m', label: '1 Month' },
    { key: '3m', label: '3 Months' },
    { key: '6m', label: '6 Months' },
  ];

  readonly vitalChartSharedYAxis: ApexYAxis = {
    labels: {
      style: { fontSize: '10px', colors: '#94a3b8' },
    },
  };
  readonly vitalChartSharedGrid: ApexGrid = {
    borderColor: '#eef2f7',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 8, right: 8 },
  };
  readonly vitalChartSharedDataLabels: ApexDataLabels = { enabled: false };
  readonly vitalChartSharedTooltip: ApexTooltip = {
    theme: 'light',
    x: { show: true },
  };

  constructor(
    private wardData: WardDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] || changes['refreshToken']) {
      this.loadVitals();
    }
  }

  reload(): void {
    this.loadVitals();
  }

  setVitalsTrendRange(range: VitalsTrendRange): void {
    this.vitalsTrendRange = range;
    this.refreshAnalytics();
    this.cdr.markForCheck();
  }

  trackVitalChart(_index: number, chart: VitalMiniChartData): string {
    return chart.key;
  }

  historyTrendArrow(trend: 'up' | 'down' | 'flat' | 'none' | undefined): string {
    if (trend === 'up') {
      return '↑';
    }
    if (trend === 'down') {
      return '↓';
    }
    return '';
  }

  historyTrendClass(trend: 'up' | 'down' | 'flat' | 'none' | undefined): string {
    if (trend === 'up') {
      return 'up';
    }
    if (trend === 'down') {
      return 'down';
    }
    return 'flat';
  }

  vitalStatusClass(status: VitalStatus): string {
    return `vital-status-${status}`;
  }

  private timeline: Array<{ createdAt?: string; vitals: Record<string, string> }> = [];
  private patientAge: number | null = null;

  private loadVitals(): void {
    if (!this.patientId) {
      this.timeline = [];
      this.patientAge = null;
      this.refreshAnalytics();
      return;
    }

    this.loading = true;
    forkJoin({
      timeline: this.wardData.loadPatientVitalsTimeline(this.patientId),
      patient: this.wardData.findPatient(this.patientId),
    }).subscribe({
      next: ({ timeline, patient }) => {
        this.timeline = timeline;
        this.patientAge = getPatientAgeYears(patient?.dateOfBirth || null);
        this.refreshAnalytics();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.timeline = [];
        this.patientAge = null;
        this.refreshAnalytics();
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private refreshAnalytics(): void {
    const current = this.timeline[0]?.vitals || {};
    const previous = this.timeline[1]?.vitals || {};
    const visits = buildVitalTrendVisits(this.timeline);
    const filteredVisits = filterVitalTrendVisitsByRange(visits, this.vitalsTrendRange);

    this.sidebarVitalItems = buildSidebarVitalItems(current, previous, this.patientAge);
    this.vitalAlerts = buildVitalAlerts(this.sidebarVitalItems);
    this.vitalMiniCharts = buildVitalMiniCharts(filteredVisits, current, previous);
    this.vitalHistoryRows = buildVitalHistoryRows(filteredVisits, current);
  }
}
