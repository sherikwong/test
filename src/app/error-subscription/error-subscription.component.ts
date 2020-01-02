import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscription, Subject, iif, of, empty, concat, zip, forkJoin } from 'rxjs';
import { startWith, map, tap, withLatestFrom, filter, scan, switchMap, mergeMap, count, exhaustMap, mergeAll, concatMap, flatMap, combineAll, reduce, take } from 'rxjs/operators';
import { binarySearchArrays } from './util';
import { ChangeDetectorStatus } from '@angular/core/src/change_detection/constants';

export type IFormValidatorErrorFn = (name: any, control: FormControl) => string

export type FormControlErrorMessageFn = ((params: FormControlErrorMessages) => any);
type FormControlErrorsMap = Map<string, string>;

export interface FormControlErrorMessages {
    [controlName: string]: { [errorName: string]: string }
}

interface FormControlErrorMessage {
    controlName: string;
    errorName: string;
    control: AbstractControl;
    value: any;
    errorDetails: {[key: string]: any};
}

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html'
})
export class ErrorSubscriptionComponent implements OnInit {
  formControlsErrors = new Map<string, ControlErrorsMap>();
  oldFormGroup: any;
  possibleErrorMessages: { [key: string]: ErrorMessage };
  errorObservMap = {};
  formGroup: FormGroup;
  formErrors: Subject<any> = new Subject();
  counter = 0;
  subscription;
  blah;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: ['ta', this.validator],
      control2: [null, Validators.compose([this.validator, Validators.required])]
    });

    this.possibleErrorMessages = {
      required: () => `This field is required`,
      Custom: 'Minimum length blah blah',
      minLength: 'lasfjasl',
      la: 'asofiahjsfoij'
    };

    this.subscription = this.errorMessages(this.formGroup).subscribe(value => { console.log('Final result', value); console.log('======================='); this.blah = value; });
  }

  restart() {
    this.subscription.unsubscribe();
    this.ngOnInit();
  }

  getErrorMessages(formGroup: FormGroup, allErrorFnObj: {[errorName: string]: string | FormControlErrorMessageFn} ) {    
    return Object.entries(formGroup.controls).reduce((accumMessages, [controlName, control]) => {
      const thisControlErrors = formGroup.get(controlName).errors;
      if (thisControlErrors) {
        
        const reducedEvaluatedErrors: Map<string, string> = Object.entries(thisControlErrors).reduce((thisControlErrorMessages, [errorName, errorDetails]) => {
          const errorMessageParams: FormControlErrorMessage = {
            controlName,
            control,
            value: control.value,
            errorName,
            errorDetails
          };
          
          const evaluatedMessage = typeof allErrorFnObj[controlName] === 'function' ? (allErrorFnObj[controlName] as FormControlErrorMessageFn)(errorMessageParams) : allErrorFnObj[controlName];
          
          thisControlErrorMessages.set(errorName, allErrorFnObj[controlName](errorMessageParams));
          return thisControlErrorMessages;
        }, new Map());
        
        accumMessages.set(controlName, reducedEvaluatedErrors);
        return accumMessages;
      }
    }, new Map<string, Map<string, string>>());
  }
  

  errorMessages(formGroup) {
    if (!this.oldFormGroup) this.oldFormGroup = formGroup.value;

    let previousObserv;

    const createObservs = () => combineLatest(...Object.entries(formGroup.controls).map(([controlName, control]) => this.createErrorMessageObservable(controlName, control as AbstractControl)));

    return createObservs().pipe(
      withLatestFrom(this.formGroupControlsChanged(formGroup))
    );

    // return combineAll(this.formGroupControlsChanged(formGroup), createObservs()).pipe(
      // map(response => {console.log(response); return response;}),
      // switchMap((value) => {
        // console.log(value);
        // return of(['', '']);
      // })
      // switchMap((response: any) => {
        // console.log(response);
        // if (changes && (changes.added || changes.deleted)) return createObservs();
        // return of(errors);
        // return of('')
      // }),
      // map(errors => this.massageOutput(errors))
    // )
  }


  private formGroupControlsChanged(formGroup: FormGroup): Observable<FormGroupChanges> {
    const oldFormControlNames = Object.keys(this.oldFormGroup);

    return formGroup.valueChanges.pipe(
      startWith({}),
      map(newFormGroup => {
        const newFormControlNames = Object.keys(newFormGroup);

        const changedControls = {
          deleted: null,
          added: null
        } as FormGroupChanges;

        if (oldFormControlNames.length !== newFormControlNames.length) { // If the formGroups are different
          if (newFormControlNames.length) {
            if (oldFormControlNames.length < newFormControlNames.length) {
              changedControls.added = binarySearchArrays(oldFormControlNames, newFormControlNames)[0];
            } else if (oldFormControlNames.length > newFormControlNames.length) {
              changedControls.deleted = binarySearchArrays(oldFormControlNames, newFormControlNames, false)[0];
            }
            this.oldFormGroup = newFormGroup;
          }
          return changedControls;
        }
        return null;
      })
    )
  }

  private massageOutput(errors): any {
    return errors.reduce((accum, allControlErrors: ErrorDetails[]) => {
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

  private labelControlErrors(errors: any[]) {
    return errors.reduce((dummyAccum, { controlName, errorMessage }: ErrorDetails) => {
      dummyAccum[controlName] = dummyAccum[controlName] ? [...dummyAccum[controlName], errorMessage] : [errorMessage];
      return dummyAccum;
    }, {} as any);
  }

  private createErrorMessageObservable(controlName: string, control: AbstractControl): Observable<any[]> {
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
          return { controlName, value: control.value }; // For each control error, format like so
          // return { controlName, errorMessage: error } as ErrorDetails; // For each control error, format like so
        });
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

  validators(): ValidationErrors {
    return {
      'La': {
        valid: false,
        invalid: true
      }
    };
  }

  check() {
    console.log(this.formGroup.controls);
    console.log(this.blah);
  }

  addControl() {
    const num = 1;
    new Array(num).fill(null).forEach(() => {
      const numControl = Object.keys(this.formGroup.controls).length + 1;
      const control = this.fb.control('', Validators.compose([this.validator, Validators.required]));
      this.formGroup.addControl(`control${numControl}`, control);
    });
  }

  deleteControl(name) {
    console.log(`Deleted control in form group -  ${name}`);
    this.formGroup.removeControl(name);
  }
}
