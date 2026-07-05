import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { API_URL } from '../../../config/api.config';
import { GetCurrentUser } from '../../../core/store/auth/auth.actions';
import { UserSelector } from '../../../core/store/auth/auth.selectors';

@Component({
  selector: 'app-mfa-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './mfa-settings.component.html',
})
export class MfaSettingsComponent implements OnInit {
  protected user = this.store.selectSignal(UserSelector);
  protected qrCodeDataUrl: string | null = null;
  protected verificationCode = '';
  protected loading = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.store.dispatch(GetCurrentUser());
  }

  startSetup(): void {
    this.loading = true;
    this.http.post<{ secret: string; qrCodeDataUrl: string }>(`${API_URL}/mfa/setup`, {}).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.qrCodeDataUrl = res.qrCodeDataUrl;
          this.loading = false;
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.snackBar.open("Erreur lors de l'initialisation du MFA", 'Fermer', { duration: 3000 });
          this.loading = false;
        });
      },
    });
  }

  confirmSetup(): void {
    if (!this.verificationCode) return;
    this.loading = true;
    this.http.post(`${API_URL}/mfa/verify`, { token: this.verificationCode }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.qrCodeDataUrl = null;
          this.verificationCode = '';
          this.loading = false;
          this.snackBar.open('Authentification à deux facteurs activée', 'Fermer', { duration: 3000 });
          this.store.dispatch(GetCurrentUser());
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.snackBar.open(err.error?.message || 'Code invalide', 'Fermer', { duration: 3000 });
          this.loading = false;
        });
      },
    });
  }

  disable(): void {
    if (!this.verificationCode) return;
    this.loading = true;
    this.http.post(`${API_URL}/mfa/disable`, { token: this.verificationCode }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.verificationCode = '';
          this.loading = false;
          this.snackBar.open('Authentification à deux facteurs désactivée', 'Fermer', { duration: 3000 });
          this.store.dispatch(GetCurrentUser());
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.snackBar.open(err.error?.message || 'Code invalide', 'Fermer', { duration: 3000 });
          this.loading = false;
        });
      },
    });
  }
}
