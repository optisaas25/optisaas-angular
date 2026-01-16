import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FactureService } from '../../services/facture.service';
import { SalesControlService } from '../../../reports/services/sales-control.service';
import { PaiementService } from '../../services/paiement.service';
import { PaymentDialogComponent, Payment } from '../../dialogs/payment-dialog/payment-dialog.component';
import { LoyaltyService } from '../../services/loyalty.service';
import { ClientManagementService } from '../../services/client.service';
import { FicheService } from '../../services/fiche.service';
import { numberToFrench } from '../../../../utils/number-to-text';
import { PaymentListComponent } from '../../components/payment-list/payment-list.component';
import { Store } from '@ngrx/store';
import { UserCurrentCentreSelector, UserSelector } from '../../../../core/store/auth/auth.selectors';
import { take } from 'rxjs';
import { Employee } from '../../../../shared/interfaces/employee.interface';

@Component({
    selector: 'app-facture-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        RouterModule,
        PaymentListComponent
    ],
    templateUrl: './facture-form.component.html',
    styleUrls: ['./facture-form.component.scss']
})
export class FactureFormComponent implements OnInit {
    @Input() factureId: string | null = null;
    @Input() clientIdInput: string | null = null;
    @Input() ficheIdInput: string | null = null;
    @Input() initialData: any = null;
    @Input() initialLines: any[] = [];
    @Input() embedded = false;
    @Input() nomenclature: string | null = null;
    @Input() isReadonly = false;
    @Output() onSaved = new EventEmitter<any>();
    @Output() onCancelled = new EventEmitter<void>();

    form: FormGroup;
    id: string | null = null;
    isViewMode = false;
    client: any = null;
    centreId: string | null = null;

    // Totals
    totalHT = 0;
    totalTVA = 0;
    totalTTC = 0;
    montantLettres = '';
    calculatedGlobalDiscount = 0;

    // Payments
    paiements: Payment[] = [];
    montantPaye = 0;
    resteAPayer = 0;

    // Loyalty
    pointsFideliteClient = 0;

    currentUser$: Observable<any> = this.store.select(UserSelector);
    currentFacture: any = null;
    loggedInUser: any = null;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private factureService: FactureService,
        private paiementService: PaiementService,
        private loyaltyService: LoyaltyService,
        private clientService: ClientManagementService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private store: Store,
        private salesControlService: SalesControlService,
        private ficheService: FicheService,
        public cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            numero: [''], // Auto-generated
            type: ['DEVIS', Validators.required], // [MODIFIED] Default to DEVIS
            statut: ['BROUILLON', Validators.required],
            dateEmission: [new Date(), Validators.required],
            clientId: ['', Validators.required],
            lignes: this.fb.array([]),
            proprietes: this.fb.group({
                tvaRate: [0.20], // Default 20%
                nomenclature: [''],
                remiseGlobalType: ['PERCENT'], // PERCENT or AMOUNT
                remiseGlobalValue: [0],
                pointsUtilises: [0],
                vendeurId: [null]
            })
        });
    }

    ngOnInit(): void {
        this.store.select(UserSelector).pipe(take(1)).subscribe(user => this.loggedInUser = user);

        if (this.nomenclature && this.embedded) {
            this.form.patchValue({ proprietes: { nomenclature: this.nomenclature } });
        }

        if (this.embedded) {
            this.handleEmbeddedInit();
        } else {
            this.handleRouteInit();
        }

        if (!this.id || this.id === 'new') {
            this.setVendeurFromUser();
        }
    }

    setVendeurFromUser() {
        this.store.select(UserSelector).pipe(take(1)).subscribe(user => {
            if (user?.employee?.id) {
                console.log('👤 [FactureForm] Auto-setting vendeurId from current user employee:', user.employee.id);
                this.form.get('proprietes.vendeurId')?.setValue(user.employee.id);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isReadonly']) {
            this.updateViewMode();
        }
        if (changes['factureId'] && this.factureId && this.factureId !== this.id) {
            // Reload if input ID changes
            this.id = this.factureId;
            if (this.id !== 'new') {
                this.loadFacture(this.id);
            }
        }
        if (changes['nomenclature'] && this.nomenclature && this.embedded) {
            this.form.get('proprietes')?.patchValue({ nomenclature: this.nomenclature });
        }
        if (changes['initialLines'] && this.initialLines && (!this.id || this.id === 'new')) {
            // Update lines from new initialLines if we are in creation mode
            // But we should be careful not to overwrite manual edits if possible.
            // For now, if initialLines updates (e.g. equipment changed), we replace.
            this.lignes.clear();
            this.initialLines.forEach(l => {
                const group = this.createLigne();
                group.patchValue(l);
                this.lignes.push(group);
            });
            this.calculateTotals();
        }
    }

    // [NEW] Allow parent to force sync lines and totals before save
    syncLines(lines: any[]) {
        if (!lines || lines.length === 0) return;
        this.lignes.clear();
        lines.forEach(l => {
            const group = this.createLigne();
            group.patchValue(l);
            this.lignes.push(group);
        });
        this.calculateTotals();
        this.cdr.detectChanges();
    }
    // ... (rest of methods) - RESTORED
    updateViewMode() {
        // Check if we're in explicit view mode from route
        const isExplicitViewMode = this.route?.snapshot?.queryParamMap?.get('mode') === 'view';

        // Only treat as read-only if explicitly in view mode or readonly flag is set
        if (this.isReadonly || isExplicitViewMode) {
            this.isViewMode = true;
            this.form.disable();
        } else {
            this.isViewMode = false;
            this.form.enable();
            this.form.get('numero')?.disable();
            this.form.get('proprietes.pointsUtilises')?.enable();
        }
    }

    loadClientPoints(clientId: string) {
        if (!clientId) return;
        this.loyaltyService.getPointsBalance(clientId).subscribe({
            next: (points) => this.pointsFideliteClient = points,
            error: (err) => console.error('Error loading client points', err)
        });
    }

    handleEmbeddedInit() {
        this.id = this.factureId;
        if (this.clientIdInput) {
            this.form.patchValue({ clientId: this.clientIdInput });
            this.loadClientPoints(this.clientIdInput);
        }

        if (this.id && this.id !== 'new') {
            this.loadFacture(this.id);
        } else {
            // Process initialLines if provided (from parent component)
            if (this.initialLines && this.initialLines.length > 0) {
                this.lignes.clear();
                this.initialLines.forEach((l: any) => {
                    const lineGroup = this.createLigne();
                    // Map both old (designation/quantite) and new (description/qte) property names
                    const mappedLine = {
                        description: l.description || l.designation || '',
                        qte: l.qte || l.quantite || 1,
                        prixUnitaireTTC: l.prixUnitaireTTC || 0,
                        remise: l.remise || 0,
                        totalTTC: l.totalTTC || 0,
                        productId: l.productId || null,
                        entrepotId: l.entrepotId || null,
                        entrepotType: l.entrepotType || null
                    };
                    lineGroup.patchValue(mappedLine);
                    this.lignes.push(lineGroup);
                });
                this.calculateTotals();
            } else {
                this.addLine();
            }
            // Disable form for embedded new invoices too
            this.updateViewMode();
        }

    }

    handleRouteInit() {
        this.route.queryParams.subscribe(params => {
            const clientId = params['clientId'];
            const type = params['type'];
            const sourceFactureId = params['sourceFactureId'];

            const patchData: any = {};
            if (clientId) patchData.clientId = clientId;
            if (type) patchData.type = type;

            if (Object.keys(patchData).length > 0) {
                this.form.patchValue(patchData);
                if (patchData.clientId) this.loadClientPoints(patchData.clientId);

                // Redirection for NEW Devis
                if (patchData.type === 'DEVIS' && patchData.clientId && !this.embedded) {
                    this.router.navigate(['/p/clients', patchData.clientId, 'fiche-produit', 'new']);
                    return;
                }
            }

            if (sourceFactureId) {
                this.loadSourceFacture(sourceFactureId);
            }
        });

        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.loadFacture(this.id);
        } else {
            this.addLine();
        }
    }

    get lignes(): FormArray {
        return this.form.get('lignes') as FormArray;
    }

    createLigne(): FormGroup {
        return this.fb.group({
            description: ['', Validators.required],
            qte: [1, [Validators.required, Validators.min(1)]],
            prixUnitaireTTC: [0, [Validators.required, Validators.min(0)]],
            remise: [0],
            totalTTC: [0],
            productId: [null],
            entrepotId: [null],
            entrepotType: [null],
            entrepotNom: [null]
        });
    }

    addLine() {
        this.lignes.push(this.createLigne());
    }

    removeLine(index: number) {
        this.lignes.removeAt(index);
        this.calculateTotals();
    }

    onLineChange(index: number) {
        const line = this.lignes.at(index);
        const qte = line.get('qte')?.value || 0;
        const puTTC = line.get('prixUnitaireTTC')?.value || 0;
        const remise = line.get('remise')?.value || 0;

        const total = (qte * puTTC) - remise;
        line.patchValue({ totalTTC: total }, { emitEvent: false });

        this.calculateTotals();
    }

    calculateTotals() {
        const rawTotalTTC = this.lignes.controls.reduce((sum, control) => {
            return sum + (control.get('totalTTC')?.value || 0);
        }, 0);

        const props = this.form.get('proprietes')?.value;
        const remiseType = props?.remiseGlobalType || 'PERCENT';
        const remiseValue = props?.remiseGlobalValue || 0;

        let globalDiscount = 0;
        if (remiseValue > 0) {
            if (remiseType === 'PERCENT') {
                globalDiscount = rawTotalTTC * (remiseValue / 100);
            } else {
                globalDiscount = remiseValue;
            }
        }

        // Points Fidelio Deduction (1 point = 1 MAD)
        const pointsUtilises = props?.pointsUtilises || 0;
        const discountFromPoints = pointsUtilises;

        this.calculatedGlobalDiscount = globalDiscount + discountFromPoints;

        // Check for AVOIR type to allow negative totals
        const type = this.form.get('type')?.value;
        if (type === 'AVOIR' || type === 'AVOIR_FOURNISSEUR') {
            this.totalTTC = rawTotalTTC - this.calculatedGlobalDiscount;
        } else {
            this.totalTTC = Math.max(0, rawTotalTTC - this.calculatedGlobalDiscount);
        }

        const tvaRate = 0.20;
        this.totalHT = this.totalTTC / (1 + tvaRate);
        this.totalTVA = this.totalTTC - this.totalHT;

        this.montantLettres = this.numberToText(this.totalTTC);

        this.calculatePaymentTotals();
        this.updateStatutFromPayments();
    }

    loadFacture(id: string) {
        this.factureService.findOne(id).subscribe({
            next: (facture) => {
                // REDIRECTION SAFETY NET: If linked to a specialized fiche, go to that fiche form instead
                if (!this.embedded && facture.ficheId) {
                    this.ficheService.getFicheById(facture.ficheId).subscribe(fiche => {
                        if (fiche) {
                            const routePath = `fiche-${fiche.type.toLowerCase()}`;
                            this.router.navigate(['/p/clients', facture.clientId, routePath, fiche.id]);
                        }
                    });
                }

                console.log('📄 Loaded facture:', facture);
                console.log('📋 Nomenclature:', facture.proprietes?.nomenclature);

                this.form.patchValue({
                    numero: facture.numero,
                    type: facture.type,
                    statut: facture.statut,
                    dateEmission: facture.dateEmission,
                    clientId: facture.clientId,
                    proprietes: facture.proprietes
                });

                if (facture.clientId) {
                    this.loadClientPoints(facture.clientId);
                }

                this.client = facture.client;

                // Patch lines
                this.lignes.clear();
                if (facture.lignes) {
                    (facture.lignes as any[]).forEach((l: any) => {
                        const lineGroup = this.createLigne();
                        lineGroup.patchValue(l);
                        this.lignes.push(lineGroup);
                    });
                }

                // Load payments
                if (facture.paiements) {
                    this.paiements = facture.paiements as any[];
                }

                this.calculateTotals();
                this.calculatePaymentTotals();
                this.updateStatutFromPayments();

                // Explicitly update view mode to ensure new lines are disabled if needed
                this.updateViewMode();
            },
            error: (err) => {
                console.error(err);
                this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
            }
        });
    }

    save() {
        this.saveAsObservable().subscribe();
    }

    saveAsObservable(showNotification = true, extraProperties: any = null, forcedStatut: string | null = null): Observable<any> {
        if (this.form.invalid) return new Observable(obs => obs.next(null));

        // Ensure nomenclature from input is in the form before saving
        if (this.nomenclature && this.embedded) {
            const currentPropretes = this.form.get('proprietes')?.value || {};
            this.form.get('proprietes')?.patchValue({
                ...currentPropretes,
                nomenclature: this.nomenclature
            });
            console.log('📋 Syncing nomenclature to form before save:', this.nomenclature);
        }

        const formData = this.form.getRawValue();

        // proprietes MUST be included now, merged with extraProperties
        const { paiements, ...restFormData } = formData;

        // FORCE: Always re-apply current session user for traceability (unless read-only maybe?)
        // But better to ensure it's there for any save operation.
        const currentProprietes = restFormData.proprietes || {};

        // We attempt to get the employee ID one last time if missing in the form for some reason
        let finalVendeurId = currentProprietes.vendeurId;
        if (!finalVendeurId) {
            this.store.select(UserSelector).pipe(take(1)).subscribe(user => {
                if (user?.employee?.id) finalVendeurId = user.employee.id;
            });
        }

        const mergedProprietes = {
            ...currentProprietes,
            ...(extraProperties || {}),
            vendeurId: finalVendeurId // Force the ID
        };

        console.log('📝 FactureFormComponent.saveAsObservable - Merged Properties:', mergedProprietes);

        // [FIX] Force CD before preparing data object to ensure any recent patches are reflected
        this.cdr.detectChanges();

        const factureData: any = {
            ...restFormData,
            statut: forcedStatut || restFormData.statut, // [FIX] Force status if provided by parent
            centreId: this.centreId, // CRITICAL: Propagation for stock decrement fallback
            proprietes: mergedProprietes,
            ficheId: this.ficheIdInput, // Include link to Fiche
            totalHT: this.totalHT,
            totalTVA: this.totalTVA,
            totalTTC: this.totalTTC,
            montantLettres: this.montantLettres,
            // paiements: excluded
            resteAPayer: this.resteAPayer
        };

        console.log('💾 Saving facture with data:', {
            id: this.id,
            proprietes: factureData.proprietes,
            nomenclature: factureData.proprietes?.nomenclature
        });

        const request = this.id && this.id !== 'new'
            ? this.factureService.update(this.id, factureData)
            : this.factureService.create(factureData);

        return request.pipe(
            map(facture => {
                this.id = facture.id; // Update internal ID to prevent duplicates

                console.log('✅ [FactureForm] Save successful. Returned:', facture);

                // IMPORTANT: Update form with returned data (Official Number, New Status, etc.)
                // Use getRawValue() to check against current value even if disabled
                const currentNumero = this.form.getRawValue().numero;
                if (facture.numero && facture.numero !== currentNumero) {
                    console.log(`📝 [FactureForm] Patching generated number: ${facture.numero} (was: ${currentNumero})`);
                    this.form.patchValue({
                        numero: facture.numero,
                        statut: facture.statut,
                    }, { emitEvent: true });
                }

                // Also update local currentFacture for displayTitle reactivity
                this.currentFacture = { ...facture };
                this.cdr.detectChanges(); // [FIX] Force UI update (Titles, Numbers)

                if (showNotification) {
                    this.snackBar.open('Document enregistré avec succès', 'Fermer', { duration: 3000 });
                }
                if (this.embedded) {
                    this.onSaved.emit(facture);
                } else if (!this.id || this.id === 'new') { // This condition will now be false for 'this.id'
                    // logic adjusted below
                }
                // Navigation logic for standalone mode
                if (!this.embedded && this.id !== this.route.snapshot.paramMap.get('id')) {
                    this.router.navigate(['/p/clients/factures', this.id], { replaceUrl: true });
                }
                return facture;
            }),
            catchError(err => {
                if (err.status === 409) {
                    console.log('⚠️ [FactureForm] Race condition: Invoice already exists (409). Treating as success.');
                    // Don't show error snackbar for 409
                    // We re-throw so the parent (MontureForm) can handle it (we'll fix parent next)
                    // OR we could recover here, but the parent expects a Returned Invoice object.
                    // Ideally, we shouldn't fail.
                    throw err;
                }
                console.error('Erreur sauvegarde facture:', err);
                const message = err.error?.message || 'Erreur lors de l\'enregistrement';
                this.snackBar.open(message, 'Fermer', { duration: 5000 });
                throw err;
            })
        );
    }

    numberToText(num: number): string {
        return numberToFrench(num);
    }

    loadSourceFacture(id: string) {
        this.factureService.findOne(id).subscribe({
            next: (facture) => {
                // Copy lines from source invoice
                this.lignes.clear();
                if (facture.lignes) {
                    (facture.lignes as any[]).forEach((l: any) => {
                        const lineGroup = this.createLigne();
                        lineGroup.patchValue(l);
                        this.lignes.push(lineGroup);
                    });
                }
                this.calculateTotals();
                this.snackBar.open('Données chargées depuis la facture ' + facture.numero, 'OK', { duration: 3000 });
            },
            error: (err) => console.error('Error loading source facture', err)
        });
    }

    // ===== PAYMENT METHODS =====

    openPaymentDialog() {
        if (!this.id || this.id === 'new') {
            this.snackBar.open('Veuillez d\'abord enregistrer la facture', 'Fermer', { duration: 3000 });
            return;
        }

        const currentStatut = this.form.get('statut')?.value;
        if (currentStatut === 'BROUILLON') {
            this.snackBar.open('La facture doit être validée ou au moins au stade de Devis avant paiement', 'Fermer', { duration: 3000 });
            return;
        }

        const dialogRef = this.dialog.open(PaymentDialogComponent, {
            maxWidth: '90vw',
            data: {
                resteAPayer: this.resteAPayer,
                client: this.client
            }
        });

        dialogRef.afterClosed().subscribe((payment: Payment) => {
            if (payment) {
                this.createPayment(payment);
            }
        });
    }

    createPayment(payment: Payment) {
        if (!this.id) return;

        this.paiementService.create({
            ...payment,
            factureId: this.id,
            date: payment.date ? (typeof payment.date === 'string' ? payment.date : payment.date.toISOString()) : new Date().toISOString(),
            mode: payment.mode.toString(),
            dateVersement: payment.dateVersement ? (typeof payment.dateVersement === 'string' ? payment.dateVersement : payment.dateVersement.toISOString()) : undefined,
        }).subscribe({
            next: (savedPayment) => {
                this.snackBar.open('Paiement enregistré', 'Fermer', { duration: 3000 });
                // Reload facture to get updated status and remaining amount
                this.loadFacture(this.id!);
            },
            error: (err) => {
                console.error('Error creating payment:', err);
                this.snackBar.open('Erreur lors de l\'enregistrement du paiement', 'Fermer', { duration: 3000 });
            }
        });
    }

    // Deprecated/Modified: addPayment no longer pushes to local array directly for persistence, 
    // but we keep it if needed for view update before reload (optional)
    addPayment(payment: Payment) {
        // logic moved to createPayment
    }

    removePayment(index: number) {
        this.paiements.splice(index, 1);
        this.calculatePaymentTotals();
        this.updateStatutFromPayments();
    }

    calculatePaymentTotals() {
        this.montantPaye = this.paiements.reduce((sum, p) => sum + p.montant, 0);
        this.resteAPayer = this.totalTTC - this.montantPaye;
    }

    updateStatutFromPayments() {
        // Only auto-update if we are not explicitly VALIDE or VENTE_EN_INSTANCE
        const currentStatut = this.form.get('statut')?.value;

        // If it's a Devis, we don't use the standard invoice statuses (PARTIEL/PAYEE)
        // unless it's just been validated.
        if (this.form.get('type')?.value === 'DEVIS' && currentStatut !== 'VALIDE') {
            // Keep current Devis status (DEVIS_EN_COURS, VENTE_EN_INSTANCE, etc.)
            // But if we want to automatically mark as instance when paid?
            // Usually we rely on the prompt in MontureForm.
            return;
        }

        if (this.resteAPayer <= 0 && this.totalTTC > 0) {
            this.form.patchValue({ statut: 'PAYEE' });
        } else if (this.montantPaye > 0) {
            // If user has manually set VALIDE, don't revert to PARTIEL
            if (currentStatut !== 'VALIDE' && currentStatut !== 'VENTE_EN_INSTANCE') {
                this.form.patchValue({ statut: 'PARTIEL' });
            }
        }
    }

    getPaymentStatusBadge(): { label: string; class: string } {
        if (this.resteAPayer <= 0 && this.totalTTC > 0) {
            return { label: 'PAYÉE', class: 'badge-paid' };
        } else if (this.montantPaye > 0) {
            return { label: 'PARTIEL', class: 'badge-partial' };
        } else {
            return { label: 'IMPAYÉE', class: 'badge-unpaid' };
        }
    }

    getPaymentModeLabel(mode: string): string {
        const modes: any = {
            'ESPECES': 'Espèces',
            'CARTE': 'Carte',
            'CHEQUE': 'Chèque',
            'VIREMENT': 'Virement',
            'AUTRE': 'Autre'
        };
        return modes[mode] || mode;
    }

    getVendeurName(): string {
        if (this.currentFacture?.vendeur) {
            return `${this.currentFacture.vendeur.prenom} ${this.currentFacture.vendeur.nom}`;
        }

        const user = this.loggedInUser;
        if (user) {
            if (user.employee) return `${user.employee.prenom} ${user.employee.nom}`;
            if (user.fullName) return user.fullName;
            if (user.email) return user.email;
        }

        return 'Utilisateur';
    }

    get isBonDeCommande(): boolean {
        const type = this.form.get('type')?.value;
        const statut = this.form.get('statut')?.value;
        const numero = this.form.get('numero')?.value;

        // It's a BC if type is DEVIS and it has a BC number or specific order status
        // Also if it's a DEVIS that has payments (PARTIEL/PAYEE), it's effectively an order
        return type === 'DEVIS' && (
            statut === 'VENTE_EN_INSTANCE' ||
            (numero && (numero.startsWith('BC-') || numero.includes('BC'))) ||
            statut === 'PARTIEL' ||
            statut === 'PAYEE'
        );
    }

    get displayTitle(): string {
        const type = this.form.get('type')?.value || 'FACTURE';
        const numero = this.form.get('numero')?.value;
        const statut = this.form.get('statut')?.value;

        // Detect labels based on prefix or status
        const isBC = this.isBonDeCommande;
        const isDevis = (type === 'DEVIS' && !isBC) || (numero && numero.startsWith('DEV-'));

        // [FIX] Priority: Use generated serial number if available
        if (numero && (numero.length > 3)) {
            if (isBC) return `Bon de Commande ${numero}`;
            if (isDevis) return `Devis ${numero}`;
            return `Facture ${numero}`;
        }

        if (!this.id || this.id === 'new') {
            if (isBC) return 'Nouveau Bon de Commande';
            return type === 'DEVIS' ? 'Nouveau Devis' : 'Nouvelle Facture';
        }

        if (isBC) return `Bon de Commande ${numero || ''}`;
        if (isDevis) return `Devis ${numero || ''}`;
        return `Facture ${numero || ''}`;
    }

    convertToInvoice() {
        if (!this.id || this.id === 'new') return;

        if (!confirm("Voulez-vous transformer ce Bon de Commande en Facture officielle ?")) return;

        this.salesControlService.validateInvoice(this.id).subscribe({
            next: (updated: any) => {
                this.snackBar.open(`Facture générée : ${updated.numero}`, 'Fermer', { duration: 5000 });
                this.loadFacture(this.id!); // Refresh UI
            },
            error: (err: any) => {
                console.error('Error generating invoice:', err);
                const msg = err.error?.message || 'Erreur lors de la génération de la facture';
                this.snackBar.open(msg, 'Fermer', { duration: 5000 });
            }
        });
    }

    get canExchange(): boolean {
        const type = this.form.get('type')?.value;
        const statut = this.form.get('statut')?.value;
        return type === 'FACTURE' && (statut === 'VALIDE' || statut === 'PAYEE' || statut === 'PARTIEL');
    }

    openExchangeDialog() {
        if (!this.id) return;

        import('../../dialogs/invoice-return-dialog/invoice-return-dialog.component').then(m => {
            const dialogRef = this.dialog.open(m.InvoiceReturnDialogComponent, {
                width: '800px',
                data: {
                    facture: {
                        id: this.id,
                        numero: this.form.get('numero')?.value,
                        lignes: this.lignes.getRawValue()
                    }
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    const itemsWithReason = result.items.map((it: any) => ({
                        ...it,
                        reason: result.reason
                    }));

                    this.factureService.exchangeInvoice(this.id!, itemsWithReason).subscribe({
                        next: (res) => {
                            this.snackBar.open(`Échange effectué : Avoir ${res.avoir.numero} et Facture ${res.newFacture.numero} créés`, 'Fermer', {
                                duration: 5000
                            });
                            if (this.embedded) {
                                this.onSaved.emit(res.newFacture);
                            } else {
                                this.router.navigate(['/p/clients/factures', res.newFacture.id]);
                            }
                        },
                        error: (err) => {
                            console.error('Erreur lors de l\'échange:', err);
                            this.snackBar.open('Erreur lors de l\'échange: ' + (err.error?.message || 'Erreur serveur'), 'Fermer', {
                                duration: 3000
                            });
                        }
                    });
                }
            });
        });
    }

    print() {
        window.print();
    }
}
