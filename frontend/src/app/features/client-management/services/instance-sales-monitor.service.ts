import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, of, forkJoin } from 'rxjs';
import { startWith, switchMap, tap, map, catchError, take } from 'rxjs/operators';
import { FactureService } from './facture.service';
import { ProductService } from '../../stock-management/services/product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserCurrentCentreSelector } from '../../../core/store/auth/auth.selectors';

export interface InstanceSale {
    facture: any;
    status: 'IN_TRANSIT' | 'READY' | 'CANCELLED' | 'UNKNOWN';
    products?: any[];
    isTransferRelated?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class InstanceSalesMonitorService {
    private instanceSales$ = new BehaviorSubject<InstanceSale[]>([]);
    private readyToValidateCount$ = new BehaviorSubject<number>(0);
    private pendingShipmentCount$ = new BehaviorSubject<number>(0);
    private waitingReceptionCount$ = new BehaviorSubject<number>(0);

    private notifiedSales = new Set<string>();
    private notifiedShipments = new Set<string>();
    private isPolling = false;

    constructor(
        private factureService: FactureService,
        private productService: ProductService,
        private snackBar: MatSnackBar,
        private router: Router,
        private store: Store
    ) { }

    startPolling(): void {
        if (this.isPolling) return;

        this.isPolling = true;
        console.log('🔄 Starting Transfer & Instance Monitor polling...');

        // Poll every 15 seconds for better responsiveness on transfers
        interval(15 * 1000).pipe(
            startWith(0),
            switchMap(() => forkJoin({
                sales: this.checkInstanceSales(),
                transfers: this.checkPendingTransfers()
            }))
        ).subscribe({
            next: (data) => console.log('✅ Monitor Cycle Complete:', data),
            error: (err) => console.error('❌ Monitor Cycle Error:', err)
        });
    }

    stopPolling(): void {
        this.isPolling = false;
        console.log('⏸️ Stopped Monitor polling');
    }

    private checkPendingTransfers(): Observable<any> {
        console.log('🔍 Checking pending transfers (Incoming/Outgoing)...');
        return this.store.select(UserCurrentCentreSelector).pipe(
            take(1),
            switchMap((center: any) => {
                if (!center) return of([]);
                return this.productService.findAll({ global: true }).pipe(
                    map(products => {
                        // 1. Pending SHIPMENTS (Outgoing from THIS center)
                        const shipments = products.filter(p =>
                            p.entrepot?.centreId === center.id &&
                            p.specificData?.pendingOutgoing?.some((t: any) => t.status !== 'SHIPPED')
                        );
                        this.pendingShipmentCount$.next(shipments.length);
                        this.showShipmentNotifications(shipments);

                        // 2. Waiting RECEPTIONS (Incoming to THIS center)
                        const receptions = products.filter(p =>
                            p.entrepot?.centreId === center.id &&
                            p.specificData?.pendingIncoming &&
                            p.specificData.pendingIncoming.status === 'SHIPPED'
                        );
                        this.waitingReceptionCount$.next(receptions.length);

                        return { shipments, receptions };
                    })
                );
            }),
            catchError(err => {
                console.error('❌ Error checking transfers:', err);
                return of({ shipments: [], receptions: [] });
            })
        );
    }

    private showShipmentNotifications(shipments: any[]): void {
        shipments.forEach(p => {
            const transferId = `${p.id}_ship`;
            if (!this.notifiedShipments.has(transferId)) {
                const snackBarRef = this.snackBar.open(
                    `📦 Nouveau transfert demandé pour ${p.designation}`,
                    'EXPÉDIER',
                    { duration: 15000, panelClass: 'shipping-snack' }
                );
                snackBarRef.onAction().subscribe(() => {
                    this.router.navigate(['/p/stock/transfers']);
                });
                this.notifiedShipments.add(transferId);
            }
        });
    }

    private checkInstanceSales(): Observable<InstanceSale[]> {
        console.log('🔍 Checking instance sales status...');
        return this.factureService.findAll({ statut: 'VENTE_EN_INSTANCE' }).pipe(
            switchMap(factures => {
                if (factures.length === 0) return of([]);
                const checks = factures.map(f => this.checkSaleStatus(f));
                return forkJoin(checks);
            }),
            tap(sales => {
                this.instanceSales$.next(sales);
                const readyCount = sales.filter(s => s.status === 'READY').length;
                this.readyToValidateCount$.next(readyCount);
                this.showNotificationIfReady(sales);
            }),
            catchError(err => {
                console.error('❌ Error checking instance sales:', err);
                return of([]);
            })
        );
    }

    private checkSaleStatus(facture: any): Observable<InstanceSale> {
        const lines = (facture.lignes as any[]) || [];
        const items = lines.filter(l => l.productId || l.description);

        if (items.length === 0) return of(({ facture, status: 'UNKNOWN' }) as InstanceSale);

        return this.store.select(UserCurrentCentreSelector).pipe(
            take(1),
            switchMap(center => {
                let hasForeignSource = false;

                const checks = items.map(item => {
                    let check$ = item.productId ?
                        this.productService.findOne(item.productId).pipe(catchError(() => of(null))) :
                        of(null);

                    return check$.pipe(
                        switchMap(product => {
                            // Detect if the original product reference is from another center
                            if (product && product.entrepot?.centreId !== center.id) {
                                hasForeignSource = true;
                            }

                            if (product && product.entrepot?.centreId === center.id) {
                                return of(product);
                            }
                            return this.productService.findAll({ global: true }).pipe(
                                map(allProducts => {
                                    const match = allProducts.find(p =>
                                        p.entrepot?.centreId === center.id &&
                                        (p.designation === item.description || p.codeInterne === item.reference || p.codeBarres === item.reference)
                                    );
                                    return match || product;
                                }),
                                catchError(() => of(product))
                            );
                        })
                    );
                });

                return forkJoin(checks).pipe(
                    map(products => {
                        const validProducts = products.filter(p => p !== null);
                        if (validProducts.length === 0) return ({ facture, status: 'UNKNOWN', isTransferRelated: hasForeignSource }) as InstanceSale;

                        const allReceived = validProducts.every(p =>
                            (p.entrepot?.centreId === center.id && (p.quantiteActuelle > 0 || p.statut === 'DISPONIBLE'))
                        );

                        const someInTransit = validProducts.some(p =>
                            p.statut === 'EN_TRANSIT' ||
                            p.specificData?.pendingIncoming?.status === 'SHIPPED' ||
                            (p.entrepot?.centreId !== center.id && p.statut === 'RESERVE')
                        );

                        const cancelled = validProducts.some(p =>
                            p.entrepot?.centreId !== center.id &&
                            !p.specificData?.pendingOutgoing &&
                            p.quantiteActuelle > 0
                        );

                        let status: 'IN_TRANSIT' | 'READY' | 'CANCELLED' | 'UNKNOWN';
                        if (allReceived) status = 'READY';
                        else if (someInTransit) status = 'IN_TRANSIT';
                        else if (cancelled) status = 'CANCELLED';
                        else status = 'UNKNOWN';

                        return ({ facture, status, products: validProducts, isTransferRelated: hasForeignSource }) as InstanceSale;
                    })
                );
            })
        ) as Observable<InstanceSale>;
    }

    private showNotificationIfReady(sales: InstanceSale[]): void {
        const newlyReady = sales.filter(s =>
            s.status === 'READY' &&
            s.isTransferRelated && // ONLY notify if it was waiting for a transfer
            !this.notifiedSales.has(s.facture.id)
        );
        newlyReady.forEach(sale => {
            const snackBarRef = this.snackBar.open(
                `✅ Produit reçu ! Vente ${sale.facture.numero} prête à valider.`,
                'VOIR',
                { duration: 15000 }
            );
            snackBarRef.onAction().subscribe(() => this.router.navigate(['/p/finance/sales-control']));
            this.notifiedSales.add(sale.facture.id);
        });
    }

    getInstanceSales(): Observable<InstanceSale[]> { return this.instanceSales$.asObservable(); }
    getReadyToValidateCount(): Observable<number> { return this.readyToValidateCount$.asObservable(); }
    getPendingShipmentCount(): Observable<number> { return this.pendingShipmentCount$.asObservable(); }
    getWaitingReceptionCount(): Observable<number> { return this.waitingReceptionCount$.asObservable(); }

    refreshNow(): void {
        forkJoin({
            sales: this.checkInstanceSales(),
            transfers: this.checkPendingTransfers()
        }).subscribe();
    }

    clearNotification(saleId: string): void { this.notifiedSales.delete(saleId); }
}
