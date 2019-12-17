import { Inject, Pipe, PipeTransform } from '@angular/core';
import * as _moment from 'moment';
import { formatDate } from '@angular/common';
const moment = _moment;


@Pipe({ name: 'transformDate' })
export class TransformDatePipe implements PipeTransform {
  constructor(
  ) { }

  transform(date: any, format: string): string {
    if (date) {
      const locale = 'en-US';
      const revisedDate = date;

      if (date.year || date.month || date.day) {
        revisedDate.month = date.month - 1;
      }

      const canBeConvertedToDateObject = revisedDate instanceof Date && isFinite(revisedDate as any);

      if (canBeConvertedToDateObject) {
        const incomingToDateObject = new Date(revisedDate);
        const formattedDate = formatDate(incomingToDateObject, format, locale); // Use @core's native date pipe functionality
        return formattedDate;
      }
    }
    return date;
  }
}