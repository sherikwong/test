import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { MaskedDatePickerInputComponent } from './input/input.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxMaskModule } from 'ngx-mask'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransformDatePipe } from './date-pipe.pipe';
import {DateValidatorService} from './validators';

@NgModule({
  declarations: [
    AppComponent,
    MaskedDatePickerInputComponent,
    TransformDatePipe
  ],
  imports: [
    BrowserModule,
    NgbModule,
    FormsModule,
    NgxMaskModule.forRoot({}),
    ReactiveFormsModule
  ],
  providers: [
    DateValidatorService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
