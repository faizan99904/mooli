import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddpaymentsComponent } from './addpayments.component';

describe('AddpaymentsComponent', () => {
  let component: AddpaymentsComponent;
  let fixture: ComponentFixture<AddpaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddpaymentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddpaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
