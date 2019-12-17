import { Injectable, Inject, Optional, InjectionToken, LOCALE_ID } from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { formatDate, getLocaleDateFormat, FormatWidth, getLocaleId, getLocaleTimeFormat, getLocaleDateTimeFormat } from '@angular/common';

/**
 * **What?**
 * A service for Ngb's datepicker that converts from string date with delimiters to NgbDateStruct object and formats to Date object
 * 
 * **Why?**
 * To override Ngb's and NgbGSODateParsarFormatter's implementation in order to allow HTML template piping with native Angular date pipe as to not mutate underlying data
 * 
 * @link https://ng-bootstrap.github.io/#/components/datepicker/api
 * @link https://github.com/ng-bootstrap/ng-bootstrap/blob/master/src/datepicker/ngb-date-parser-formatter.ts
 */
@Injectable()
export class DynamicNgbDateParserFormatter {
  private delimiter: string | RegExp

  constructor() {
    this.delimiter = /-|\//g;
  }

  toInteger(value: any): number {
    return parseInt(`${value}`, 10);
  }

  isNumber(value: any): value is number {
    return !isNaN(this.toInteger(value));
  }


  parse(date: any): NgbDateStruct  {
    const dateParts = date.trim().split(this.delimiter); // Splits at forwards slashes and dashes

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

  format(date): Date {
    return date;
  }
}