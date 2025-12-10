import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CameraCaptureComponent } from './components/camera-capture/camera-capture.component';
import { AnalysisPreviewComponent } from './components/analysis-preview/analysis-preview.component';
import { CenteringResultsComponent } from './components/centering-results/centering-results.component';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        FormsModule,
        CameraCaptureComponent,
        AnalysisPreviewComponent,
        CenteringResultsComponent
    ],
    exports: [CameraCaptureComponent, AnalysisPreviewComponent, CenteringResultsComponent]
})
export class CenteringModule { }
