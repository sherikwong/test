import { Component, forwardRef, OnInit, Input, OnChanges, SimpleChanges, Optional, Host, SkipSelf, Self, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Validator, NG_VALUE_ACCESSOR, NG_VALIDATORS, ControlValueAccessor, FormGroup, FormControl, AbstractControl, ValidationErrors, ControlContainer, NgControl } from '@angular/forms';
import { NgbDateAdapter, NgbDateNativeAdapter, NgbDatepicker, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
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
export class MaskedDatePickerInputComponent implements AfterViewInit, OnInit, ControlValueAccessor, Validator {
  ngAfterViewInit(): void {
    console.log(this.datePickerCalendar);
  }
  @Input() format: string = 'MM/dd/y';
  @Input() formControlName: string;
  @Input() mask: string = '00/00/0000';
  @Input() placeholder: string = 'Date';
  datePickerVisible = false;
  error = false;
  value: Date;
  control: FormControl | AbstractControl;
  validator;
  @ViewChild('datePickerPop') datePickerCalendar: NgbPopover;

  constructor(
    @Optional() @Host() @SkipSelf()
    private controlContainer: ControlContainer,
  ) { }

  ngOnInit() {
    if (this.controlContainer) {
      if (this.formControlName) {
        this.validator = this.controlContainer.control.get(this.formControlName).validator;
      } else {
        console.error('Form control name does not exist');
      }
    } else {
      console.error('Form control group does not exist');
    }
  }

  get formControl(): AbstractControl {
    const currentControl = this.controlContainer.control.get(this.formControlName);
    return currentControl ? currentControl : new FormControl(null); // Error guard
  }

  _onChange = (v) => { };
  _onTouched = () => { };

  // Initial setting of formControlName from parent component upon load
  writeValue(initialLoadValue: any): void {
    this.value = initialLoadValue;
    this._onChange(initialLoadValue);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  validate(c: FormControl): any {
    return this.validator(c);
  }

  registerOnValidatorChange(fn: any): void {
    this._onChange = fn;
  }

  togglePicker(): void {
    this.datePickerVisible = !this.datePickerVisible;
  }

  get datePickerValue(): Date {
    return this.value;
  }

  set datePickerValue(newValue) {
    this._onTouched();
    this.value = newValue;
    this.formControl.patchValue(newValue);
    this.datePickerCalendar.close();
  }

  onInputBlur(event: any) {
    this._onTouched();
    const incomingValue = event.target.value;

    if (incomingValue) {
      const gsoDate = GsoDate(incomingValue);

      this.value = gsoDate.value;
      this.formControl.patchValue(gsoDate.valid ? gsoDate.value : incomingValue);
    } else {
      this.formControl.patchValue('');
    }
  }
}
