import { getLocaleId, getLocaleDateFormat, FormatWidth, getLocaleTimeFormat, getLocaleDateTimeFormat, getLocaleNumberSymbol, NumberSymbol, TranslationWidth, FormStyle, getLocaleMonthNames, getLocaleDayNames, getLocaleExtraDayPeriodRules, getLocaleExtraDayPeriods, Time, getLocaleDayPeriods, getLocaleEraNames } from '@angular/common';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';


export enum ZoneWidth {
  Short,
  ShortGMT,
  Long,
  Extended
}

export enum DateType {
  FullYear,
  Month,
  Date,
  Hours,
  Minutes,
  Seconds,
  FractionalSeconds,
  Day
}

export enum TranslationType {
  DayPeriods,
  Days,
  Months,
  Eras
}

type DateFormatter = (date: Date, locale: string, offset: number) => string;

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export abstract class GsoDateUtil {
  protected ISO8601_DATE_REGEX =
    /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;
  //    1        2       3         4          5          6          7          8  9     10      11
  protected NAMED_FORMATS: { [localeId: string]: { [format: string]: string } } = {};
  protected DATE_FORMATS: { [format: string]: DateFormatter } = {};
  protected DATE_FORMATS_SPLIT =
    /((?:[^GyMLwWdEabBhHmsSzZO']+)|(?:'(?:[^']|'')*')|(?:G{1,5}|y{1,4}|M{1,5}|L{1,5}|w{1,2}|W{1}|d{1,2}|E{1,6}|a{1,5}|b{1,5}|B{1,5}|h{1,2}|H{1,2}|m{1,2}|s{1,2}|S{1,3}|z{1,4}|Z{1,5}|O{1,4}))([\s\S]*)/;

  /**
   * @ngModule CommonModule
   * @description
   *
   * Formats a date according to locale rules.
   *
   * @param value The date to format, as a Date, or a number (milliseconds since UTC epoch)
   * or an [ISO date-time string](https://www.w3.org/TR/NOTE-datetime).
   * @param format The date-time components to include. See `DatePipe` for details.
   * @param locale A locale code for the locale format rules to use.
   * @param timezone The time zone. A time zone offset from GMT (such as `'+0430'`),
   * or a standard UTC/GMT or continental US time zone abbreviation.
   * If not specified, uses host system settings.
   *
   * @returns The formatted date string.
   *
   * @see `DatePipe`
   * @see [Internationalization (i18n) Guide](https://angular.io/guide/i18n)
   *
   * @publicApi
   */
  protected formatDate(
    value: string | number | Date, format: string, locale: string, timezone?: string): string {
    let date = this.toDateObject(value);
    const namedFormat = this.getNamedFormat(locale, format);
    format = namedFormat || format;

    let parts: string[] = [];
    let match;
    while (format) {
      match = this.DATE_FORMATS_SPLIT.exec(format);
      if (match) {
        parts = parts.concat(match.slice(1));
        const part = parts.pop();
        if (!part) {
          break;
        }
        format = part;
      } else {
        parts.push(format);
        break;
      }
    }

    let dateTimezoneOffset = date.getTimezoneOffset();
    if (timezone) {
      dateTimezoneOffset = this.timezoneToOffset(timezone, dateTimezoneOffset);
      date = this.convertTimezoneToLocal(date, timezone, true);
    }

    let text = '';
    parts.forEach(value => {
      const dateFormatter = this.getDateFormatter(value);
      text += dateFormatter ?
        dateFormatter(date, locale, dateTimezoneOffset) :
        value === '\'\'' ? '\'' : value.replace(/(^'|'$)/g, '').replace(/''/g, '\'');
    });

    return text;
  }

  protected getNamedFormat(locale: string, format: string): string {
    const localeId = getLocaleId(locale);
    this.NAMED_FORMATS[localeId] = this.NAMED_FORMATS[localeId] || {};

    if (this.NAMED_FORMATS[localeId][format]) {
      return this.NAMED_FORMATS[localeId][format];
    }

    let formatValue = '';
    switch (format) {
      case 'shortDate':
        formatValue = getLocaleDateFormat(locale, FormatWidth.Short);
        break;
      case 'mediumDate':
        formatValue = getLocaleDateFormat(locale, FormatWidth.Medium);
        break;
      case 'longDate':
        formatValue = getLocaleDateFormat(locale, FormatWidth.Long);
        break;
      case 'fullDate':
        formatValue = getLocaleDateFormat(locale, FormatWidth.Full);
        break;
      case 'shortTime':
        formatValue = getLocaleTimeFormat(locale, FormatWidth.Short);
        break;
      case 'mediumTime':
        formatValue = getLocaleTimeFormat(locale, FormatWidth.Medium);
        break;
      case 'longTime':
        formatValue = getLocaleTimeFormat(locale, FormatWidth.Long);
        break;
      case 'fullTime':
        formatValue = getLocaleTimeFormat(locale, FormatWidth.Full);
        break;
      case 'short':
        const shortTime = this.getNamedFormat(locale, 'shortTime');
        const shortDate = this.getNamedFormat(locale, 'shortDate');
        formatValue = this.formatDateTime(
          getLocaleDateTimeFormat(locale, FormatWidth.Short), [shortTime, shortDate]);
        break;
      case 'medium':
        const mediumTime = this.getNamedFormat(locale, 'mediumTime');
        const mediumDate = this.getNamedFormat(locale, 'mediumDate');
        formatValue = this.formatDateTime(
          getLocaleDateTimeFormat(locale, FormatWidth.Medium), [mediumTime, mediumDate]);
        break;
      case 'long':
        const longTime = this.getNamedFormat(locale, 'longTime');
        const longDate = this.getNamedFormat(locale, 'longDate');
        formatValue =
          this.formatDateTime(getLocaleDateTimeFormat(locale, FormatWidth.Long), [longTime, longDate]);
        break;
      case 'full':
        const fullTime = this.getNamedFormat(locale, 'fullTime');
        const fullDate = this.getNamedFormat(locale, 'fullDate');
        formatValue =
          this.formatDateTime(getLocaleDateTimeFormat(locale, FormatWidth.Full), [fullTime, fullDate]);
        break;
    }
    if (formatValue) {
      this.NAMED_FORMATS[localeId][format] = formatValue;
    }
    return formatValue;
  }

  protected formatDateTime(str: string, opt_values: string[]) {
    if (opt_values) {
      str = str.replace(/\{([^}]+)}/g, function (match, key) {
        return (opt_values != null && key in opt_values) ? opt_values[key] : match;
      });
    }
    return str;
  }

  protected padNumber(
    num: number, digits: number, minusSign = '-', trim?: boolean, negWrap?: boolean): string {
    let neg = '';
    if (num < 0 || (negWrap && num <= 0)) {
      if (negWrap) {
        num = -num + 1;
      } else {
        num = -num;
        neg = minusSign;
      }
    }
    let strNum = String(num);
    while (strNum.length < digits) {
      strNum = '0' + strNum;
    }
    if (trim) {
      strNum = strNum.substr(strNum.length - digits);
    }
    return neg + strNum;
  }

  protected formatFractionalSeconds(milliseconds: number, digits: number): string {
    const strMs = this.padNumber(milliseconds, 3);
    return strMs.substr(0, digits);
  }

  /**
   * Returns a date formatter that transforms a date into its locale digit representation
   */
  protected dateGetter(
    name: DateType, size: number, offset: number = 0, trim = false,
    negWrap = false): DateFormatter {
    return (date: Date, locale: string): string => {
      let part = this.getDatePart(name, date);
      if (offset > 0 || part > -offset) {
        part += offset;
      }

      if (name === DateType.Hours) {
        if (part === 0 && offset === -12) {
          part = 12;
        }
      } else if (name === DateType.FractionalSeconds) {
        return this.formatFractionalSeconds(part, size);
      }

      const localeMinus = getLocaleNumberSymbol(locale, NumberSymbol.MinusSign);
      return this.padNumber(part, size, localeMinus, trim, negWrap);
    };
  }

  protected getDatePart(part: DateType, date: Date): number {
    switch (part) {
      case DateType.FullYear:
        return date.getFullYear();
      case DateType.Month:
        return date.getMonth();
      case DateType.Date:
        return date.getDate();
      case DateType.Hours:
        return date.getHours();
      case DateType.Minutes:
        return date.getMinutes();
      case DateType.Seconds:
        return date.getSeconds();
      case DateType.FractionalSeconds:
        return date.getMilliseconds();
      case DateType.Day:
        return date.getDay();
      default:
        throw new Error(`Unknown DateType value "${part}".`);
    }
  }

  /**
   * Returns a date formatter that transforms a date into its locale string representation
   */
  protected dateStrGetter(
    name: TranslationType, width: TranslationWidth, form: FormStyle = FormStyle.Format,
    extended = false): DateFormatter {
    return (date: Date, locale: string): string => {
      return this.getDateTranslation(date, locale, name, width, form, extended);
    };
  }

  /**
   * Returns the locale translation of a date for a given form, type and width
   */
  protected getDateTranslation(
    date: Date, locale: string, name: TranslationType, width: TranslationWidth, form: FormStyle,
    extended: boolean) {
    switch (name) {
      case TranslationType.Months:
        return getLocaleMonthNames(locale, form, width)[date.getMonth()];
      case TranslationType.Days:
        return getLocaleDayNames(locale, form, width)[date.getDay()];
      case TranslationType.DayPeriods:
        const currentHours = date.getHours();
        const currentMinutes = date.getMinutes();
        if (extended) {
          const rules = getLocaleExtraDayPeriodRules(locale);
          const dayPeriods = getLocaleExtraDayPeriods(locale, form, width);
          let result;
          rules.forEach((rule: Time | [Time, Time], index: number) => {
            if (Array.isArray(rule)) {
              // morning, afternoon, evening, night
              const { hours: hoursFrom, minutes: minutesFrom } = rule[0];
              const { hours: hoursTo, minutes: minutesTo } = rule[1];
              if (currentHours >= hoursFrom && currentMinutes >= minutesFrom &&
                (currentHours < hoursTo ||
                  (currentHours === hoursTo && currentMinutes < minutesTo))) {
                result = dayPeriods[index];
              }
            } else {  // noon or midnight
              const { hours, minutes } = rule;
              if (hours === currentHours && minutes === currentMinutes) {
                result = dayPeriods[index];
              }
            }
          });
          if (result) {
            return result;
          }
        }
        // if no rules for the day periods, we use am/pm by default
        return getLocaleDayPeriods(locale, form, <TranslationWidth>width)[currentHours < 12 ? 0 : 1];
      case TranslationType.Eras:
        return getLocaleEraNames(locale, <TranslationWidth>width)[date.getFullYear() <= 0 ? 0 : 1];
      default:
        // This default case is not needed by TypeScript compiler, as the switch is exhaustive.
        // However Closure Compiler does not understand that and reports an error in typed mode.
        // The `throw new Error` below works around the problem, and the unexpected: never variable
        // makes sure tsc still checks this code is unreachable.
        const unexpected: never = name;
        throw new Error(`unexpected translation type ${unexpected}`);
    }
  }

  /**
   * Returns a date formatter that transforms a date and an offset into a timezone with ISO8601 or
   * GMT format depending on the width (eg: short = +0430, short:GMT = GMT+4, long = GMT+04:30,
   * extended = +04:30)
   */
  protected timeZoneGetter(width: ZoneWidth): DateFormatter {
    return (date: Date, locale: string, offset: number) => {
      const zone = -1 * offset;
      const minusSign = getLocaleNumberSymbol(locale, NumberSymbol.MinusSign);
      const hours = zone > 0 ? Math.floor(zone / 60) : Math.ceil(zone / 60);
      switch (width) {
        case ZoneWidth.Short:
          return ((zone >= 0) ? '+' : '') + this.padNumber(hours, 2, minusSign) +
            this.padNumber(Math.abs(zone % 60), 2, minusSign);
        case ZoneWidth.ShortGMT:
          return 'GMT' + ((zone >= 0) ? '+' : '') + this.padNumber(hours, 1, minusSign);
        case ZoneWidth.Long:
          return 'GMT' + ((zone >= 0) ? '+' : '') + this.padNumber(hours, 2, minusSign) + ':' +
            this.padNumber(Math.abs(zone % 60), 2, minusSign);
        case ZoneWidth.Extended:
          if (offset === 0) {
            return 'Z';
          } else {
            return ((zone >= 0) ? '+' : '') + this.padNumber(hours, 2, minusSign) + ':' +
              this.padNumber(Math.abs(zone % 60), 2, minusSign);
          }
        default:
          throw new Error(`Unknown zone width "${width}"`);
      }
    };
  }

  private JANUARY = 0;
  private THURSDAY = 4;
  protected getFirstThursdayOfYear(year: number) {
    const firstDayOfYear = (new Date(year, this.JANUARY, 1)).getDay();
    return new Date(
      year, 0, 1 + ((firstDayOfYear <= this.THURSDAY) ? this.THURSDAY : this.THURSDAY + 7) - firstDayOfYear);
  }

  protected getThursdayThisWeek(datetime: Date) {
    return new Date(
      datetime.getFullYear(), datetime.getMonth(),
      datetime.getDate() + (this.THURSDAY - datetime.getDay()));
  }

  protected weekGetter(size: number, monthBased = false): DateFormatter {
    return (date: Date, locale: string) => {
      let result;
      if (monthBased) {
        const nbDaysBefore1stDayOfMonth =
          new Date(date.getFullYear(), date.getMonth(), 1).getDay() - 1;
        const today = date.getDate();
        result = 1 + Math.floor((today + nbDaysBefore1stDayOfMonth) / 7);
      } else {
        const firstThurs = this.getFirstThursdayOfYear(date.getFullYear());
        const thisThurs = this.getThursdayThisWeek(date);
        const diff = thisThurs.getTime() - firstThurs.getTime();
        result = 1 + Math.round(diff / 6.048e8);  // 6.048e8 ms per week
      }

      return this.padNumber(result, size, getLocaleNumberSymbol(locale, NumberSymbol.MinusSign));
    };
  }

  // Based on CLDR formats:
  // See complete list: http://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
  // See also explanations: http://cldr.unicode.org/translation/date-time
  // TODO(ocombe): support all missing cldr formats: Y, U, Q, D, F, e, c, j, J, C, A, v, V, X, x
  protected getDateFormatter(format: string): DateFormatter | null {
    if (this.DATE_FORMATS[format]) {
      return this.DATE_FORMATS[format];
    }
    let formatter;
    switch (format) {
      // Era name (AD/BC)
      case 'G':
      case 'GG':
      case 'GGG':
        formatter = this.dateStrGetter(TranslationType.Eras, TranslationWidth.Abbreviated);
        break;
      case 'GGGG':
        formatter = this.dateStrGetter(TranslationType.Eras, TranslationWidth.Wide);
        break;
      case 'GGGGG':
        formatter = this.dateStrGetter(TranslationType.Eras, TranslationWidth.Narrow);
        break;

      // 1 digit representation of the year, e.g. (AD 1 => 1, AD 199 => 199)
      case 'y':
        formatter = this.dateGetter(DateType.FullYear, 1, 0, false, true);
        break;
      // 2 digit representation of the year, padded (00-99). (e.g. AD 2001 => 01, AD 2010 => 10)
      case 'yy':
        formatter = this.dateGetter(DateType.FullYear, 2, 0, true, true);
        break;
      // 3 digit representation of the year, padded (000-999). (e.g. AD 2001 => 01, AD 2010 => 10)
      case 'yyy':
        formatter = this.dateGetter(DateType.FullYear, 3, 0, false, true);
        break;
      // 4 digit representation of the year (e.g. AD 1 => 0001, AD 2010 => 2010)
      case 'yyyy':
        formatter = this.dateGetter(DateType.FullYear, 4, 0, false, true);
        break;

      // Month of the year (1-12), numeric
      case 'M':
      case 'L':
        formatter = this.dateGetter(DateType.Month, 1, 1);
        break;
      case 'MM':
      case 'LL':
        formatter = this.dateGetter(DateType.Month, 2, 1);
        break;

      // Month of the year (January, ...), string, format
      case 'MMM':
        formatter = this.dateStrGetter(TranslationType.Months, TranslationWidth.Abbreviated);
        break;
      case 'MMMM':
        formatter = this.dateStrGetter(TranslationType.Months, TranslationWidth.Wide);
        break;
      case 'MMMMM':
        formatter = this.dateStrGetter(TranslationType.Months, TranslationWidth.Narrow);
        break;

      // Month of the year (January, ...), string, standalone
      case 'LLL':
        formatter =
          this.dateStrGetter(TranslationType.Months, TranslationWidth.Abbreviated, FormStyle.Standalone);
        break;
      case 'LLLL':
        formatter =
          this.dateStrGetter(TranslationType.Months, TranslationWidth.Wide, FormStyle.Standalone);
        break;
      case 'LLLLL':
        formatter =
          this.dateStrGetter(TranslationType.Months, TranslationWidth.Narrow, FormStyle.Standalone);
        break;

      // Week of the year (1, ... 52)
      case 'w':
        formatter = this.weekGetter(1);
        break;
      case 'ww':
        formatter = this.weekGetter(2);
        break;

      // Week of the month (1, ...)
      case 'W':
        formatter = this.weekGetter(1, true);
        break;

      // Day of the month (1-31)
      case 'd':
        formatter = this.dateGetter(DateType.Date, 1);
        break;
      case 'dd':
        formatter = this.dateGetter(DateType.Date, 2);
        break;

      // Day of the Week
      case 'E':
      case 'EE':
      case 'EEE':
        formatter = this.dateStrGetter(TranslationType.Days, TranslationWidth.Abbreviated);
        break;
      case 'EEEE':
        formatter = this.dateStrGetter(TranslationType.Days, TranslationWidth.Wide);
        break;
      case 'EEEEE':
        formatter = this.dateStrGetter(TranslationType.Days, TranslationWidth.Narrow);
        break;
      case 'EEEEEE':
        formatter = this.dateStrGetter(TranslationType.Days, TranslationWidth.Short);
        break;

      // Generic period of the day (am-pm)
      case 'a':
      case 'aa':
      case 'aaa':
        formatter = this.dateStrGetter(TranslationType.DayPeriods, TranslationWidth.Abbreviated);
        break;
      case 'aaaa':
        formatter = this.dateStrGetter(TranslationType.DayPeriods, TranslationWidth.Wide);
        break;
      case 'aaaaa':
        formatter = this.dateStrGetter(TranslationType.DayPeriods, TranslationWidth.Narrow);
        break;

      // Extended period of the day (midnight, at night, ...), standalone
      case 'b':
      case 'bb':
      case 'bbb':
        formatter = this.dateStrGetter(
          TranslationType.DayPeriods, TranslationWidth.Abbreviated, FormStyle.Standalone, true);
        break;
      case 'bbbb':
        formatter = this.dateStrGetter(
          TranslationType.DayPeriods, TranslationWidth.Wide, FormStyle.Standalone, true);
        break;
      case 'bbbbb':
        formatter = this.dateStrGetter(
          TranslationType.DayPeriods, TranslationWidth.Narrow, FormStyle.Standalone, true);
        break;

      // Extended period of the day (midnight, night, ...), standalone
      case 'B':
      case 'BB':
      case 'BBB':
        formatter = this.dateStrGetter(
          TranslationType.DayPeriods, TranslationWidth.Abbreviated, FormStyle.Format, true);
        break;
      case 'BBBB':
        formatter =
          this.dateStrGetter(TranslationType.DayPeriods, TranslationWidth.Wide, FormStyle.Format, true);
        break;
      case 'BBBBB':
        formatter = this.dateStrGetter(
          TranslationType.DayPeriods, TranslationWidth.Narrow, FormStyle.Format, true);
        break;

      // Hour in AM/PM, (1-12)
      case 'h':
        formatter = this.dateGetter(DateType.Hours, 1, -12);
        break;
      case 'hh':
        formatter = this.dateGetter(DateType.Hours, 2, -12);
        break;

      // Hour of the day (0-23)
      case 'H':
        formatter = this.dateGetter(DateType.Hours, 1);
        break;
      // Hour in day, padded (00-23)
      case 'HH':
        formatter = this.dateGetter(DateType.Hours, 2);
        break;

      // Minute of the hour (0-59)
      case 'm':
        formatter = this.dateGetter(DateType.Minutes, 1);
        break;
      case 'mm':
        formatter = this.dateGetter(DateType.Minutes, 2);
        break;

      // Second of the minute (0-59)
      case 's':
        formatter = this.dateGetter(DateType.Seconds, 1);
        break;
      case 'ss':
        formatter = this.dateGetter(DateType.Seconds, 2);
        break;

      // Fractional second
      case 'S':
        formatter = this.dateGetter(DateType.FractionalSeconds, 1);
        break;
      case 'SS':
        formatter = this.dateGetter(DateType.FractionalSeconds, 2);
        break;
      case 'SSS':
        formatter = this.dateGetter(DateType.FractionalSeconds, 3);
        break;


      // Timezone ISO8601 short format (-0430)
      case 'Z':
      case 'ZZ':
      case 'ZZZ':
        formatter = this.timeZoneGetter(ZoneWidth.Short);
        break;
      // Timezone ISO8601 extended format (-04:30)
      case 'ZZZZZ':
        formatter = this.timeZoneGetter(ZoneWidth.Extended);
        break;

      // Timezone GMT short format (GMT+4)
      case 'O':
      case 'OO':
      case 'OOO':
      // Should be location, but fallback to format O instead because we don't have the data yet
      case 'z':
      case 'zz':
      case 'zzz':
        formatter = this.timeZoneGetter(ZoneWidth.ShortGMT);
        break;
      // Timezone GMT long format (GMT+0430)
      case 'OOOO':
      case 'ZZZZ':
      // Should be location, but fallback to format O instead because we don't have the data yet
      case 'zzzz':
        formatter = this.timeZoneGetter(ZoneWidth.Long);
        break;
      default:
        return null;
    }
    this.DATE_FORMATS[format] = formatter;
    return formatter;
  }

  protected timezoneToOffset(timezone: string, fallback: number): number {
    // Support: IE 9-11 only, Edge 13-15+
    // IE/Edge do not "understand" colon (`:`) in timezone
    timezone = timezone.replace(/:/g, '');
    const requestedTimezoneOffset = Date.parse('Jan 01, 1970 00:00:00 ' + timezone) / 60000;
    return isNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
  }

  protected addDateMinutes(date: Date, minutes: number) {
    date = new Date(date.getTime());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  protected convertTimezoneToLocal(date: Date, timezone: string, reverse: boolean): Date {
    const reverseValue = reverse ? -1 : 1;
    const dateTimezoneOffset = date.getTimezoneOffset();
    const timezoneOffset = this.timezoneToOffset(timezone, dateTimezoneOffset);
    return this.addDateMinutes(date, reverseValue * (timezoneOffset - dateTimezoneOffset));
  }

  /**
   * Converts a value to date.
   *
   * Supported input formats:
   * - `Date`
   * - number: timestamp
   * - string: numeric (e.g. "1234"), ISO and date strings in a format supported by
   *   [Date.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).
   *   Note: ISO strings without time return a date without timeoffset.
   *
   * Throws if unable to convert to a date.
   */
  protected toDateObject(value: string | number | Date): Date {
    if (this.isDate(value)) {
      return value;
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return new Date(value);
    }

    if (typeof value === 'string') {
      value = value.trim();

      const parsedNb = parseFloat(value);

      // any string that only contains numbers, like "1234" but not like "1234hello"
      if (!isNaN(value as any - parsedNb)) {
        return new Date(parsedNb);
      }

      if (/^(\d{4}-\d{1,2}-\d{1,2})$/.test(value)) {
        /* For ISO Strings without time the day, month and year must be extracted from the ISO String
        before Date creation to avoid time offset and errors in the new Date.
        If we only replace '-' with ',' in the ISO String ("2015,01,01"), and try to create a new
        date, some browsers (e.g. IE 9) will throw an invalid Date error.
        If we leave the '-' ("2015-01-01") and try to create a new Date("2015-01-01") the timeoffset
        is applied.
        Note: ISO months are 0 for January, 1 for February, ... */
        const [y, m, d] = value.split('-').map((val: string) => +val);
        return new Date(y, m - 1, d);
      }

      let match: RegExpMatchArray | null;
      if (match = value.match(this.ISO8601_DATE_REGEX)) {
        return this.isoStringToDate(match);
      }
    }

    const date = new Date(value as any);
    if (!this.isDate(date)) {
      throw new Error(`Unable to convert "${value}" into a date`);
    }
    return date;
  }

  /**
   * Converts a date in ISO8601 to a Date.
   * Used instead of `Date.parse` because of browser discrepancies.
   */
  protected isoStringToDate(match: RegExpMatchArray): Date {
    const date = new Date(0);
    let tzHour = 0;
    let tzMin = 0;

    // match[8] means that the string contains "Z" (UTC) or a timezone like "+01:00" or "+0100"
    const dateSetter = match[8] ? date.setUTCFullYear : date.setFullYear;
    const timeSetter = match[8] ? date.setUTCHours : date.setHours;

    // if there is a timezone defined like "+01:00" or "+0100"
    if (match[9]) {
      tzHour = Number(match[9] + match[10]);
      tzMin = Number(match[9] + match[11]);
    }
    dateSetter.call(date, Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const h = Number(match[4] || 0) - tzHour;
    const m = Number(match[5] || 0) - tzMin;
    const s = Number(match[6] || 0);
    const ms = Math.round(parseFloat('0.' + (match[7] || 0)) * 1000);
    timeSetter.call(date, h, m, s, ms);
    return date;
  }

  protected isDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.valueOf());
  }

  protected isNgbDateStruct(possibleDate: object): possibleDate is NgbDateStruct {
    if (typeof possibleDate !== 'object') return false;

    const possibleKeys = ['month', 'year', 'day'];

    return !!possibleKeys.find(key => key in possibleDate);
  }
}