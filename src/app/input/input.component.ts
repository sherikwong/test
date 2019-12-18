import { Component, OnInit, Input, forwardRef, HostListener, ElementRef, Optional, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy, DoCheck, Inject } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR, ControlContainer, FormGroup, ControlValueAccessor, NgForm, ReactiveFormsModule, FormBuilder, NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';
import { NgbDateAdapter, NgbDateNativeAdapter, NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { DynamicNgbDateParserFormatter } from '../date-parser';
import { GsoDate } from '../date.service';

@Component({
  selector: 'masked-date-picker-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaskedDatePickerInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => MaskedDatePickerInputComponent),
      multi: true
    },
    { provide: NgbDateAdapter, useClass: NgbDateNativeAdapter },
    { provide: NgbDateParserFormatter, useClass: DynamicNgbDateParserFormatter },
    // { provide: Token, useValue: 'Sample' },
    // GsoDate
  ]
})
export class MaskedDatePickerInputComponent implements OnInit, ControlValueAccessor, Validator {
  @Input() disabled: boolean;
  @Input() format: string = 'MM/dd/y';
  @Input() formControlName: string;
  @Input() mask: string = '00/00/0000';
  @Input() placeholder: string;
  @Input() showMaskTyped = true;
  formGroup: FormGroup = new FormGroup({});
  datePickerVisible = false;
  private _previousValue: Date;
  sample;

  constructor(
    // @Inject(Token) private token: any,
    private cd: ChangeDetectorRef,
  ) {
    const date = new Date();
    console.log('Date', new GsoDate(date).value);

    const string = '12/11/1993';
    console.log('String', new GsoDate(string, {format: 'MM/dd/yyyy'}).value);
    const fullString = 'January 10, 2019';
    console.log('String', new GsoDate(fullString, {format: 'MMMM d, yyyy'}).value);
    
    const obj = {
      year: 1993,
      month: 3,
      day: 3
    };
    
    console.log('Object', new GsoDate(obj).value);
  }

  ngOnInit() {
    this.formGroup.addControl(this.formControlName, new FormControl());
  }

  get formControl(): AbstractControl {
    const existingControl = this.formGroup.get(this.formControlName);
    return existingControl ? existingControl : new FormControl(null); // Error guard
  }

  public onTouched: () => void = () => { };

  // Initial setting of formControlName from parent component
  writeValue(initialLoadValue: any): void {
    initialLoadValue && this.formControl.patchValue(initialLoadValue, { emitEvent: false });
    this._previousValue = initialLoadValue;
  }

  registerOnChange(fn: any): void {
    this.formControl.valueChanges.subscribe(fn);
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.formControl.disable() : this.formControl.enable();
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return this.formControl.errors;
  }

  togglePicker(): void {
    this.datePickerVisible = !this.datePickerVisible;
  }

  get datePickerValue() {
    return this._previousValue;
  }

  set datePickerValue(value: Date) {
    if (value) this._previousValue = value;
    this.formControl.patchValue(this._previousValue);
  }

  onInputBlur(event: any) {
    const incomingValue = event.target.value;

    if (incomingValue) {
      const incomingValuetoNgb = this.parse(incomingValue);
      if (incomingValuetoNgb.month <= 12 && incomingValuetoNgb.day <= 31) {
        const incomingValueToDate = new Date(incomingValuetoNgb.year, incomingValuetoNgb.month - 1, incomingValuetoNgb.day);
        this.formControl.patchValue(incomingValueToDate);
      } else {
        this.formControl.patchValue(incomingValue);
      }
    } else {
      this.formControl.reset();
    }
  }

  toInteger(value: any): number {
    return parseInt(`${value}`, 10);
  }

  isNumber(value: any): value is number {
    return !isNaN(this.toInteger(value));
  }

  parse(date: any): NgbDateStruct {
    if (date.trim) {
      const dateParts = date.trim().split('/'); // Splits at forwards slashes and dashes

      if (dateParts.length === 1 && this.isNumber(dateParts[0])) {
        return {
          year: null,
          month: this.toInteger(dateParts[0]),
          day: null
        };
      } else if (dateParts.length === 2 && this.isNumber(dateParts[0]) && this.isNumber(dateParts[1])) {
        return {
          year: null,
          month: this.toInteger(dateParts[0]),
          day: this.toInteger(dateParts[1])
        };
      } else if (dateParts.length === 3 && this.isNumber(dateParts[0]) && this.isNumber(dateParts[1]) && this.isNumber(dateParts[2])) {
        return {
          year: this.toInteger(dateParts[2]),
          month: this.toInteger(dateParts[0]),
          day: this.toInteger(dateParts[1])
        };
      }
    }
  }
}
