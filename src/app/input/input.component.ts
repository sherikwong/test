import { Component, forwardRef, OnInit, Input, OnChanges, SimpleChanges, Optional, Host, SkipSelf } from '@angular/core';
import { Validator, NG_VALUE_ACCESSOR, NG_VALIDATORS, ControlValueAccessor, FormGroup, FormControl, AbstractControl, ValidationErrors, ControlContainer } from '@angular/forms';
import { NgbDateAdapter, NgbDateNativeAdapter } from '@ng-bootstrap/ng-bootstrap';
import { initialConfig as NgxDefaultConfig, config as NgxMaskConfig } from 'ngx-mask';
import { GsoDate } from '../date.service';

/**
 * A custom date picker input that joins Ngx-Mask and NgbDatePicker directives to be used with **REACTIVE FORMS**
 * @param format {string} 'MM/dd/y' - Uses Angular's Date Pipe formatting (@see https://angular.io/api/common/DatePipe)
 * @param mask {string} '00/00/0000' - Uses Ngx-Mask's formatting (@see https://www.npmjs.com/package/ngx-mask)
 * @param placeholder {string} 'Date' - What the field says while it's falsey
 * @example
 * <form [formGroup]="formGroup">
 *    <masked-date-picker-input formControlName="your-form-control-name"></masked-date-picker-input>
 * </form>
 */
@Component({
  selector: 'masked-date-picker-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR, // Informs Angular about our custom control value accessor control
      useExisting: forwardRef(() => MaskedDatePickerInputComponent), // 
      multi: true
    },
    {
      provide: NG_VALIDATORS, // Updates validations in parent form group
      useExisting: forwardRef(() => MaskedDatePickerInputComponent),
      multi: true
    },
    { provide: NgbDateAdapter, useClass: NgbDateNativeAdapter }, // Parses selected dates from NgbCalendar into Date object
    { provide: NgxMaskConfig, useValue: NgxDefaultConfig },
  ]
})
export class MaskedDatePickerInputComponent implements OnInit, ControlValueAccessor, Validator {
  @Input() format: string = 'MM/dd/y';
  @Input() formControlName: string;
  @Input() mask: string = '00/00/0000';
  @Input() placeholder: string = 'Date';
  datePickerVisible = false;
  error = false;
  value: Date;

  constructor(
    @Optional() @Host() @SkipSelf()
    private controlContainer: ControlContainer
  ) { }

  ngOnInit() {
    // this.formGroup.addControl(this.formControlName, new FormControl()); // Adds dummy formGroup b/c formControls can't stand alone
  }

  // get formControl(): AbstractControl {
  //   const existingControl = this.formGroup.get(this.formControlName);
  //   return existingControl ? existingControl : new FormControl(null); // Error guard
  // }

  _onChange = (v) => { };
  _onTouched = () => { };

  public _onValidate: () => void = () => { };


  // Initial setting of formControlName from parent component upon load
  writeValue(initialLoadValue: any): void {
    console.log('Initial', initialLoadValue);
    this.value = initialLoadValue;
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
    console.log(this._onChange);
  }
  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    // isDisabled ? this.formControl.disable() : this.formControl.enable();
  }

  validate(c: FormControl): any {
    console.log(c.value, c.errors);

    return c.errors;
  }

  registerOnValidatorChange(fn: any): void {
    console.log('Register validator change', fn);
    this._onChange = fn;
  }

  togglePicker(): void {
    this.datePickerVisible = !this.datePickerVisible;
  }

  get datePickerValue(): Date {
    return this.value;
  }

  set datePickerValue(newValue) {
    this.value = newValue;
    this._onChange(newValue);
  }

  onInputBlur(event: any) {
    const incomingValue = event.target.value;

    if (incomingValue) {
      const gsoDate = GsoDate(incomingValue);

      this.value = gsoDate.value;
      // this.formControl.patchValue(gsoDate.valid ? gsoDate.value : incomingValue);
      this._onChange(gsoDate.value);
    } else {
      this._onChange(null);
    }
  }
}
