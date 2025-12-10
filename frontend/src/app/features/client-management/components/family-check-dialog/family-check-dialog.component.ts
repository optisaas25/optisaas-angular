import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Client } from '../../models/client.model';

export interface FamilyCheckDialogData {
    existingClients: Client[];
    currentNom: string;
}

export interface FamilyCheckDialogResult {
    action: 'join' | 'new';
    targetClient?: Client;
}

@Component({
    selector: 'app-family-check-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule, MatIconModule],
    templateUrl: './family-check-dialog.component.html',
    styles: [`
    .dialog-content { min-width: 500px; }
    table { width: 100%; margin-bottom: 20px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  `]
})
export class FamilyCheckDialogComponent {
    displayedColumns: string[] = ['prenom', 'cin', 'telephone', 'ville', 'action'];

    constructor(
        public dialogRef: MatDialogRef<FamilyCheckDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: FamilyCheckDialogData
    ) { }

    joinGroup(client: Client): void {
        this.dialogRef.close({ action: 'join', targetClient: client });
    }

    createNew(): void {
        this.dialogRef.close({ action: 'new' });
    }
}
