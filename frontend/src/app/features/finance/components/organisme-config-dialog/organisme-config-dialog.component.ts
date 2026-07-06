import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FinanceService } from '../../services/finance.service';
import { OrganismeListItem } from '../../models/finance.models';

@Component({
    selector: 'app-organisme-config-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressBarModule,
    ],
    templateUrl: './organisme-config-dialog.component.html',
    styles: [`
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
    .col { flex: 1; min-width: 200px; }
  `],
})
export class OrganismeConfigDialogComponent {
    form: FormGroup;
    submitting = false;

    constructor(
        private fb: FormBuilder,
        private financeService: FinanceService,
        private cdr: ChangeDetectorRef,
        public dialogRef: MatDialogRef<OrganismeConfigDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { organisme: OrganismeListItem },
    ) {
        this.form = this.fb.group({
            plafondRemboursement: [data.organisme.plafondRemboursement ?? null],
            apiEndpoint: [data.organisme.apiCredentials?.apiEndpoint || ''],
            apiKey: [''],
            apiSecret: [''],
            notes: [data.organisme.apiCredentials?.notes || ''],
        });
    }

    protected hasApiKey(): boolean {
        return !!this.data.organisme.apiCredentials?.hasApiKey;
    }

    protected hasApiSecret(): boolean {
        return !!this.data.organisme.apiCredentials?.hasApiSecret;
    }

    onSubmit(): void {
        this.submitting = true;
        this.cdr.detectChanges();
        const { plafondRemboursement, apiEndpoint, apiKey, apiSecret, notes } = this.form.value;
        this.financeService
            .updateOrganismeConfig(this.data.organisme.id, {
                plafondRemboursement,
                apiCredentials: { apiEndpoint, apiKey, apiSecret, notes },
            })
            .subscribe({
                next: (res) => this.dialogRef.close(res),
                error: (err) => {
                    console.error('Update failed', err);
                    this.submitting = false;
                },
            });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
