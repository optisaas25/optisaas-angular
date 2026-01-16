import { Injectable } from '@angular/core';
import { FinanceService } from './finance.service';
import { BehaviorSubject, Observable, interval, of, forkJoin } from 'rxjs';
import { startWith, switchMap, catchError, map, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { UserCurrentCentreSelector } from '../../../core/store/auth/auth.selectors';

@Injectable({
    providedIn: 'root'
})
export class FinanceMonitorService {
    private pendingFundingCount$ = new BehaviorSubject<number>(0);
    private portfolioAlertCount$ = new BehaviorSubject<number>(0);
    private isPolling = false;

    constructor(
        private financeService: FinanceService,
        private store: Store
    ) { }

    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;

        interval(15000).pipe(
            startWith(0),
            switchMap(() => this.store.select(UserCurrentCentreSelector).pipe(
                switchMap(center => {
                    if (!center) return of({ funding: 0, alerts: 0 });
                    return forkJoin({
                        funding: this.financeService.getFundingRequests(center.id, 'EN_ATTENTE').pipe(
                            map(requests => requests.length),
                            catchError(() => of(0))
                        ),
                        alerts: this.financeService.getPortfolioAlerts(center.id).pipe(
                            map(alerts => alerts.total),
                            catchError(() => of(0))
                        )
                    });
                })
            ))
        ).subscribe(data => {
            this.pendingFundingCount$.next(data.funding);
            this.portfolioAlertCount$.next(data.alerts);
        });
    }

    getPendingFundingCount(): Observable<number> {
        return this.pendingFundingCount$.asObservable().pipe(distinctUntilChanged());
    }

    getPortfolioAlertCount(): Observable<number> {
        return this.portfolioAlertCount$.asObservable().pipe(distinctUntilChanged());
    }
}
