import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscription, Subject, iif, of, empty, concat, zip, forkJoin } from 'rxjs';
import { startWith, map, tap, withLatestFrom, filter, scan, switchMap, mergeMap, count, exhaustMap, mergeAll, concatMap, flatMap, combineAll, reduce, take } from 'rxjs/operators';
import { binarySearchArrays } from './util';
import { ChangeDetectorStatus } from '@angular/core/src/change_detection/constants';

export type FormControlErrorMessageFn = ((params: FormControlErrorMessageParams) => string);
export type FormControlErrorMessageEval = Map<any, string | FormControlErrorMessageFn>; // Map<ErrorName, errorString | errorStringFn>
export type FormControlErrorMessages = Map<any, Map<string, string>>; // Map<ControlName, <ErrorName, EvaluatedErrorMessage>>

export interface FormControlErrorMessageParams {
  controlName: string;
  errorName: string;
  errorMessage?: string;
  control?: AbstractControl;
  value?: any;
  [key: string]: any;
}

export interface FormControlErrorMessagesResponse {
  entries: FormControlErrorMessages;
  forEach: (cb: (params: FormControlErrorMessageParams) => void) => any;
  map: (cb: (params: FormControlErrorMessageParams) => void) => any[];
}

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html'
})
export class ErrorSubscriptionComponent implements OnInit {
  formGroup: FormGroup;
  formErrors: Subject<any> = new Subject();
  errorMessages;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: ['ta', this.validator],
      control2: [null, Validators.compose([this.validator, Validators.required])]
    });

    const errorMessageEval: FormControlErrorMessageEval = new Map([
      ['Custom', (params: FormControlErrorMessageParams) => `The effective date for ${params.controlName} is not a valid date`],
      ['required', (params: FormControlErrorMessageParams) => `The effective date for ${params.controlName} exceeds a year from today`]
    ]);

    this.formGroup.valueChanges.subscribe(value => {
      const errorMessages = this.getErrorMessages(this.formGroup, errorMessageEval);
      this.errorMessages = errorMessages;
      this.errorMessages.forEach((params: FormControlErrorMessageParams) => console.log(params.errorMessage));
      console.log(this.errorMessages.map((params: FormControlErrorMessageParams) => params.errorMessage));
    });
  }

  restart() {
    this.ngOnInit();
  }

  /**
   * Created to be used within a value/status form group subscription. Given a Map<errorName string, error string | (error params) => string>, output updated error messages
   * 
   * **Note:** This will not trigger on values initiated w/ form group at the same time. You must initate FormGroup, subscribe, and then update/patch value.
   * 
   * **Reminder:** DO NOT FORGET TO UNSUBSCRIBE TO CHANGES ON DESTROY!
   * @param formGroup 
   * @param allErrorFnObj 
   * 
   * 
   * @example ```javascript
   * this.formGroup.valueChanges.subscribe(value => {
   *   this.getErrorMessages(this.formGroup, {
   *     required: ({ controlName }) => `The ${controlName} field is required`,
   *   }) <--- Do something with this return
   * });
   * ```
   */
  getErrorMessages(formGroup: FormGroup, evalErrorFnMap: FormControlErrorMessageEval): FormControlErrorMessagesResponse {
    const allErrorStrings = new Set<FormControlErrorMessageParams>();
    
    const entries: FormControlErrorMessages = Object.entries(formGroup.controls).reduce((allMessages, [controlName, control]) => {
      const thisControlErrors = formGroup.get(controlName).errors;
      if (thisControlErrors) {

        const reducedEvaluatedErrors: Map<string, string> = Object.entries(thisControlErrors).reduce((thisControlErrorMessages, [errorName, errorDetails]) => {
          const errorMessageParams: FormControlErrorMessageParams = {
            controlName,
            control,
            value: control.value,
            errorName,
            ...errorDetails
          };

          const evaluationFn = evalErrorFnMap.get(errorName);
          const errorMessage = typeof evaluationFn === 'function' ? (evaluationFn as FormControlErrorMessageFn)(errorMessageParams) : evaluationFn;
          thisControlErrorMessages.set(errorName, errorMessage);
          allErrorStrings.add({
            errorMessage,
            errorName,
            controlName
          });
          return thisControlErrorMessages;
        }, new Map());

        allMessages.set(controlName, reducedEvaluatedErrors);
        return allMessages;
      }
    }, new Map());
    
    const forEach = (callback: (params: FormControlErrorMessageParams) => any) => allErrorStrings.forEach(value => callback(value));
    
    const map = (callback: (params: FormControlErrorMessageParams) => any) => {
      const returnArray = [];
      allErrorStrings.forEach(value => returnArray.push(callback(value)));
      return returnArray;
    };
    
    return { entries, forEach, map};
  }
  
  forEach(params: FormControlErrorMessageParams): any {
    console.log(params);
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
