import { Component, OnInit, OnChanges } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscribable } from 'rxjs';
import { EventEmitter } from 'events';
import { startWith, map as errorSubscription, scan, map, tap } from 'rxjs/operators';
import { all } from 'q';

type ErrorMessage = string | ((controlName: string, control: AbstractControl, errorDetails?: { [key: string]: any }) => any);
type ControlErrorsMap = Map<string, string>;

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html',
  styleUrls: ['./error-subscription.component.scss']
})
export class ErrorSubscriptionComponent implements OnInit {
  formControlsErrors = new Map<string, ControlErrorsMap>(); // All errors for controls w/ type Map<form control name, Map<error name, error message string>>
  oldFormGroup: any;
  formGroup: any;

  errorMessages: { [key: string]: ErrorMessage };


  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: ['ta', this.validator],
      control2: [null, Validators.compose([this.validator, Validators.required])]
    });

    this.formGroup.valueChanges.subscribe(value => this.formGroup);

    this.errorMessages = {
      required: (controlName: string, control: AbstractControl, errorDetails: { [key: string]: any }) => `This field is required`,
      Custom: 'Minimum length blah blah'
    };

    this.button();
  }

  button() {
    this.formGroup.valueChanges.pipe(
      map(newFormGroup => {
        this.intersection(this.oldFormGroup ? this.oldFormGroup : newFormGroup, newFormGroup);
        this.oldFormGroup = newFormGroup;
      }),
      // map(newFormGroup => {
      //   this.intersection(this.oldFormGroup ? this.oldFormGroup : newFormGroup, newFormGroup);
      // })
    ).subscribe(value => console.log(value));
    // this.update(this.oldFormGroup, this.errorMessages).subscribe(value => console.log(value));
  }

  // Edge case: If a form control is added later on?
  public update(formGroup: FormGroup, possibleErrorMessages, undefinedErrorMessage?: ErrorMessage) {
    

    // const errorMessagesEntries = Object.entries(possibleErrorMessages);
    // const formControlEntries = Object.entries(formGroup.controls);

    // if (errorMessagesEntries.length || formControlEntries.length) { // If required parameters exist...
    //   const allFormControlsErrors = new Map<string, ControlErrorsMap>(); // All errors for controls w/ type Map<form control name, Map<error name, error message string>>



    //   const errorSubscriptions: any[] = [...formControlEntries].map(([controlName, control]) => { // Loop through form controls
    //     return control && control.statusChanges.pipe( // Pipe each status change observable from form controls
    //       startWith(control.valid ? 'VALID' : 'INVALID'), // Feign first response otherwise first touch change will not be registered
    //       map(validityStatus => this.errorSubscription({ controlName, control, possibleErrorMessages }))
    //     )
    //   });


    //   return combineLatest(...errorSubscriptions);
    // }
    this.intersection(this.formGroup, formGroup)
  }


  // changesToFormGroupControls(formGroup: FormGroup) {
    // let oldControlsArray = Object.keys(this.oldFormGroup.controls).keys();
    // let newControlsArray = Object.keys(formGroup.controls).keys();
    // const lengthOld = Array.from(oldControlsArray).length;
    // const lengthNew = Array.from(newControlsArray).length;

    // let smallestNumControls;
    // let largestNumControls;

    // if (lengthOld > lengthNew) {
    //   let tempArray = oldControlsArray;
    //   oldControlsArray = newControlsArray;
    //   newControlsArray = tempArray;


    // }

    // smallestNumControls = smallestNumControls.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? ((a.toLowerCase() > b.toLowerCase()) ? 1 : 0) : -1); // Sort A-Z

    // const matchingControlNames = new Set(smallestNumControls);

    // let startIndex = 0;
    // let endIndex = largestNumControls.length - 1;

    // for 

  // }

  private intersection(arr1, arr2) {
    arr1 = arr1.length >= 0 ? arr1 : [...Object.keys(arr1)];
    arr2 = arr2.length >= 0 ? arr2 : [...Object.keys(arr2)];

    let length1 = arr1.length;
    let length2 = arr2.length;

    if (length1 > length2) {
      let tempp = arr1;
      arr1 = arr2;
      arr2 = tempp;

      let temp = length1;
      length1 = length2;
      length2 = temp;
    } else {
      let tempp = arr2;
      arr2 = arr1;
      arr1 = tempp;

      let temp = length2;
      length2 = length1;
      length1 = temp;
    }

    arr1 = arr1.sort((a, b) => a && b &&  a.toLowerCase() < b.toLowerCase() ? ((a.toLowerCase() > b.toLowerCase()) ? 1 : 0) : -1); // Sort A-Z

    for (let i = 0; i < length2; i++) {
      if (this.binarySearch(arr1, 0, length1 - 1, arr2[i]) !== -1) {
        console.log(arr2[i]);
      }
    }
  }

  private binarySearch(array, leftIndex, rightIndex, x) {
    console.log(array, leftIndex, rightIndex, x);
    if (rightIndex >= 1) {
      let mid = 1 + (rightIndex - 1) / 2;

      const middleEl = array[mid].toLowerCase();
      const currentEl = x.toLowerCase();

      if (middleEl === currentEl) return mid;
      if (middleEl > currentEl) return this.binarySearch(array, leftIndex, mid - 1, x);
      if (middleEl < currentEl) return this.binarySearch(array, leftIndex, mid + 1, x);

      return -1;
    }
  }


  errorSubscription(param) {
    const controlName = param.controlName;
    const possibleErrorMessages = param.possibleErrorMessages;
    const control = param.control;

    if (!control.valid) {
      this.formControlsErrors.set(controlName, new Map());

      Object.entries(control.errors).forEach(([errorName, errorDetails]) => { // Loop through current control's errors
        let errorMessage = '';
        const associatedErrorValue = possibleErrorMessages[errorName as string];

        const evaluateMessage = message => typeof associatedErrorValue === 'function' ? message(controlName, control, errorName, errorDetails) : message; // Evaluate error's value from possibleErrorMessages param

        if (associatedErrorValue) { // If the current control's error evaluation is exists incoming errorMessages

          errorMessage = evaluateMessage(associatedErrorValue); // If fn, evaluated. Otherwise, use string
          this.formControlsErrors.get(controlName).set(errorName, errorMessage);

        } else { // If error is not defined, use default or passed in error message

          const undefinedErrorMessage = (control) => `There was an error with the field ${controlName} with value ${control.value}`;
          this.formControlsErrors.get(controlName).set(undefined, undefinedErrorMessage(control));

        }
      })
    } else {
      if (!this.formControlsErrors.has(controlName)) this.formControlsErrors.delete(controlName); // If control is valid, delete existing map entry from 
    }

    return { name: controlName, errors: Array.from(this.formControlsErrors.get(controlName).values()) };
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
    console.log(this.formGroup.controls);
  }

  addControl() {
    this.formGroup.addControl('control3', new FormControl(false, this.validator));
  }
}

