import { ChangeDetectionStrategy, Component, effect, inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatError, MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { ControlLabelDirective } from '@app/directives';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginFormGroup } from './models/login-form-group.model';
import { Login, ResetError } from '../../../../core/store/auth/auth.actions';
import { Store } from '@ngrx/store';
import { ILoginRequest, IWsError } from '@app/models';
import {
  MfaRequiredSelector,
  UserErrorSelector,
} from '../../../../core/store/auth/auth.selectors';
import { FormControlErrorComponent } from '@app/components';
import { EMAIL_PATTERN } from '@app/config';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    ControlLabelDirective,
    FormControlErrorComponent,
    MatError,
  ],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnDestroy {
  readonly #store = inject(Store);
  readonly #fb = inject(FormBuilder);
  readonly #authService = inject(AuthService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  protected loginForm: FormGroup<LoginFormGroup> = this.#fb.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', Validators.required],
    mfaToken: [''],
  });

  protected errorMessage = this.#store.selectSignal<IWsError>(UserErrorSelector);
  protected mfaRequired = this.#store.selectSignal<boolean>(MfaRequiredSelector);

  constructor() {
    effect(() => {
      const mfaTokenControl = this.loginForm.controls.mfaToken;
      if (this.mfaRequired()) {
        mfaTokenControl.setValidators(Validators.required);
      } else {
        mfaTokenControl.clearValidators();
      }
      mfaTokenControl.updateValueAndValidity();
    });
  }

  /**
   * Récupération de du login et mot de passe et authentification de l'utilisateur
   */
  login() {
    if (this.loginForm.invalid) return;

    const request: ILoginRequest = {
      email: this.loginForm.controls.email.value,
      password: this.loginForm.controls.password.value,
      mfaToken: this.loginForm.controls.mfaToken.value || undefined,
    };
    this.#store.dispatch(Login({ request }));
  }

  gotToForgotPath() {
    this.#authService.redirectToAuthPath({
      path: 'forgot',
      redirectUrl: this.#route.snapshot.queryParams['redirectUrl'],
    });
  }

  ngOnDestroy() {
    this.#store.dispatch(ResetError());
  }
}
