import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorSubscriptionComponent } from './error-subscription.component';

describe('ErrorSubscriptionComponent', () => {
  let component: ErrorSubscriptionComponent;
  let fixture: ComponentFixture<ErrorSubscriptionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ErrorSubscriptionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorSubscriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
