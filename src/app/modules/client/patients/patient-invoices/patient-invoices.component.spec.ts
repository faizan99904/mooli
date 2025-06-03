import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientInvoicesComponent } from './patient-invoices.component';

describe('PatientInvoicesComponent', () => {
  let component: PatientInvoicesComponent;
  let fixture: ComponentFixture<PatientInvoicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientInvoicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientInvoicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
