import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullcalenderComponent } from './fullcalender.component';

describe('FullcalenderComponent', () => {
  let component: FullcalenderComponent;
  let fixture: ComponentFixture<FullcalenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullcalenderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullcalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
