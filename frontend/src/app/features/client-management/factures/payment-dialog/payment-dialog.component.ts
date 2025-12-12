import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PaymentDialogData {
    resteAPayer: number;
}

export interface Payment {
    date: Date;
    montant: number;
    mode: 'ESPECES' | 'CARTE' | 'CHEQUE' | 'VIREMENT' | 'AUTRE';
    reference?: string;
    notes?: string;
}

@Component({
    selector: 'app-payment-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './payment-dialog.component.html',
    styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent {
    form: FormGroup;
    maxAmount: number;

    paymentModes = [
        { value: 'ESPECES', label: 'Espèces' },
        { value: 'CARTE', label: 'Carte Bancaire' },
        { value: 'CHEQUE', label: 'Chèque' },
        { value: 'VIREMENT', label: 'Virement' },
        { value: 'AUTRE', label: 'Autre' }
    ];

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<PaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData
    ) {
        this.maxAmount = data.resteAPayer;

        this.form = this.fb.group({
            date: [new Date(), Validators.required],
            montant: [
                this.maxAmount,
                [
                    Validators.required,
                    Validators.min(0.01),
                    Validators.max(this.maxAmount)
                ]
            ],
            mode: ['ESPECES', Validators.required],
            reference: [''],
            notes: ['']
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.form.valid) {
            const payment: Payment = this.form.value;
            this.dialogRef.close(payment);
        }
    }
}
