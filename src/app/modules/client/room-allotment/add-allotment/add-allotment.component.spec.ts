import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAllotmentComponent } from './add-allotment.component';

describe('AddAllotmentComponent', () => {
  let component: AddAllotmentComponent;
  let fixture: ComponentFixture<AddAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAllotmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
