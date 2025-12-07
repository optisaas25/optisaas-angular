import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CameraViewComponent } from '../camera-view/camera-view.component';
import { Measurement } from '../../models/measurement.model';

@Component({
    selector: 'app-virtual-centering-modal',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        CameraViewComponent
    ],
    templateUrl: './virtual-centering-modal.component.html',
    styleUrls: ['./virtual-centering-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualCenteringModalComponent {
    currentMeasurement: Measurement | null = null;
    capturedMeasurement: Measurement | null = null;

    constructor(
        private dialogRef: MatDialogRef<VirtualCenteringModalComponent>
    ) { }

    onMeasurementChange(measurement: Measurement): void {
        this.currentMeasurement = measurement;
    }

    captureMeasurement(): void {
        if (this.currentMeasurement) {
            this.capturedMeasurement = { ...this.currentMeasurement };
        }
    }

    validateMeasurement(): void {
        if (this.capturedMeasurement) {
            this.dialogRef.close(this.capturedMeasurement);
        }
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
