import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorsProfileComponent } from './doctors-profile.component';

describe('DoctorsProfileComponent', () => {
  let component: DoctorsProfileComponent;
  let fixture: ComponentFixture<DoctorsProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorsProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorsProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
