import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllotedRoomsComponent } from './alloted-rooms.component';

describe('AllotedRoomsComponent', () => {
  let component: AllotedRoomsComponent;
  let fixture: ComponentFixture<AllotedRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllotedRoomsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllotedRoomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
