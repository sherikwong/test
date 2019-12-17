import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DateValidatorService } from './validators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.group = this.fb.group({
      'control': [new Date(), Validators.compose([this.dateValidatorsService.elapsedTimeExceeded(), this.dateValidatorsService.isValid, Validators.required])]
    });

    this.group.get('control').valueChanges.subscribe(value => console.log('Inside parent component:', value, this.group.get('control')));
  }
  group: FormGroup;

  constructor(private fb: FormBuilder, private dateValidatorsService: DateValidatorService) {  }


}
