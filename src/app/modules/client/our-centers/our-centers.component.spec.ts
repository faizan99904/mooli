import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OurCentersComponent } from './our-centers.component';

describe('OurCentersComponent', () => {
  let component: OurCentersComponent;
  let fixture: ComponentFixture<OurCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OurCentersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OurCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
