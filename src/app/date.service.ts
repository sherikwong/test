import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import * as _moment from 'moment';
import { GsoDateUtil } from './angular-date.util';
const moment = _moment;

export enum GsoDateTypes {
  Date,
  NgbDateStruct,
  string,
  ISOString
}

interface GsoDateOptions {
  format?: string;
  utc?: boolean;
  time?: boolean;
}

export interface IGsoDate {
  value: Date;
  valid: boolean;
  toString(options?: GsoDateOptions): string;
  toISOString(options?: GsoDateOptions): string;
  toNgbDateStruct(options?: GsoDateOptions): NgbDateStruct;
  toDate(options?: GsoDateOptions): Date;
  difference(otherDate: any, unitOfTime: _moment.unitOfTime.Diff): number;
}

export function GsoDate(value: any, config?: GsoDateOptions): CGsoDate {
  return new CGsoDate(value, config);
}

/**
 * Date parsing class that incorporates Angular's Date Pipe formatting
 * This features a cache to store previously evaluated date formats as to allow reusability without time overhead
 * @see https://angular.io/api/common/DatePipe#pre-defined-format-options
 * 
 * @param incomingValue {any} Acceptable values include: anything JS's native Date can parse and including NgbDateStruct
 * 
 * @example new GsoDate('12/11/2001', {format: 'MM/dd/yyyy'});
 * @example new GsoDate('January 20, 2001', {format: 'MMMM d, yyyy'})
 * 
 * @todo Implement UTC and time
 */
class CGsoDate extends GsoDateUtil implements IGsoDate {
  private _initialValue: any;
  private _type: GsoDateTypes;
  private _standardValue: Date;
  private _format: string = 'mediumDate';
  private _evaluatedTypes: Map<GsoDateTypes, Map<string, string> | any> = new Map(); // Reduce time // @TODO Sheri Specify type 
  private _locale: string = 'en-US';
  valid = false;

  constructor(
    private incomingValue: any,
    private options?: GsoDateOptions
  ) {
    super();
    this._initialValue = this.incomingValue;
    this._standardValue = this._convertToStandardDate(this._initialValue);
    this._type = this._determineType(this._initialValue);

    if (this.options) {
      this._format = this.options.format;
    }

    this.valid = super.isDate(this._standardValue);

    // Add initial value !== string, add value, otherwise add map <format, value>
    this._evaluatedTypes.set(
      this._type,
      this._type === GsoDateTypes.string ? new Map([[this._format, this._initialValue]]) : this._initialValue
    );
  }

  get value(): Date {
    return this._standardValue;
  }

  difference(otherDate: any, unitOfTime: _moment.unitOfTime.Diff): number {
    const standardOther = GsoDate(otherDate).value;
    return moment(this._standardValue).diff(moment(standardOther), unitOfTime);
  }

toString(options ?: GsoDateOptions): string {
  const format = options && options.format ? options.format : 'mediumDate';
  const evaluatedStringMap = this._evaluatedTypes.get(GsoDateTypes.string);

  if (this._type === GsoDateTypes.string) { // If the formatted string has already been evaluated, return it
    const existingStringFormat = evaluatedStringMap.get(format);
    if (existingStringFormat) return existingStringFormat;
  };


  const result = super.formatDate(this._standardValue, format, this._locale);


  if (evaluatedStringMap) {
    evaluatedStringMap.set(format, result);
  } else {
    const stringFormats: Map<string, string> = new Map([[format, result]]);
    this._evaluatedTypes.set(GsoDateTypes.string, stringFormats);
  }

  return result;
}

/**
 * 
 * @todo Add utc support from configs
 */
toISOString(options ?: GsoDateOptions): string {
  if (this._type === GsoDateTypes.ISOString) return this._initialValue;

  const result = this._standardValue.toISOString();
  this._evaluatedTypes.set(GsoDateTypes.ISOString, result);

  return result;
}

/**
 * 
 * @todo Add utc support from configs
 */
toNgbDateStruct(options ?: GsoDateOptions): NgbDateStruct {
  if (this._type === GsoDateTypes.NgbDateStruct) {
    return this._initialValue;
  }

  let result = {
    year: this._standardValue.getFullYear(),
    month: this._standardValue.getMonth() + 1,
    day: this._standardValue.getDate()
  };

  if (options && options.utc) {
    result = {
      year: this._standardValue.getUTCFullYear(),
      month: this._standardValue.getUTCMonth() + 1,
      day: this._standardValue.getUTCDate()
    };
  }

  this._evaluatedTypes.set(GsoDateTypes.NgbDateStruct, result);

  return result;
}

/**
 * 
 * @todo Add utc support from configs
 */
toDate(options ?: GsoDateOptions): Date {
  if (this._type === GsoDateTypes.Date) return this._initialValue;
  return this._standardValue;
}

  private _determineType(value): GsoDateTypes {
  if (super.isNgbDateStruct(value)) return GsoDateTypes.NgbDateStruct;
  if (super.isDate(value)) {
    return typeof value === 'string' ? GsoDateTypes.ISOString : GsoDateTypes.Date;
  };
  if (value.trim) return GsoDateTypes.string;
}

  private _convertToStandardDate(value: any) {
  if (super.isNgbDateStruct(value)) {
    return this._convertFromNgbDateStruct(value);
  }

  const dateObject = super.toDateObject(value);
  return dateObject ? dateObject : this._convertStringWithFormat(value)
}

  private _convertFromNgbDateStruct(value: NgbDateStruct): Date {
  return new Date(value.year, value.month - 1, value.day);
}

  private _convertStringWithFormat(value: any) {
  const namedFormat = super.getNamedFormat(this._locale, this._format);
  this._format = namedFormat || this._format;

  let parts: string[] = [];
  let match;
  while (this._format) {
    match = this.DATE_FORMATS_SPLIT.exec(this._format);
    if (match) {
      parts = parts.concat(match.slice(1));
      const part = parts.pop();
      if (!part) {
        break;
      }
      this._format = part;
    } else {
      parts.push(this._format);
      break;
    }
  }

  const dateTimezoneOffset = value.getTimezoneOffset();

  const partsAssociatedToDenominators = [
    'month',
    'day',
    'year'
  ];

  const constructingDate = {} as NgbDateStruct

  for (let i = 0; i < parts.length; i += 2) {
    const value = parts[i];
    const dateFormatter = super.getDateFormatter(value);

    if (dateFormatter) {
      const part = dateFormatter(value as any, this._locale, dateTimezoneOffset);

      console.log(i, part);

      if (part) {
        constructingDate[partsAssociatedToDenominators[i / 2]] = part;
      }

    }

  }
  return this._convertFromNgbDateStruct(value);
}
}