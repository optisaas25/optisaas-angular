import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleMeasureResult } from '../../models';

@Component({
    selector: 'app-centering-results',
    templateUrl: './centering-results.component.html',
    styleUrls: ['./centering-results.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class CenteringResultsComponent {
    @Input() result?: SimpleMeasureResult;
    @Input() animationUrl?: string;
    @Output() save = new EventEmitter<{ result: SimpleMeasureResult, animationUrl?: string }>();

    onSave() { if (this.result) this.save.emit({ result: this.result, animationUrl: this.animationUrl }); }
}
