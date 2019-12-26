import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscription } from 'rxjs';
import { startWith, map, tap, withLatestFrom, filter } from 'rxjs/operators';
import { binarySearchArrays } from './util';

type ErrorMessage = string | ((controlName?: string, control?: AbstractControl, errorDetails?: { [key: string]: any }) => any);
type ControlErrorsMap = Map<string, string>;

interface FormGroupChanges {
  deleted: string[];
  added: string[];
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
  combinedErrorObserv: Observable<any>;
  formGroup: FormGroup;
  // allErrorMessages: Subscription;

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

    this.errorMessages(this.formGroup).subscribe(value => console.log(value));
  }


  errorMessages(formGroup: FormGroup) {
    if (!this.oldFormGroup) this.oldFormGroup = formGroup.value;
    this.combinedErrorObserv = this.createErrorMessageObservables(formGroup.controls);

    return this.formGroupControlsChanged(formGroup).pipe(
      tap(({ deleted, added }: FormGroupChanges) => {
        if (added) {
          const newObservers = this.createErrorMessageObservables(added.reduce((accum, controlName) => {
            accum[controlName] = this.formGroup.get(controlName);
            return accum;
          }, {}));
          this.combinedErrorObserv = merge(this.combinedErrorObserv, newObservers);
        } else if (deleted) {
          this.removeObservables(deleted);
        }
      }),
      withLatestFrom(this.combinedErrorObserv),
      map(([change, controls]) => controls)
    );
  }

  private massageToLabelResult(observers) {
    return combineLatest(...observers).pipe(
      map(allErrors => {
        const updatedLabeledErrors = allErrors.reduce((accum, allControlErrors: ErrorDetails[]) => {
          const currentControlErrorMessages = allControlErrors.reduce((dummyAccum, { controlName, errorMessage }: ErrorDetails) => {
            dummyAccum[controlName] = dummyAccum[controlName] ? [...dummyAccum[controlName], errorMessage] : [errorMessage];
            return dummyAccum;
          }, {} as any);
          return { ...accum, ...currentControlErrorMessages };
        }, {});
        return updatedLabeledErrors;
      })
    )
  }

  private removeObservables(controlNames: string[]): void {
    console.log(`Deleted observables for -  ${controlNames.join(' ')}`);
    controlNames.forEach((controlName: string) => {
      this.combinedErrorObserv = this.combinedErrorObserv.pipe(
        filter(value => {
          return value;
        })
      )
    });
  }

  private createErrorMessageObservables(formControls: { [key: string]: FormControl | AbstractControl }): Observable<any> {
    const formControlEntries = Object.entries(formControls);

    const errorMessagesEntries = Object.entries(this.possibleErrorMessages);

    let newObservables;

    if (errorMessagesEntries.length || formControlEntries.length) { // If required parameters exist...
      newObservables = [...formControlEntries].map(([controlName, control]) => { // Loop through form controls
        return { ...this.createErrorMessageObservable(controlName, control), controlName };
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
          // this.allErrorMessages.push(error);
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

        const changedControls = {
          deleted: null,
          added: null
        } as FormGroupChanges;

        if (oldFormControlNames.length !== newFormControlNames.length) {


          if (newFormControlNames.length) {
            if (oldFormControlNames.length < newFormControlNames.length) {
              changedControls.added = binarySearchArrays(oldFormControlNames, newFormControlNames);
              console.log('New controls added:', changedControls.added);
            } else if (oldFormControlNames.length > newFormControlNames.length) {
              changedControls.deleted = binarySearchArrays(oldFormControlNames, newFormControlNames, true);
            }
            this.oldFormGroup = newFormGroup;
            console.log(changedControls);
            return changedControls;
          }
        }
        return changedControls;
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

  addControl() {
    const num = 1;
    new Array(num).fill(null).forEach(() => {
      const numControl = Object.keys(this.formGroup.controls).length + 1;
      this.formGroup.addControl(`control${numControl}`, new FormControl(null, this.validator));
      this.formGroup.get(`control${numControl}`).setErrors(Validators.compose([this.validator, Validators.required]));
    });
  }

  deleteControl(name) {
    console.log(`Deleted control in form group -  ${name}`);
    this.formGroup.removeControl(name);
  }
}
