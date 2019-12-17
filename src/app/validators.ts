import { ValidatorFn, FormControl, ValidationErrors } from '@angular/forms';
import { Inject, InjectionToken } from '@angular/core';
import { unitOfTime } from 'moment';
import * as _moment from 'moment';
const moment = _moment;



export class DateValidatorService {
  constructor(  ) {
    this.elapsedTimeExceeded = this.elapsedTimeExceeded.bind(this);
    this.isValid = this.isValid.bind(this);
  }

  /**
   * Given a value, check to see if, from given end time, it elapses more than the default or otherwise defined maxUnits
   * Intended to use w/ form control w/ value of type Date | NgbDateStruct | IDateStruct | string
   * @param maxUnits {number}
   * @link https://angular.io/guide/form-validation#custom-validators
   * @example new FormControl(new Date(), formvalidator.validators.date.elapsedTimeExceeded('months', 3));
   * @example this.fb.control(new date(), [formvalidator.validators.date.elapsedTimeExceeded('months', 3)]);
   */

  public ELAPSED_TIME_EXCEEDED = 'elapsedTimeExceeded';

  public elapsedTimeExceeded(unitOfTime?: unitOfTime.Diff, maxUnits?: number, endTime?: any): ValidatorFn {
    unitOfTime = unitOfTime ? unitOfTime : 'days';
    maxUnits = maxUnits ? maxUnits : 365;
    endTime = new Date();

    /*
    If endTime:
    - isn't given, use default today's date
    - is of type Date object, use passed in value
    - is not type Date object, convert to Date object
    */

      return (control: FormControl): ValidationErrors => {
        const value = control.value;
        if (value && this.canConvertToValidDateObject(value)) {
          const difference = moment(endTime).diff(moment(value), unitOfTime);

          return (!isNaN(difference) && difference > maxUnits) ?
            {
              [this.ELAPSED_TIME_EXCEEDED]: {
                invalid: true,
                valid: false,
                difference,
                unitOfTime,
                maxUnits,
                endTime
              }
            } : null
        }
    }
  }

  /**
   * Checks to see if the value is a valid date
   * Intended to use w/ form control
   * @link https://angular.io/guide/form-validation#custom-validators
   * @example new FormControl(new Date(), formvalidator.validators.date.isvValid);
   * @example this.fb.control(new date(), [formvalidator.validators.date.isValid]);
   */

  public IS_VALID = 'dateInvalid';

  public isValid(control: FormControl): ValidationErrors {
    const value = control.value;
    if (value) {
      return (this.canConvertToValidDateObject(value) && moment(value).isValid()) ? null : {
        [this.IS_VALID]: {
          valid: false,
          invalid: true
        }
      }
    }
  }

  canConvertToValidDateObject(value): boolean {
    return value instanceof Date && isFinite(value as any);
  }
}