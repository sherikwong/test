import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors } from '@angular/forms';
import { combineLatest, Observable, merge, Subscribable } from 'rxjs';
import { EventEmitter } from 'events';
import { startWith, map, scan } from 'rxjs/operators';
import { all } from 'q';

type ErrorMessage = string | ((controlName: string, control: AbstractControl, errorDetails?: { [key: string]: any }) => any);
type ControlErrorsMap = Map<string, string>;

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html',
  styleUrls: ['./error-subscription.component.scss']
})
export class ErrorSubscriptionComponent implements OnInit {
  formGroup: FormGroup;
  errorMessages: { [key: string]: ErrorMessage };


  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: ['ta', this.validator],
      control2: [null, Validators.compose([this.validator, Validators.required])]
    });

    // this.formGroup.valueChanges.subscribe(value => console.log(value));

    this.errorMessages = {
      required: (controlName: string, control: AbstractControl, errorDetails: { [key: string]: any }) => `This field is required`,
      Custom: 'Minimum length blah blah'
    };

    this.button();
  }

  button() {
    this.update(this.formGroup, this.errorMessages);
  }

  // Edge case: If a form control is added later on?

  public update(formGroup: FormGroup, errorMessages, undefinedErrorMessage?: ErrorMessage) {
    const errorMessagesEntries = Object.entries(errorMessages);
    const formControlEntries = Object.entries(formGroup.controls);

    if (errorMessagesEntries.length || formControlEntries.length) { // If required parameters exist...

      const allFormControlsErrors = new Map<string, ControlErrorsMap>(); // All errors for controls w/ type Map<form control name, Map<error name, error message string>>

      const subscriptions: any[] = [...formControlEntries].map(([controlName, control]) => { // Loop through form controls
        return control && control.statusChanges.pipe( // Pipe each status change observable from form controls
          startWith(control.valid ? 'VALID' : 'INVALID'), // Feign first response otherwise first touch change will not be registered
          map(validityStatus => {
            return this.mapSubscription(controlName, control, validityStatus, errorMessages, undefinedErrorMessage, allFormControlsErrors);           
          })
        )
      });


      combineLatest(...subscriptions).subscribe(result => {
        console.log(result);
      });
    }
  }

  mapSubscription(controlName, control, validityStatus, errorMessages, undefinedErrorMessage, allFormControlsErrors: Map<any, any>) {
    if (validityStatus === 'INVALID') {
      allFormControlsErrors.set(controlName, new Map());
      Object.entries(control.errors).forEach(([errorName, errorDetails]) => { // Loop through current control's errors
        let errorMessage = '';
        const associatedErrorValue = errorMessages[errorName as string];

        const evaluateMessage = message => typeof associatedErrorValue === 'function' ? message(controlName, control, errorName, errorDetails) : message; // Evaluate error's value from errorMessages param

        if (associatedErrorValue) { // If the current control's error evaluation is exists incoming errorMessages

          errorMessage = evaluateMessage(associatedErrorValue); // If fn, evaluated. Otherwise, use string
          allFormControlsErrors.get(controlName).set(errorName, errorMessage);

        } else { // If error is not defined, use default or passed in error message

          if (!undefinedErrorMessage) undefinedErrorMessage = (control) => `There was an error with the field ${controlName} with value ${control.value}`;
          errorMessage = evaluateMessage(undefinedErrorMessage);
          allFormControlsErrors.get(controlName).set(undefined, errorMessage);

        }
      })
    } else {
      if (!allFormControlsErrors.has(controlName)) allFormControlsErrors.delete(controlName); // If control is valid, delete existing map entry from 
    }

    return { name: controlName, errors: Array.from(allFormControlsErrors.get(controlName).values()) };

  }

  validator(control: AbstractControl): ValidationErrors {
    return {
      'Custom': {
        valid: false,
        invalid: true
      }
    };
  }

  check() {
    console.log(this.formGroup.controls.control2);
  }
}

