import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscription, Subject, iif, of } from 'rxjs';
import { startWith, map, tap, withLatestFrom, filter, scan, switchMap, mergeMap } from 'rxjs/operators';
import { binarySearchArrays } from './util';
import { ChangeDetectorStatus } from '@angular/core/src/change_detection/constants';

type ErrorMessage = string | ((controlName?: string, control?: AbstractControl, errorDetails?: { [key: string]: any }) => any);
type ControlErrorsMap = Map<string, string>;

interface FormGroupChanges {
  deleted: string;
  added: string;
}

interface ErrorDetails {
  controlName: string;
  errorMessage: string;
}

interface ErrorMessageObservables {
  old: { [key: string]: Observable<any> };
  new: { [key: string]: Observable<any> };
}

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html'
})
export class ErrorSubscriptionComponent implements OnInit {
  formControlsErrors = new Map<string, ControlErrorsMap>();
  oldFormGroup: any;
  possibleErrorMessages: { [key: string]: ErrorMessage };
  errorObservMap = { new: {}, old: {} } as ErrorMessageObservables;
  formGroup: FormGroup;
  formErrors: Subject<any> = new Subject();
  counter = 0;

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

    this.errorMessages(this.formGroup).subscribe(value => console.log('Final result', value));
  }


  errorMessages(formGroup: FormGroup) {
    if (!this.oldFormGroup) this.oldFormGroup = formGroup.value;
    Object.entries(formGroup.controls).forEach(([controlName, control]) => {
      this.counter++;
      console.log(this.counter, 'Setting for the first time', controlName)
      this.errorObservMap.new[controlName] = this.createErrorMessageObservable(controlName, control);
    });


    return combineLatest(this.formGroupControlsChanged(formGroup), ...Object.values(this.errorObservMap.new)).pipe(
      map(([changes, errors]) => {
        if (changes) {
          this.errorObservMap.old = { ...this.errorObservMap.new, ...this.errorObservMap.new };
          this.errorObservMap.new = {};

          if (changes.added) {
            console.log('Adding new observable to map', changes.added);
            this.errorObservMap.new[changes.added] = this.createErrorMessageObservable(changes.added, this.formGroup.get(changes.added));
          } else if (changes.deleted) {
            console.log('Deleting observable from map', changes.deleted);
            delete this.errorObservMap[changes.deleted];
          }
          return combineLatest(...Object.values(this.errorObservMap.new));
        } else {
          console.log('Errors no changes', errors);
          return of(errors);
        }
      }),
      map(errors => {
        console.log(errors);
        return this.massageOutput(errors);
      })
    );
  }

  private formGroupControlsChanged(formGroup: FormGroup): Observable<FormGroupChanges> {
    return formGroup.valueChanges.pipe(
      map(newFormGroup => {
        this.counter++;
        const oldFormControlNames = Object.keys(this.oldFormGroup);
        const newFormControlNames = Object.keys(newFormGroup);

        const changedControls = {
          deleted: null,
          added: null
        } as FormGroupChanges;

        if (oldFormControlNames.length !== newFormControlNames.length) {
          if (newFormControlNames.length) {
            if (oldFormControlNames.length < newFormControlNames.length) {
              changedControls.added = binarySearchArrays(oldFormControlNames, newFormControlNames)[0];
            } else if (oldFormControlNames.length > newFormControlNames.length) {
              changedControls.deleted = binarySearchArrays(oldFormControlNames, newFormControlNames, false)[0];
            }
            this.oldFormGroup = newFormGroup;
          }
        }
        return changedControls;
      }),
    );
  }

  // private createCombinedErrorMessageObservable(formControls: { [key: string]: FormControl | AbstractControl }): Observable<any> {
  //   // console.log('Creating error message observables for', Object.keys(formControls));
  //   const formControlEntries = Object.entries(formControls);
  //   const errorMessagesEntries = Object.entries(this.possibleErrorMessages);

  //   if (errorMessagesEntries.length || formControlEntries.length) { // If required parameters exist...
  //     // const newObservables = [...formControlEntries].reduce((accum, [controlName, control]) => { // Loop through form controls
  //     //   return { ...accum, [controlName]: this.createErrorMessageObservable(controlName, control) };
  //     // }, {});

  //     const newObservables = [...formControlEntries].map(([controlName, control]) => this.createErrorMessageObservable(controlName, control));
  //     return combineLatest(...newObservables).pipe(
  //       map(allErrors => {
  //         const updatedLabeledErrors = allErrors.reduce((accum, allControlErrors: ErrorDetails[]) => {
  //           const currentControlErrorMessages = allControlErrors.reduce((dummyAccum, { controlName, errorMessage }: ErrorDetails) => {
  //             dummyAccum[controlName] = dummyAccum[controlName] ? [...dummyAccum[controlName], errorMessage] : [errorMessage];
  //             return dummyAccum;
  //           }, {} as any);
  //           return { ...accum, ...currentControlErrorMessages };
  //         }, {});
  //         return updatedLabeledErrors;
  //       })
  //     );
  //   }
  //   return null;
  // }

  private massageOutput(errors): any {
    return errors.reduce((accum, allControlErrors: ErrorDetails[]) => {
      this.counter++;
      console.log(this.counter, 'Massaging', errors);
      if (allControlErrors && allControlErrors.length) {
        const currentControlErrorMessages = allControlErrors.reduce((dummyAccum, { controlName, errorMessage }: ErrorDetails) => {
          dummyAccum[controlName] = dummyAccum[controlName] ? [...dummyAccum[controlName], errorMessage] : [errorMessage];
          return dummyAccum;
        }, {} as any);
        return { ...accum, ...currentControlErrorMessages };
      }
      return accum;
    }, {});
  }

  private createErrorMessageObservable(controlName: string, control: AbstractControl): Observable<ErrorDetails[]> {
    return control && control.statusChanges.pipe( // Pipe each status change observable from form controls
      startWith(control.valid ? 'VALID' : 'INVALID'), // Feign first response otherwise first touch change will not be registered
      map(() => {
        this.counter++;
        console.log(this.counter, 'Creating observable for', controlName);
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
          return { controlName, errorMessage: error } as ErrorDetails; // For each control error, format like so
        });
        // console.log('Control error evaluated for', controlName, controlErrors);
        return controlErrors;
      })
    )
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
