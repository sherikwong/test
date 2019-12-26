import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge } from 'rxjs';
import { startWith, map, tap, withLatestFrom } from 'rxjs/operators';
import { hasUniqueEntry } from './util';

type ErrorMessage = string | ((controlName?: string, control?: AbstractControl, errorDetails?: { [key: string]: any }) => any);
type ControlErrorsMap = Map<string, string>;

interface FormGroupChanges {
  controlNames: string[];
  change: number;
  controls: any;
}

interface ErrorDetails {
  controlName: string;
  errorMessage: string;
}

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html'
})
export class ErrorSubscriptionComponent implements OnInit {
  formControlsErrors = new Map<string, ControlErrorsMap>();
  oldFormGroup: any;
  possibleErrorMessages: { [key: string]: ErrorMessage };
  allErrorObserv;
  formGroup: FormGroup;
  allErrorMessages: string[] = [];

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: ['ta', this.validator],
      control2: [null, Validators.compose([this.validator, Validators.required])]
    });

    this.possibleErrorMessages = {
      required: () => `This field is required`,
      Custom: 'Minimum length blah blah'
    };

    this.controlErrors(this.formGroup).subscribe(value => console.log(value));
  }


  controlErrors(formGroup: FormGroup) {
    // Possible errors at global level? Do we want separation of concern? doing so many things.
    if (!this.oldFormGroup) this.oldFormGroup = formGroup.value;
    this.allErrorObserv = this.createErrorMessageObservables(formGroup.controls);

    const allSubscriptions = this.formGroupControlsChanged(formGroup).pipe(
      tap((formChanges: FormGroupChanges) => {
        if (formChanges && formChanges.change) {
          if (formChanges.change >= 1) {
            const newObservers = this.createErrorMessageObservables(formChanges.controls);
            this.allErrorObserv = merge(this.allErrorObserv, newObservers);
          }
        }
      }),
      withLatestFrom(this.allErrorObserv),
      map(([change, controls]) => controls)
    );

    return allSubscriptions;
  }

  private massageToLabelResult(observers) {
    return combineLatest(...observers).pipe(
      map(allErrors => {
        const updatedLabeledErrors = allErrors.reduce((accum, allControlErrors: ErrorDetails[]) => {
          const currentControlErrorMessages = allControlErrors.reduce((dummyAccum, {controlName, errorMessage}: ErrorDetails) => {
            dummyAccum[controlName] = dummyAccum[controlName] ? [...dummyAccum[controlName], errorMessage] : [errorMessage];
            return dummyAccum;
          }, {} as any);
          return {...accum, ...currentControlErrorMessages};
        }, {});
        return updatedLabeledErrors;
      })
    )
  }

  private createErrorMessageObservables(formControls: { [key: string]: FormControl | AbstractControl }): Observable<any> {
    const errorMessagesEntries = Object.entries(this.possibleErrorMessages);
    const formControlEntries = Object.entries(formControls);

    let newObservables;
    
    if (errorMessagesEntries.length || formControlEntries.length) { // If required parameters exist...
      newObservables = [...formControlEntries].map(([controlName, control]) => { // Loop through form controls
        return this.createErrorMessageObservable(controlName, control);
      });
      return this.massageToLabelResult(newObservables);
    }
  }

  private createErrorMessageObservable(controlName: string, control: AbstractControl): Observable<ErrorDetails[]> {
    return control && control.statusChanges.pipe( // Pipe each status change observable from form controls
      startWith(control.valid ? 'VALID' : 'INVALID'), // Feign first response otherwise first touch change will not be registered
      map(() => {
        if (!control.valid) {
          this.formControlsErrors.set(controlName, new Map());

          Object.entries(control.errors).forEach(([errorName, errorDetails]) => { // Loop through current control's errors
            let errorMessage = '';
            const associatedErrorValue = this.possibleErrorMessages[errorName as string];

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

        const controlErrors = Array.from(this.formControlsErrors.get(controlName)).map(([errorName, error]) => { // Get the errors for this control
          this.allErrorMessages.push(error);
          return { controlName, errorMessage: error } as ErrorDetails; // For each control error, format like so
        });
        return controlErrors;
      })
    )
  }

  formGroupControlsChanged(formGroup: FormGroup): Observable<FormGroupChanges> {
    return formGroup.valueChanges.pipe(
      map(newFormGroup => {
        const oldFormControlNames = Object.keys(this.oldFormGroup);
        const newFormControlNames = Object.keys(newFormGroup);

        const response = {
          change: null,
          controlNames: null,
          controls: null
        } as FormGroupChanges;

        if (oldFormControlNames.length !== newFormControlNames.length) {
          const newFormControlsNames = hasUniqueEntry(oldFormControlNames, newFormControlNames);
          if (newFormControlsNames.length) {
            if (oldFormControlNames.length < newFormControlNames.length) {
              console.log('New controls added:', newFormControlsNames);
              response.change = 1;
            } else if (oldFormControlNames.length > newFormControlNames.length) {
              console.log('Controls deleted:', newFormControlsNames);
              response.change = -1;
            } else {
              console.log('Changes made:', newFormControlsNames);
              response.change = 0;
            }
            this.oldFormGroup = newFormGroup;
            response.controlNames = newFormControlNames;
            response.controls = newFormControlNames.reduce((accum, controlName) => ({...accum, [controlName]: formGroup.get(controlName)}), {});
            return response;
          }
        }
        return null;
      }),
    );
  }

  validator(): ValidationErrors {
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

  // addControl() {+
    ZA
  //   this.formGroup.addControl(`control${Object.keys(this.formGroup.controls).length + 1}`, new FormControl(null, this.validator));
  // }

  addControl() {
    const num = 1;
    new Array(num).fill(null).forEach(() => {
      const numControl = Object.keys(this.formGroup.controls).length + 1;
      this.formGroup.addControl(`control${numControl}`, new FormControl(null, this.validator));
      this.formGroup.get(`control${numControl}`).setErrors(this.validator);
    });
  }

  deleteControl(name) {
    console.log(`Deleted ${name}`);
    this.formGroup.removeControl(name);
  }


}
