import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControlOptions, ValidatorFn, FormControl } from '@angular/forms';
import { DateValidatorService } from './validators';
import { GsoDate } from './date.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    // 'control': [new Date(), Validators.compose([this.dateValidatorsService.elapsedTimeExceeded(), this.dateValidatorsService.isValid, Validators.required])]
    this.group = this.fb.group({
    });

    const dynamicFormControl = (value: any) => {
      const convertedNgbToDate = GsoDate(value).value;

      return new FormControl({
        value: convertedNgbToDate,
        disabled: false
      }, {
        validators: Validators.required,
      } as AbstractControlOptions)
    };

    const control = dynamicFormControl(new Date());
    
    this.group.addControl('control', control);
    this.group.addControl('cat', control);

    // this.group.get('control').valueChanges.subscribe(value => console.log('Inside parent component:', value, this.group.get('control').validator));
  }

  group: FormGroup;

  constructor(private fb: FormBuilder, private dateValidatorsService: DateValidatorService) { }


}
