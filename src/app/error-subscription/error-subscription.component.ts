import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { combineLatest, Observable, merge, Subscribable } from 'rxjs';
import { EventEmitter } from 'events';
import { startWith, map, scan } from 'rxjs/operators';

@Component({
  selector: 'app-error-subscription',
  templateUrl: './error-subscription.component.html',
  styleUrls: ['./error-subscription.component.scss']
})
export class ErrorSubscriptionComponent implements OnInit {
  formGroup: FormGroup;


  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      control1: 'ta',
      control2: 'tee'
    });

    // this.formGroup.valueChanges.subscribe(value => console.log(value));
    this.update(this.formGroup);
  }

  public update(formGroup: FormGroup) {
    /**
     * Form
     */

    //    const controlsArray = [];
    //   //  const namesArray = [];
    //    const statusArray = [];
    //   const orderedDetailsArrays = new Map([
    //     ['name', []],
    //     ['status', []]
    //   ]);

    //   [...Object.entries(formGroup.controls)].forEach(([name, control], i) => {
    //     controlsArray.push(control);
    //     statusArray.push(control.statusChanges.pipe(
    //       startWith(null),
    //       map(result => {


    //         return {index: i, value: orderedDetailsArrays.get('')};
    //       })
    //     ));
    //   });

    //   combineLatest(
    //     ...orderedDetailsArrays.get('status')
    //   ).subscribe((result: any[]) => {
    //     console.log(result);
    //     return result;
    //   })
    // }

    const subscriptions: any[] = [...Object.entries(formGroup.controls)].map(([name, control], i) => {
      return control.statusChanges.pipe(
        startWith(null),
        map(result => ({ index: i, control }))
      )
    });

    
    combineLatest(...subscriptions).subscribe(result => {
      console.log(result);
    });
  }
}
