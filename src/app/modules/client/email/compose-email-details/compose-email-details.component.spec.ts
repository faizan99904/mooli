import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComposeEmailDetailsComponent } from './compose-email-details.component';

describe('ComposeEmailDetailsComponent', () => {
  let component: ComposeEmailDetailsComponent;
  let fixture: ComponentFixture<ComposeEmailDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposeEmailDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComposeEmailDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
