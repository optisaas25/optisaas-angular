import { Component, OnInit, signal } from '@angular/core';
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
import { GetCurrentUserSuccess } from '../../../core/store/auth/auth.actions';
import { UserSelector } from '../../../core/store/auth/auth.selectors';
import { AuthService } from '../../authentication/services/auth.service';

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
  protected qrCodeDataUrl = signal<string | null>(null);
  protected verificationCode = signal('');
  protected loading = signal(false);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private store: Store,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.refreshCurrentUser();
  }

  /**
   * Refreshes the current user in the store so mfaEnabled reflects the latest
   * state. Dispatches GetCurrentUserSuccess directly instead of GetCurrentUser
   * to avoid the app-wide "navigate to /p/clients" side effect tied to that
   * action, which would otherwise bounce the user off this settings page.
   */
  private refreshCurrentUser(): void {
    this.authService.getCurrentUser().subscribe((user) => {
      this.store.dispatch(GetCurrentUserSuccess({ user }));
    });
  }

  startSetup(): void {
    this.loading.set(true);
    this.http.post<{ secret: string; qrCodeDataUrl: string }>(`${API_URL}/mfa/setup`, {}).subscribe({
      next: (res) => {
        this.qrCodeDataUrl.set(res.qrCodeDataUrl);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open("Erreur lors de l'initialisation du MFA", 'Fermer', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  confirmSetup(): void {
    if (!this.verificationCode()) return;
    this.loading.set(true);
    this.http.post(`${API_URL}/mfa/verify`, { token: this.verificationCode() }).subscribe({
      next: () => {
        this.qrCodeDataUrl.set(null);
        this.verificationCode.set('');
        this.loading.set(false);
        this.snackBar.open('Authentification à deux facteurs activée', 'Fermer', { duration: 3000 });
        this.refreshCurrentUser();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Code invalide', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  disable(): void {
    if (!this.verificationCode()) return;
    this.loading.set(true);
    this.http.post(`${API_URL}/mfa/disable`, { token: this.verificationCode() }).subscribe({
      next: () => {
        this.verificationCode.set('');
        this.loading.set(false);
        this.snackBar.open('Authentification à deux facteurs désactivée', 'Fermer', { duration: 3000 });
        this.refreshCurrentUser();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Code invalide', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }
}
