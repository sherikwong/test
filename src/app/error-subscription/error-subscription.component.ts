import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, AbstractControl, Validators, ValidationErrors, FormControl } from '@angular/forms';
import { combineLatest, Observable, merge, Subscription, Subject, iif, of, empty, concat, zip, forkJoin } from 'rxjs';
import { startWith, map, tap, withLatestFrom, filter, scan, switchMap, mergeMap, count, exhaustMap, mergeAll, concatMap, flatMap, combineAll, reduce, take } from 'rxjs/operators';
import { binarySearchArrays } from './util';
import { ChangeDetectorStatus } from '@angular/core/src/change_detection/constants';

export type FormControlErrorMessageFn = ((params: FormControlErrorMessageParams) => string);

export interface FormControlErrorMessageEval {
  [errorName: string]: string | FormControlErrorMessageFn;
}

export type FormControlErrorMessages = {
  [controlName: string]: {
    [errorName: string]: string;
  }
}

interface FormControlErrorMessageParams {
  controlName: string;
  errorName: string;
  control: AbstractControl;
  value: any;
  errorDetails: { [key: string]: any };
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

    const errorEvaluations: FormControlErrorMessageEval = {
      required: ({ controlName }) => `The ${controlName} field is required`,
      'Custom': ({controlName, value}) => `This control(${controlName})'s ${value} is custom`

    };
    
    this.formGroup.valueChanges.subscribe(value => {
      this.errorMessages = this.getErrorMessages(this.formGroup, errorEvaluations);
      console.log(this.errorMessages);
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
  getErrorMessages(formGroup: FormGroup, allErrorFnObj: { [errorName: string]: string | FormControlErrorMessageFn }) {
    const allMessagesObj: FormControlErrorMessages = Object.entries(formGroup.controls).reduce((allMessages, [controlName, control]) => {
      const thisControlErrors = formGroup.get(controlName).errors;
      if (thisControlErrors) {

        const reducedEvaluatedErrors: {[errorName: string]: string} = Object.entries(thisControlErrors).reduce((thisControlErrorMessages, [errorName, errorDetails]) => {
          const errorMessageParams: FormControlErrorMessageParams = {
            controlName,
            control,
            value: control.value,
            errorName,
            errorDetails
          };

          const evaluatedMessage = typeof allErrorFnObj[errorName] === 'function' ? (allErrorFnObj[errorName] as FormControlErrorMessageFn)(errorMessageParams) : allErrorFnObj[errorName];
          thisControlErrorMessages[errorName] = evaluatedMessage;
          return thisControlErrorMessages;
        }, {});

        allMessages[controlName] = reducedEvaluatedErrors;
        return allMessages;
      }
    }, {});
    return allMessagesObj;
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
