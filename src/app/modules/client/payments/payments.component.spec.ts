import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { PaymentsComponent } from './payments.component';

describe('PaymentsComponent', () => {
  let component: PaymentsComponent;
  let fixture: ComponentFixture<PaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        {
          provide: BackendService,
          useValue: {
            getPatientPaymentSummaries: () =>
              of({
                items: [],
                pagination: { page: 1, limit: 15, total: 0, totalPages: 0 },
              }),
            getPatientPaymentDetail: () =>
              of({
                patient: { _id: '1', patientNo: 'P1', firstName: 'Test', lastName: 'User' },
                totals: {
                  totalCharges: 0,
                  totalDiscount: 0,
                  netPayable: 0,
                  totalPaid: 0,
                  totalRefunded: 0,
                  balance: 0,
                },
                chargesBySource: {},
                remainingBySource: {},
                encounters: [],
                items: [],
                payments: [],
              }),
          },
        },
        {
          provide: ToastrService,
          useValue: {
            error: jasmine.createSpy('error'),
            success: jasmine.createSpy('success'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
