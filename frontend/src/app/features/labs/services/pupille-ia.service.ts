import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PupilleIAService {
    init(video: HTMLVideoElement, callback: (res: any) => void) {
        console.log('PupilleIAService init stub');
        // Simulated callback with mock data
        setTimeout(() => {
            callback({
                multiFaceLandmarks: [
                    [{ x: 0.5, y: 0.5, z: 0 }]
                ]
            });
        }, 1000);
    }
}
