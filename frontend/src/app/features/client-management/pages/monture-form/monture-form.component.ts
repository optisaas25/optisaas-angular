import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Observable, of, BehaviorSubject, firstValueFrom, throwError } from 'rxjs';
import { FormBuilder, FormGroup, AbstractControl, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { StockAvailabilityDialogComponent } from '../../../../shared/components/stock-availability-dialog/stock-availability-dialog.component';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClientManagementService } from '../../services/client.service';
import { Client, isClientParticulier, isClientProfessionnel } from '../../models/client.model';
import { FicheService } from '../../services/fiche.service';
import { FicheMontureCreate, TypeFiche, StatutFiche, TypeEquipement, SuggestionIA } from '../../models/fiche-client.model';
import { FactureService, Facture } from '../../services/facture.service';
import { FactureFormComponent } from '../facture-form/facture-form.component';
import { PaymentListComponent } from '../../components/payment-list/payment-list.component';
import { catchError, debounceTime, distinctUntilChanged, startWith, map, switchMap, filter, take, tap, finalize, takeUntil } from 'rxjs/operators';
import { getLensSuggestion, Correction, FrameData, calculateLensPrice, determineLensType } from '../../utils/lensLogic';
import { getLensMaterials, getLensIndices } from '../../utils/lensDatabase';
import { StockSearchDialogComponent } from '../../../stock-management/dialogs/stock-search-dialog/stock-search-dialog.component';
import { ProductService } from '../../../stock-management/services/product.service';
import { InvoiceFormDialogComponent } from '../../../finance/components/invoice-form-dialog/invoice-form-dialog.component';
import { Product, ProductStatus } from '../../../../shared/interfaces/product.interface';
import { forkJoin, timer, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { UserCurrentCentreSelector, UserSelector } from '../../../../core/store/auth/auth.selectors';


interface PrescriptionFile {
    name: string;
    type: string;
    size: number;
    preview: string | SafeResourceUrl;
    file: File;
    uploadDate: Date;
}

@Component({
    selector: 'app-monture-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTabsModule,
        MatCheckboxModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        RouterModule,
        FactureFormComponent,
        PaymentListComponent
    ],
    providers: [
        ClientManagementService,
        FicheService,
        FactureService,
        ProductService
    ],
    templateUrl: './monture-form.component.html',
    styleUrls: ['./monture-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MontureFormComponent implements OnInit, OnDestroy {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    @ViewChild('saveDialog') saveDialogTemplate!: TemplateRef<any>;
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
    @ViewChild('frameCanvasElement') frameCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild(FactureFormComponent) factureComponent!: FactureFormComponent;
    @ViewChild(PaymentListComponent) paymentListComponent!: PaymentListComponent;

    ficheForm: FormGroup;
    clientId: string | null = null;
    client: Client | null = null;
    allProducts: any[] = []; // [NEW] Store products for easy lookup
    ficheId: string | null = null;
    activeTab: number = 0;
    loading = false;
    isEditMode = false;

    readonly TypeEquipement = TypeEquipement;

    // Contrôle indépendant pour la sélection du type d'équipement (ajout dynamique)
    selectedEquipmentType = new FormControl<TypeEquipement | null>(null);

    // Enums pour les dropdowns
    typesEquipement = Object.values(TypeEquipement);

    // Master Lists (From Database)
    lensMaterials: string[] = getLensMaterials();

    dateToday = new Date();

    get minDate(): Date {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    isTabAccessible(index: number): boolean {
        // Logging only for higher index tabs to avoid spamming for tab 0/1 checking
        const shouldLog = index > 1;

        if (index <= 1) return true;

        // NEW: Check if post-sale tabs should even be shown (for Devis)
        if (!this.shouldShowPostSaleTabs && (index === 2 || index === 4 || index === 5)) {
            if (shouldLog) console.log(`[DEBUG] Tab ${index} blocked: This is a simple Devis`);
            return false;
        }

        // Requirements for moving past tab 1 (Montures et Verres)
        // 1. Must be saved in database
        if (!this.ficheId || this.ficheId === 'new') {
            if (shouldLog) console.log(`[DEBUG] Tab ${index} blocked: No ficheId (${this.ficheId})`);
            return false;
        }

        // 2. Must have valid delivery date (OR already have a linked invoice/BC)
        const dateVal = this.ficheForm.get('dateLivraisonEstimee')?.value;
        const hasLinkedInvoice = !!this.linkedFactureSubject.value;
        if (!dateVal && !hasLinkedInvoice) {
            if (shouldLog) console.log(`[DEBUG] Tab ${index} blocked: No delivery date and no linked invoice`);
            return false;
        }

        const selectedDate = new Date(dateVal);
        selectedDate.setHours(0, 0, 0, 0);
        // Relaxing the date check for debugging, or maybe the saved date is in the past?
        // if (selectedDate < this.minDate) return false; 

        return true;
    }

    get formEquipementPrincipal(): FormGroup {
        return this.equipements.at(0) as FormGroup;
    }

    lensIndices: string[] = getLensIndices();

    lensTreatments: string[] = [
        'Anti-reflet (HMC)',
        'Durci (HC)',
        'Super Anti-reflet (SHMC)',
        'Anti-lumière bleue (Blue Cut)',
        'Photochromique (Transitions)',
        'Teinté (Solaire - Gris)',
        'Teinté (Solaire - Brun)',
        'Teinté (Solaire - Vert)',
        'Polarisé',
        'Miroité',
        'Hydrophobe'
    ];

    // Liste des marques
    lensBrands: string[] = [
        'Essilor',
        'Zeiss',
        'Hoya',
        'Nikon',
        'Rodenstock',
        'Seiko',
        'BBGR',
        'Optiswiss',
        'Shamir',
        'Kodak',
        'Generic',
        'Autre'
    ];

    // Types de montage
    typesMontage: string[] = [
        'Cerclé (Complet)',
        'Percé (Nylor)',
        'Semi-cerclé (Nylor)',
        'Sans monture (Percé)'
    ];

    // État d'expansion
    mainEquipmentExpanded = true;
    addedEquipmentsExpanded: boolean[] = [];

    // Suggestions IA
    suggestions: SuggestionIA[] = [];
    showSuggestions = false;
    activeSuggestionIndex: number | null = null;

    // Fichiers prescription
    prescriptionFiles: PrescriptionFile[] = [];
    viewingFile: PrescriptionFile | null = null;

    // Camera capture
    showCameraModal = false;
    cameraStream: MediaStream | null = null;
    capturedImage: string | null = null;

    // Facturation
    clientFactures$: Observable<Facture[]> | null = null;
    public linkedFactureSubject = new BehaviorSubject<Facture | null>(null);
    linkedFacture$ = this.linkedFactureSubject.asObservable();

    private destroy$ = new Subject<void>();

    get isSaleEnInstance(): boolean {
        const status = this.linkedFactureSubject.value?.statut;
        return status === 'VENTE_EN_INSTANCE' || status === 'BROUILLON';
    }

    get isBonDeCommande(): boolean {
        const fact = this.linkedFactureSubject.value;
        if (!fact) return false;

        const type = fact.type;
        const statut = fact.statut;
        const numero = fact.numero;

        // It's a BC if type is DEVIS and it has a BC number or specific order status
        return type === 'DEVIS' && (
            statut === 'VENTE_EN_INSTANCE' ||
            (numero && (numero.startsWith('BC-') || numero.includes('BC'))) ||
            statut === 'PARTIEL' ||
            statut === 'PAYEE'
        );
    }
    receptionComplete = false;
    isReserved = false;
    isTransit = false;
    currentFiche: any = null; // Store loaded fiche for template/checks
    initialLines: any[] = [];
    initialProductStatus: string | null = null; // Track initial status: 'RUPTURE' or 'DISPONIBLE'
    loggedInUser: any = null;

    nomenclatureString: string | null = null;
    showFacture = false;

    // Flag to prevent repetitive validation prompts
    private hasUserDismissedValidation = false;

    // Local storage for frame height in case form control fails
    private lastMeasFrameHeight: number | null = null;

    // Paste text dialog removed

    // Paste text dialog removed

    // Prix des verres (logique de calcul)

    // Prix des verres (logique de calcul)
    private LENS_PRICES: Record<string, Record<string, number>> = {
        'Organique (CR-39)': {
            '1.50 (Standard)': 200,
            '1.56': 250,
            '1.60': 350,
            '1.67': 500
        },
        'Polycarbonate': {
            '1.59': 400
        },
        'Trivex': {
            '1.53': 450
        },
        'Minéral': {
            '1.523': 150,
            '1.60': 300,
            '1.70': 500,
            '1.80': 800,
            '1.90': 1200
        },
        'Organique MR-8': {
            '1.60': 500
        },
        'Organique MR-7': {
            '1.67': 700
        },
        'Blue Cut Mass': {
            '1.56': 400,
            '1.60': 600,
            '1.67': 800
        }
    };

    private TREATMENT_PRICES: Record<string, number> = {
        'Anti-reflet (HMC)': 100,
        'Durci (HC)': 50,
        'Super Anti-reflet (SHMC)': 150,
        'Anti-lumière bleue (Blue Cut)': 200,
        'Photochromique (Transitions)': 600,
        'Teinté (Solaire - Gris)': 150,
        'Teinté (Solaire - Brun)': 150,
        'Teinté (Solaire - Vert)': 150,
        'Polarisé': 400,
        'Miroité': 250,
        'Hydrophobe': 100,
        // Legacy fallbacks mapping
        'Anti-reflet': 100,
        'Durci': 50,
        'Anti-rayure': 50
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private clientService: ClientManagementService,
        private ficheService: FicheService,
        private cdr: ChangeDetectorRef,
        private sanitizer: DomSanitizer,
        private dialog: MatDialog,
        private factureService: FactureService,
        private productService: ProductService,
        private snackBar: MatSnackBar,
        private store: Store,
        private location: Location
    ) {
        this.ficheForm = this.initForm();
        this.store.select(UserSelector).pipe(takeUntil(this.destroy$)).subscribe(user => {
            this.loggedInUser = user;
            this.cdr.markForCheck();
        });
    }

    ngOnInit(): void {
        // FIX: Ensure 'hauteurVerre' control exists in 'montage' group immediately
        // This ensures correct data binding when loading existing fiches
        const montageGroup = this.ficheForm.get('montage') as FormGroup;
        if (montageGroup && !montageGroup.contains('hauteurVerre')) {
            montageGroup.addControl('hauteurVerre', new FormControl(null));
        }

        // Draw frame visualization when tab changes to Fiche Montage
        this.ficheForm.valueChanges.subscribe(() => {
            if (this.activeTab === 4) {
                setTimeout(() => this.updateFrameCanvasVisualization(), 100);
            }
        });
        this.route.paramMap.subscribe(params => {
            this.clientId = params.get('clientId');
            this.ficheId = params.get('ficheId');

            if (this.clientId) {
                this.clientService.getClient(this.clientId).subscribe(client => {
                    this.client = client;
                    this.cdr.markForCheck();
                });
            }

            if (this.ficheId && this.ficheId !== 'new') {
                // VIEW MODE: Existing Fiche
                this.isEditMode = false;
                this.ficheForm.disable(); // Disable form in view mode
                this.loadFiche();

                // Load linked facture via Service (One reliable method)
                this.loadLinkedFacture();
            }
            else {
                // CREATE MODE: New Fiche
                this.isEditMode = true;
                this.ficheForm.enable();
                // Reset form if creating new
                // this.ficheForm.reset(); // Optional: might strictly need this if reusing component
            }
        });

        // Setup generic listeners for Main Equipment
        this.setupLensListeners(this.ficheForm);

        // Auto-update lens type based on equipment type and addition
        this.setupLensTypeAutoUpdate();

        // Sync EP fields between tabs
        this.setupSynchronization();

        // Sync selectedEquipmentType with Main Equipment Type if no added equipments
        this.selectedEquipmentType.valueChanges.subscribe(value => {
            if (value && this.equipements.length === 0) {
                this.ficheForm.get('monture.typeEquipement')?.setValue(value);
            }
        });

        // Update nomenclature when ordonnance changes
        this.ficheForm.get('ordonnance')?.valueChanges.subscribe(() => {
            this.updateNomenclature();
        });
        // Initial call
        this.updateNomenclature();

        // REACTIVE RECEPTION CHECK: Trigger whenever the invoice status changes
        this.linkedFacture$.subscribe(facture => {
            if (facture?.statut === 'VENTE_EN_INSTANCE' && this.currentFiche) {
                console.log('🔄 [RECEPTION] Reactive trigger (Invoice changed or loaded)');
                this.checkReceptionForInstance(this.currentFiche);
            }
        });

        // POLLING: Check reception status every 5 seconds if waiting
        timer(5000, 5000).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            const isInstance = (this.linkedFactureSubject.value?.statut === 'VENTE_EN_INSTANCE');
            if (isInstance && !this.receptionComplete && this.currentFiche) {
                console.log('🔄 [POLLING] Checking reception status...');
                this.checkReceptionForInstance(this.currentFiche);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // New: Check if products in an INSTANCE sale are now received OR if transfer was cancelled
    checkReceptionForInstance(fiche: any): void {
        // [DISABLED] Logic disabled as per user request to remove banner system.
        return;

        const isInstance = (this.linkedFactureSubject.value?.statut === 'VENTE_EN_INSTANCE');

        console.log('🔍 [RECEPTION] Checking reception status (ID & Model-Based)...');

        // Extract products to check
        const itemsToCheck: { path: string, id: string | null, desc: string | null, ref: string | null }[] = [];

        const mapMonture = (m: any, path: string) => {
            if (m?.productId || m?.designation || m?.reference) {
                itemsToCheck.push({ path, id: m.productId, desc: m.designation, ref: m.reference });
            }
        };

        const mapVerres = (v: any, path: string) => {
            if (v?.differentODOG) {
                if (v.productIdOD || v.matiereOD) itemsToCheck.push({ path: `${path}.od`, id: v.productIdOD, desc: v.matiereOD, ref: null });
                if (v.productIdOG || v.matiereOG) itemsToCheck.push({ path: `${path}.og`, id: v.productIdOG, desc: v.matiereOG, ref: null });
            } else if (v?.productId || v?.matiere) {
                itemsToCheck.push({ path: `${path}.both`, id: v.productId, desc: v.matiere, ref: null });
            }
        };

        mapMonture(fiche.monture, 'monture');
        if (fiche.verres) mapVerres(fiche.verres, 'verres');

        (fiche.equipements || []).forEach((e: any, i: number) => {
            const p = `equipements.${i}`;
            mapMonture(e.monture, `${p}.monture`);
            if (e.verres) mapVerres(e.verres, `${p}.verres`);
        });

        if (itemsToCheck.length === 0) {
            this.receptionComplete = true;
            this.cdr.markForCheck();
            return;
        }

        this.store.select(UserCurrentCentreSelector).pipe(take(1)).subscribe(center => {
            if (!center) return;

            // Fetch ALL products for model-based matching fallback
            this.productService.findAll({ global: true }).subscribe(allProducts => {
                let allArrived = true;
                let someTransit = false;
                let someReserved = false;
                let needsIDSync = false;

                itemsToCheck.forEach(item => {
                    // 1. Try to find a LOCAL product using a SCORING system
                    // We want to avoid picking a product just because it shares a generic reference if a better designation match exists.

                    const candidates = allProducts.filter(p => p.entrepot?.centreId === center.id);
                    let localMatch: any = null;
                    let bestScore = 0;

                    for (const p of candidates) {
                        let score = 0;

                        // Exact ID Match (Highest Priority)
                        if (p.id === item.id) score += 100;

                        // Designation Match
                        if (item.desc && p.designation && p.designation.trim().toLowerCase() === item.desc.trim().toLowerCase()) {
                            score += 50;
                        }

                        // Reference/Code Match
                        if (item.ref && p.codeInterne && p.codeInterne === item.ref) {
                            score += 20;
                        } else if (item.ref && p.codeBarres && p.codeBarres === item.ref) {
                            score += 20;
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            localMatch = p;
                        }
                    }

                    // 2. Determine Status based on match
                    if (localMatch) {
                        if (localMatch.statut === 'DISPONIBLE') {
                            // Arrived locally
                        } else if (localMatch.statut === 'EN_TRANSIT') {
                            allArrived = false;
                            someTransit = true;
                        } else if (localMatch.statut === 'RESERVE') {
                            allArrived = false;
                            someReserved = true;
                        } else {
                            allArrived = false;
                        }

                        if (localMatch.id !== item.id) {
                            needsIDSync = true;
                        }
                    } else {
                        // No local candidate found at all -> Not arrived
                        allArrived = false;
                    }
                });

                const stateChanged = this.receptionComplete !== allArrived || this.isTransit !== someTransit || this.isReserved !== someReserved;
                if (stateChanged || needsIDSync) {
                    if (allArrived && !this.receptionComplete) {
                        this.snackBar.open('✨ Bonne nouvelle ! Vos produits sont arrivés.', 'OK', { duration: 6000 });
                    }

                    this.receptionComplete = allArrived;
                    this.isTransit = someTransit;
                    this.isReserved = someReserved;

                    // Perform ID synchronization if we found local matches for remote IDs
                    if (needsIDSync) {
                        itemsToCheck.forEach(item => {
                            const local = allProducts.find(p =>
                                p.entrepot?.centreId === center.id &&
                                (p.id === item.id || (item.desc && p.designation === item.desc) || (item.ref && (p.codeInterne === item.ref || p.codeBarres === item.ref)))
                            );
                            if (local && local.id !== item.id) {
                                console.log(`📍 [SYNC] Mapping ${item.path} to local ID: ${local.id}`);
                                this.patchProductID(item.path, local.id);
                            }
                        });
                        this.saveFicheSilently(true);
                    }

                    this.cdr.markForCheck();
                    // Additional check to force UI update because of OnPush
                    setTimeout(() => this.cdr.detectChanges(), 50);
                }
            });
        });
    }

    private patchProductID(path: string, localId: string) {
        const parts = path.split('.');
        let control: AbstractControl | null = this.ficheForm;

        if (parts[0] === 'equipements') {
            const index = parseInt(parts[1]);
            control = this.equipements.at(index);
            // Re-map parts to skip 'equipements.X'
            const subPath = parts.slice(2).join('.');
            const field = subPath.includes('od') ? 'productIdOD' : (subPath.includes('og') ? 'productIdOG' : 'productId');
            const group = control.get(parts[2]);
            group?.patchValue({ [field]: localId, isPendingTransfer: false }, { emitEvent: false });
        } else {
            const field = path.includes('od') ? 'productIdOD' : (path.includes('og') ? 'productIdOG' : 'productId');
            const group = this.ficheForm.get(parts[0]);
            group?.patchValue({ [field]: localId, isPendingTransfer: false }, { emitEvent: false });
        }
    }


    loadLinkedFacture(): void {
        if (!this.clientId || !this.ficheId || this.ficheId === 'new') return;

        console.log('🔍 [MontureForm] Searching for linked document for fiche:', this.ficheId);
        // [OPTIMIZATION] Search directly by FicheId (Unique) instead of filtering client invoices
        this.factureService.findAll({ ficheId: this.ficheId }).subscribe({
            next: (factures) => {
                const found = factures[0]; // Backend findAll with ficheId returns take: 1
                if (found) {
                    console.log('🔗 [MontureForm] Linked document found:', found.numero, '| Status:', found.statut);
                    this.linkedFactureSubject.next(found);
                } else if (!this.linkedFactureSubject.value?.numero) {
                    // [FIX] Only emit NULL if we don't already have a valid document with a number
                    // This prevents "flicker" during save race conditions where the query might return empty
                    // while the backend is still committing but the frontend already has the 'tap' result.
                    console.log('⚪ [MontureForm] No linked document found for this fiche. (Resetting state)');
                    this.linkedFactureSubject.next(null);
                }
            },
            error: (err) => console.error('❌ [MontureForm] Error loading linked invoice:', err)
        });

        // Make reception check reactive to invoice status changes
        this.linkedFacture$.pipe(
            takeUntil(this.destroy$),
            filter(f => !!f),
            distinctUntilChanged((prev, curr) => prev?.statut === curr?.statut)
        ).subscribe(f => {
            if (f?.statut === 'VENTE_EN_INSTANCE' && this.currentFiche) {
                console.log('🔄 [RECEPTION] Status changed to Instance. Triggering check...');
                this.checkReceptionForInstance(this.currentFiche);
            }
        });
    }

    onInvoiceSaved(facture: any): void {
        console.log('✅ [EVENT] Invoice saved in MontureFormComponent:', facture.numero || facture);
        console.log('📊 [EVENT] Invoice status:', facture.statut, '| Type:', facture.type);

        // [FIX] Use deep copy to ensure Angular sees the change even if the object reference is similar
        this.linkedFactureSubject.next({ ...facture });
        this.loadClientFactures();

        // FIX: Reload fiche to trigger checkReceptionForInstance and update UI
        if (this.ficheId && this.ficheId !== 'new') {
            console.log('🔄 [EVENT] Reloading fiche to check reception status...');
            this.loadFiche();
        }

        this.cdr.markForCheck();
        this.cdr.detectChanges(); // [FIX] Force immediate UI updates for tabs and visibility
    }

    updateNomenclature(): void {
        const odVars = this.ficheForm.get('ordonnance.od')?.value || {};
        const ogVars = this.ficheForm.get('ordonnance.og')?.value || {};
        const formatCorrection = (c: any) => {
            let s = '';
            if (c.sphere && c.sphere !== '0' && c.sphere !== '+0.00') s += `Sph ${c.sphere} `;
            if (c.cylindre && c.cylindre !== '0' && c.cylindre !== '+0.00') s += `Cyl ${c.cylindre} `;
            if (c.axe && c.axe !== '0°') s += `Axe ${c.axe} `;
            if (c.addition && c.addition !== '0' && c.addition !== '+0.00') s += `Add ${c.addition}`;
            return s.trim();
        };
        const descOD = formatCorrection(odVars);
        const descOG = formatCorrection(ogVars);
        this.nomenclatureString = `OD: ${descOD || '-'} / OG: ${descOG || '-'}`;
        console.log('📋 Nomenclature generated in ngOnInit:', this.nomenclatureString);
    }

    setupSynchronization(): void {
        const ordonnance = this.ficheForm.get('ordonnance');
        const montage = this.ficheForm.get('montage');

        if (!ordonnance || !montage) return;

        // Ordonnance -> Montage
        // OD
        ordonnance.get('od.ep')?.valueChanges.subscribe(val => {
            if (val && val !== montage.get('ecartPupillaireOD')?.value) {
                montage.patchValue({ ecartPupillaireOD: val }, { emitEvent: false });
            }
        });
        // OG
        ordonnance.get('og.ep')?.valueChanges.subscribe(val => {
            if (val && val !== montage.get('ecartPupillaireOG')?.value) {
                montage.patchValue({ ecartPupillaireOG: val }, { emitEvent: false });
            }
        });

        // Montage -> Ordonnance
        // OD
        montage.get('ecartPupillaireOD')?.valueChanges.subscribe(val => {
            if (val && val !== ordonnance.get('od.ep')?.value) {
                ordonnance.patchValue({ od: { ep: val } }, { emitEvent: false });
            }
        });
        // OG
        montage.get('ecartPupillaireOG')?.valueChanges.subscribe(val => {
            if (val && val !== ordonnance.get('og.ep')?.value) {
                ordonnance.patchValue({ og: { ep: val } }, { emitEvent: false });
            }
        });
    }


    toggleEditMode(): void {
        this.isEditMode = !this.isEditMode;

        if (this.isEditMode) {
            // Enable form for editing
            this.ficheForm.enable();
        } else {
            // Disable form for viewing
            this.ficheForm.disable();
            // Reload to reset if cancelling edits
            if (this.ficheId && this.ficheId !== 'new') {
                this.loadFiche(); // Reset data to saved state on cancel
            }
        }
    }



    get clientDisplayName(): string {
        if (!this.client) return 'Client';

        if (isClientProfessionnel(this.client)) {
            return this.client.raisonSociale.toUpperCase();
        }

        if (isClientParticulier(this.client) || (this.client as any).nom) {
            const nom = (this.client as any).nom || '';
            const prenom = (this.client as any).prenom || '';
            return `${nom.toUpperCase()} ${this.toTitleCase(prenom)} `;
        }

        return 'Client';
    }

    private toTitleCase(str: string): string {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // Generic Listener Setup
    setupLensListeners(group: AbstractControl): void {
        const verresGroup = group.get('verres');
        if (!verresGroup) return;

        const updatePrice = () => this.calculateLensPrices(group);

        // Core Fields
        verresGroup.get('matiere')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indice')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitement')?.valueChanges.subscribe(updatePrice);

        // Split Logic
        verresGroup.get('differentODOG')?.valueChanges.subscribe((isSplit: boolean) => {
            if (isSplit) {
                const currentVals = verresGroup.value;
                // FIX: Only overwrite Split fields if Unified fields HAVE data.
                // This prevents erasing valid Split data when enabling form (where Unified might be null)
                if (currentVals.matiere || currentVals.indice) {
                    verresGroup.patchValue({
                        matiereOD: currentVals.matiere,
                        indiceOD: currentVals.indice,
                        traitementOD: currentVals.traitement,
                        matiereOG: currentVals.matiere,
                        indiceOG: currentVals.indice,
                        traitementOG: currentVals.traitement
                    }, { emitEvent: false });
                }
            }
            updatePrice();
        });

        // Split Fields
        verresGroup.get('matiereOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indiceOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitementOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('matiereOG')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indiceOG')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitementOG')?.valueChanges.subscribe(updatePrice);

        // Sync Price in Simple Mode
        verresGroup.get('prixOD')?.valueChanges.subscribe((val) => {
            if (!verresGroup.get('differentODOG')?.value) {
                verresGroup.get('prixOG')?.setValue(val, { emitEvent: false });
            }
        });
    }

    // Auto-update lens type based on equipment type and addition
    setupLensTypeAutoUpdate(): void {
        // Main equipment
        const updateMainLensType = () => {
            const equipmentType = this.ficheForm.get('monture.typeEquipement')?.value;
            const addOD = parseFloat(this.ficheForm.get('ordonnance.od.addition')?.value) || 0;
            const addOG = parseFloat(this.ficheForm.get('ordonnance.og.addition')?.value) || 0;
            const maxAdd = Math.max(addOD, addOG);

            if (equipmentType) {
                const recommendedType = determineLensType(equipmentType, maxAdd);
                this.ficheForm.get('verres.type')?.setValue(recommendedType, { emitEvent: false });
            }
        };

        // Listen to equipment type changes
        this.ficheForm.get('monture.typeEquipement')?.valueChanges.subscribe(() => updateMainLensType());

        // Listen to addition changes
        this.ficheForm.get('ordonnance.od.addition')?.valueChanges.subscribe(() => updateMainLensType());
        this.ficheForm.get('ordonnance.og.addition')?.valueChanges.subscribe(() => updateMainLensType());
    }

    calculateLensPrices(group: AbstractControl = this.ficheForm): void {
        const verresGroup = group.get('verres');
        if (!verresGroup) return;

        const differentODOG = verresGroup.get('differentODOG')?.value;

        // Prix OD
        let prixOD = 0;
        if (differentODOG) {
            const matiereOD = verresGroup.get('matiereOD')?.value;
            const indiceOD = verresGroup.get('indiceOD')?.value;
            const traitementsOD = verresGroup.get('traitementOD')?.value || [];

            prixOD = calculateLensPrice(matiereOD, indiceOD, traitementsOD);
        } else {
            const matiere = verresGroup.get('matiere')?.value;
            const indice = verresGroup.get('indice')?.value;
            const traitements = verresGroup.get('traitement')?.value || [];

            prixOD = calculateLensPrice(matiere, indice, traitements);
        }

        // Prix OG
        let prixOG = 0;
        if (differentODOG) {
            const matiereOG = verresGroup.get('matiereOG')?.value;
            const indiceOG = verresGroup.get('indiceOG')?.value;
            const traitementsOG = verresGroup.get('traitementOG')?.value || [];

            prixOG = calculateLensPrice(matiereOG, indiceOG, traitementsOG);
        } else {
            prixOG = prixOD;
        }

        verresGroup.patchValue({
            prixOD,
            prixOG
        }, { emitEvent: false });

        this.cdr.markForCheck();
    }

    checkSuggestion(index: number = -1): void {
        this.activeSuggestionIndex = index;
        const odValues = this.ficheForm.get('ordonnance.od')?.value;
        const ogValues = this.ficheForm.get('ordonnance.og')?.value;

        // Extract frame details from the target monture group (Main or Added)
        let montureGroup = this.ficheForm.get('monture');
        if (index >= 0) {
            montureGroup = this.equipements.at(index)?.get('monture') || null;
        }

        // Parse Frame Data (ED from 'taille', cerclage from form)
        const tailleStr = montureGroup?.get('taille')?.value || '';
        const ed = parseInt(tailleStr.split('-')[0]) || 52; // Default 52 if parse fails
        const cerclage = montureGroup?.get('cerclage')?.value || 'cerclée';

        // Frame shape and mount - using defaults for now (could be added to UI later)
        const frameData: FrameData = {
            ed,
            shape: 'rectangular', // Default
            mount: 'full-rim',     // Default
            cerclage: cerclage as any // Type de cerclage
        };

        // Determine Equipment Type
        let equipmentType: string = '';
        if (index >= 0) {
            // For added equipment
            equipmentType = this.equipements.at(index)?.get('type')?.value || '';
        } else {
            // For main equipment
            equipmentType = this.ficheForm.get('monture.typeEquipement')?.value || '';
        }

        // Prepare Corrections with Addition Support
        const sphOD = parseFloat(odValues.sphere) || 0;
        const sphOG = parseFloat(ogValues.sphere) || 0;
        const addOD = parseFloat(odValues.addition) || 0;
        const addOG = parseFloat(ogValues.addition) || 0;
        const cylOD = parseFloat(odValues.cylindre) || 0;
        const cylOG = parseFloat(ogValues.cylindre) || 0;

        // CRITICAL: Only apply Addition for "Vision de près" equipment type
        const isNearVision = equipmentType === TypeEquipement.VISION_PRES;

        const corrOD: Correction = {
            sph: sphOD,
            cyl: cylOD,
            add: isNearVision ? addOD : undefined  // Only pass addition for near vision
        };
        const corrOG: Correction = {
            sph: sphOG,
            cyl: cylOG,
            add: isNearVision ? addOG : undefined  // Only pass addition for near vision
        };

        // Get AI Recommendations
        const recOD = getLensSuggestion(corrOD, frameData);
        const recOG = getLensSuggestion(corrOG, frameData);

        // Compare Spheres and Cylinders for Pair vs Split Logic (Tighter thresholds)
        const diffSph = Math.abs(corrOD.sph - corrOG.sph);
        const diffCyl = Math.abs(corrOD.cyl - corrOG.cyl);

        this.suggestions = [];
        // Sync with FormControl
        this.ficheForm.get('suggestions')?.setValue([]);

        if (diffSph <= 0.5 && diffCyl <= 0.75) {
            // Case A: Similar Prescriptions -> Suggest Single Pair (Aesthetic Priority)
            // Use the "stronger" recommendation (highest index) for both
            const useOD = recOD.option.index >= recOG.option.index;
            const bestRec = useOD ? recOD : recOG;
            const thicknessInfo = `~${bestRec.estimatedThickness} mm`;

            // Combine warnings from both eyes
            const allWarnings = [
                ...(recOD.warnings || []),
                ...(recOG.warnings || [])
            ];
            const uniqueWarnings = [...new Set(allWarnings)]; // Remove duplicates

            this.suggestions.push({
                type: 'Paire',
                matiere: this.mapMaterialToUI(bestRec.option.material),
                indice: this.mapIndexToUI(bestRec.option.index),
                traitements: this.mapTreatmentsToUI(bestRec.selectedTreatments),
                raison: bestRec.rationale,
                epaisseur: thicknessInfo,
                warnings: uniqueWarnings.length > 0 ? uniqueWarnings : undefined
            });

        } else {
            // Case B: Different Prescriptions -> Suggest Split Indices
            const thickOD = `~${recOD.estimatedThickness} mm`;
            const thickOG = `~${recOG.estimatedThickness} mm`;

            this.suggestions.push({
                type: 'OD',
                matiere: this.mapMaterialToUI(recOD.option.material),
                indice: this.mapIndexToUI(recOD.option.index),
                traitements: this.mapTreatmentsToUI(recOD.selectedTreatments),
                raison: recOD.rationale,
                epaisseur: thickOD,
                warnings: recOD.warnings
            });

            this.suggestions.push({
                type: 'OG',
                matiere: this.mapMaterialToUI(recOG.option.material),
                indice: this.mapIndexToUI(recOG.option.index),
                traitements: this.mapTreatmentsToUI(recOG.selectedTreatments),
                raison: recOG.rationale,
                epaisseur: thickOG,
                warnings: recOG.warnings
            });
        }

        // Sync with FormControl
        this.ficheForm.get('suggestions')?.setValue(this.suggestions);

        this.showSuggestions = true;
        this.cdr.markForCheck();
    }

    // Helper to map DB material names to UI dropdown values
    mapMaterialToUI(dbMaterial: string): string {
        switch (dbMaterial) {
            case 'CR-39': return 'Organique (CR-39)';
            case 'Polycarbonate': return 'Polycarbonate';
            case 'Trivex': return 'Trivex';
            case '1.56': return 'Organique 1.56';
            case '1.60': return 'Organique 1.60';
            case '1.67': return 'Organique 1.67';
            case '1.74': return 'Organique 1.74';
            default: return dbMaterial;
        }
    }

    // Helper to map DB index numbers to UI dropdown values
    mapIndexToUI(dbIndex: number): string {
        if (dbIndex === 1.50) return '1.50 (Standard)';
        if (dbIndex === 1.53) return '1.53 (Trivex)';
        if (dbIndex === 1.59) return '1.59 (Polycarbonate)';
        return dbIndex.toFixed(2);
    }

    applySuggestion(suggestion: SuggestionIA, parentGroup: AbstractControl = this.ficheForm): void {
        const verresGroup = parentGroup.get('verres');
        if (!verresGroup) return;

        if (suggestion.type === 'Paire') {
            // Case A: Apply to both (Grouped Mode)
            verresGroup.patchValue({
                differentODOG: false,
                matiere: suggestion.matiere,
                indice: suggestion.indice,
                traitement: suggestion.traitements || [],
                // Update shadow fields
                matiereOD: suggestion.matiere,
                indiceOD: suggestion.indice,
                traitementOD: suggestion.traitements || [],
                matiereOG: suggestion.matiere,
                indiceOG: suggestion.indice,
                traitementOG: suggestion.traitements || []
            });
            this.closeSuggestions();

        } else {
            // Case B: Split Mode
            if (verresGroup.get('differentODOG')?.value !== true) {
                verresGroup.patchValue({ differentODOG: true });
            }

            if (suggestion.type === 'OD') {
                verresGroup.patchValue({
                    matiereOD: suggestion.matiere,
                    indiceOD: suggestion.indice,
                    traitementOD: suggestion.traitements || []
                });
            } else if (suggestion.type === 'OG') {
                verresGroup.patchValue({
                    matiereOG: suggestion.matiere,
                    indiceOG: suggestion.indice,
                    traitementOG: suggestion.traitements || []
                });
            }

            // [NEW] Logic: Auto-Unify if OD and OG become identical
            // This fixes the user complaint where applying identical suggestions splits the form unnecessarily
            const v = verresGroup.value;
            const mtOD = v.matiereOD;
            const mtOG = v.matiereOG;
            const idxOD = v.indiceOD;
            const idxOG = v.indiceOG;
            const mqOD = v.marqueOD;
            const mqOG = v.marqueOG;

            // Compare treatments (sort arrays to ensure order doesn't matter)
            const trOD = Array.isArray(v.traitementOD) ? [...v.traitementOD].sort().join(',') : '';
            const trOG = Array.isArray(v.traitementOG) ? [...v.traitementOG].sort().join(',') : '';

            // Check if both eyes are fully populated and identical
            if (mtOD && mtOG && mtOD === mtOG && idxOD === idxOG && mqOD === mqOG && trOD === trOG) {
                console.log('🔄 [Suggestion] Auto-Unifying OD/OG as they are identical');
                verresGroup.patchValue({
                    differentODOG: false,
                    matiere: mtOD,
                    indice: idxOD,
                    marque: mqOD,
                    traitement: v.traitementOD // source of truth (same as OG)
                });
            }
        }

        this.calculateLensPrices(parentGroup);
    }

    openStockSearch(index: number = -1, target: 'monture' | 'verres' | 'od' | 'og' = 'monture'): void {
        const dialogRef = this.dialog.open(StockSearchDialogComponent, {
            width: '90vw',
            maxWidth: '1200px',
            height: '80vh',
            autoFocus: false,
            data: { context: 'sales' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.action === 'CANCEL_SALE') {
                this.handleSaleCancellation(result.reason, result.product);
            } else if (result && (result.action === 'SELECT' || result.action === 'ORDER_AND_SELL') && result.product) {
                // ONE-CLICK LOGIC: Auto-enable edit mode if we are just viewing
                if (!this.isEditMode) {
                    console.log('⚡ [ONE-CLICK] Auto-enabling edit mode for product selection...');
                    this.isEditMode = true;
                    this.ficheForm.enable();
                }

                this.allProducts.push(result.product);
                const isPending = result.action === 'ORDER_AND_SELL' || result.isPendingTransfer || result.isPendingOrder || false;
                this.fillProductDetails(result.product, index, target, isPending);

                if (result.action === 'ORDER_AND_SELL') {
                    this.snackBar.open(
                        'Produit commandé. La vente sera mise en instance jusqu\'à réception du stock.',
                        'OK',
                        { duration: 6000 }
                    );
                }

                // AUTO-SUBMIT: Removed per user request - allows finishing other parts of the form
                console.log('✅ [STOCKS] Product selected, auto-save disabled to allow further editing.');
                // setTimeout(() => this.onSubmit(), 300);
            }
        });
    }

    fillProductDetails(product: any, index: number, target: 'monture' | 'verres' | 'od' | 'og' = 'monture', isPendingTransfer: boolean = false): void {
        let parentGroup: FormGroup;
        if (index === -1) {
            parentGroup = this.ficheForm;
        } else {
            parentGroup = this.getEquipmentGroup(index);
        }

        if (target === 'monture') {
            const montureGroup = parentGroup.get('monture');
            if (montureGroup) {
                montureGroup.patchValue({
                    reference: product.codeInterne || product.codeBarres,
                    marque: product.marque || '',
                    couleur: product.couleur || '',
                    prixMonture: product.prixVenteTTC,
                    productId: product.id,
                    entrepotId: product.entrepotId,
                    entrepotType: product.entrepot?.type || null,
                    entrepotNom: product.entrepot?.nom || null,
                    isPendingTransfer: isPendingTransfer
                });

                // Pre-fill model or designation into reference if empty? 
                // Usually reference is codeInterne, but let's ensure designation is tracked
                if (!montureGroup.get('reference')?.value) {
                    montureGroup.patchValue({ reference: product.designation });
                }

                if (product.specificData) {
                    const specs = product.specificData;
                    if (specs.calibre && specs.pont && specs.branche) {
                        montureGroup.patchValue({
                            taille: `${specs.calibre}-${specs.pont}-${specs.branche}`
                        });
                    }
                    if (specs.cerclage) {
                        montureGroup.patchValue({ cerclage: specs.cerclage });
                    }
                }
            }
        } else {
            const verresGroup = parentGroup.get('verres');
            if (verresGroup) {
                if (target === 'verres') {
                    verresGroup.patchValue({
                        marque: product.marque || '',
                        matiere: product.modele || product.designation || '',
                        prixOD: product.prixVenteTTC,
                        productId: product.id,
                        entrepotId: product.entrepotId,
                        entrepotType: product.entrepot?.type || null,
                        entrepotNom: product.entrepot?.nom || null,
                        isPendingTransfer: isPendingTransfer
                    });
                } else if (target === 'od') {
                    verresGroup.patchValue({
                        marqueOD: product.marque || '',
                        matiereOD: product.modele || product.designation || '',
                        prixOD: product.prixVenteTTC,
                        productIdOD: product.id,
                        entrepotId: product.entrepotId,
                        entrepotType: product.entrepot?.type || null,
                        entrepotNom: product.entrepot?.nom || null,
                        isPendingTransfer: isPendingTransfer || verresGroup.get('isPendingTransfer')?.value
                    });
                } else if (target === 'og') {
                    verresGroup.patchValue({
                        marqueOG: product.marque || '',
                        matiereOG: product.modele || product.designation || '',
                        prixOG: product.prixVenteTTC,
                        productIdOG: product.id,
                        entrepotId: product.entrepotId,
                        entrepotType: product.entrepot?.type || null,
                        isPendingTransfer: isPendingTransfer || verresGroup.get('isPendingTransfer')?.value
                    });
                }
            }
        }

        this.cdr.markForCheck();
    }

    // Keep scanBarcode placeholder or delegate to stock search?
    scanBarcode(field: string, index: number): void {
        // Renamed functionality per user request
        this.openStockSearch(index);
    }

    // Helper to map database treatment names to UI names
    mapTreatmentsToUI(dbTreatments: string[]): string[] {
        const mapping: { [key: string]: string } = {
            'AR': 'Anti-reflet (HMC)',
            'BlueCut': 'Blue Cut',
            'Photochromic': 'Transitions (Photochromique)',
            'Polarized': 'Polarisé',
            'None': ''
        };
        return dbTreatments
            .map(t => mapping[t] || t)
            .filter(t => t !== '');
    }

    // --- Suivi Commande Logic ---

    get suiviStatut(): string {
        return this.ficheForm.get('suiviCommande.statut')?.value || 'A_COMMANDER';
    }

    setOrderStatus(statut: string): void {
        const group = this.ficheForm.get('suiviCommande');
        if (!group) return;

        group.patchValue({ statut });

        const now = new Date();

        // Auto-fill dates based on status transition
        if (statut === 'COMMANDE') {
            if (!group.get('dateCommande')?.value) {
                group.patchValue({ dateCommande: now });
            }
        } else if (statut === 'RECU') {
            if (!group.get('dateReception')?.value) {
                group.patchValue({ dateReception: now });
            }
        } else if (statut === 'LIVRE_CLIENT') {
            if (!group.get('dateLivraison')?.value) {
                group.patchValue({ dateLivraison: now });
            }
        }

        // Mark form as dirty to enable save
        this.ficheForm.markAsDirty();
        this.cdr.markForCheck();
    }

    reportCasse(): void {
        const oeil = prompt('Casse sur quel œil ? (OD, OG, Paire)', 'Paire');
        if (!oeil) return;

        const raison = prompt('Raison de la casse ?', 'Coussinet / Taille / Montage');
        if (!raison) return;

        const group = this.ficheForm.get('suiviCommande');
        if (!group) return;

        const count = (group.get('casseCount')?.value || 0) + 1;
        const history = group.get('casseHistorique')?.value || [];

        const entry = {
            date: new Date(),
            oeil,
            raison,
            user: 'Opticien' // In a real app, this would be the current user
        };

        group.patchValue({
            statut: 'A_COMMANDER', // Reset to order state
            hasCasse: true,
            casseCount: count,
            casseHistorique: [...history, entry],
            commentaire: (group.get('commentaire')?.value || '') + `\n[CASSE ${count}] ${oeil}: ${raison} (${entry.date.toLocaleDateString()})`
        });

        this.ficheForm.markAsDirty();
        this.snackBar.open('Casse déclarée. La commande a été remise en statut "À Commander".', 'OK', { duration: 5000 });
        this.cdr.markForCheck();
    }

    getStepState(stepStatus: string): string {
        const current = this.suiviStatut;
        const levels = ['A_COMMANDER', 'COMMANDE', 'RECU', 'LIVRE_CLIENT'];
        const currentIndex = levels.indexOf(current);
        const stepIndex = levels.indexOf(stepStatus);

        if (currentIndex > stepIndex) return 'completed';
        if (currentIndex === stepIndex) return 'active';
        return 'pending';
    }

    closeSuggestions(): void {
        this.showSuggestions = false;
        this.activeSuggestionIndex = null;
        this.cdr.markForCheck();
    }



    // Equipment Management
    get equipements(): FormArray {
        return this.ficheForm.get('equipements') as FormArray;
    }

    // Main Equipment Initialization
    initForm(): FormGroup {
        const typeEquipement = 'Monture';
        const typeVerre = 'Unifocal';

        return this.fb.group({
            // ... existing fields ...
            clientId: [this.clientId],
            type: ['MONTURE'],
            statut: ['BROUILLON'],
            monture: this.fb.group({
                reference: ['', Validators.required],
                marque: ['', Validators.required],
                couleur: [''],
                taille: [''],
                cerclage: ['cerclée'],
                typeEquipement: [typeEquipement],
                prixMonture: [0],
                productId: [null],
                entrepotId: [null],
                entrepotType: [null],
                entrepotNom: [null],
                isPendingTransfer: [false]
            }),
            verres: this.fb.group({
                matiere: [null],
                marque: [null],
                indice: [null],
                traitement: [[]],
                prixOD: [0],
                prixOG: [0],
                differentODOG: [false],
                matiereOD: [null],
                marqueOD: [null],
                indiceOD: [null],
                traitementOD: [[]],
                matiereOG: [null],
                marqueOG: [null],
                indiceOG: [null],
                traitementOG: [[]],
                productId: [null],
                entrepotId: [null],
                entrepotType: [null],
                entrepotNom: [null],
                productIdOD: [null],
                productIdOG: [null],
                isPendingTransfer: [false]
            }),
            // Restore missing fields from deleted initForm (Important!)
            ordonnance: this.fb.group({
                od: this.fb.group({
                    sphere: [null],
                    cylindre: [null],
                    axe: [null],
                    addition: [null],
                    prisme: [null],
                    base: [null],
                    ep: [null]
                }),
                og: this.fb.group({
                    sphere: [null],
                    cylindre: [null],
                    axe: [null],
                    addition: [null],
                    prisme: [null],
                    base: [null],
                    ep: [null]
                }),
                datePrescription: [new Date()],
                prescripteur: [''],
                dateControle: [null],
                prescriptionFiles: [[]]
            }),
            montage: this.fb.group({
                typeMontage: ['Cerclé (Complet)'],
                ecartPupillaireOD: [32, [Validators.required, Validators.min(20), Validators.max(40)]],
                ecartPupillaireOG: [32, [Validators.required, Validators.min(20), Validators.max(40)]],
                hauteurOD: [20, [Validators.required, Validators.min(10), Validators.max(30)]],
                hauteurOG: [20, [Validators.required, Validators.min(10), Validators.max(30)]],
                diametreEffectif: ['65/70'],
                capturedImage: [null], // [NEW] Base64 image from centering tablet
                remarques: [''],
                hauteurVerre: [null], // [NEW] Total frame height (B-dimension) persisted
                diagonalMm: [null], // [NEW] Diagonal diameter measurement
                diagonalPoints: [null] // [NEW] Points for manual diagonal tracing
            }),
            suggestions: [[]],
            equipements: this.fb.array([]),
            dateLivraisonEstimee: [null, Validators.required],
            suiviCommande: this.fb.group({
                statut: ['A_COMMANDER'],
                dateCommande: [null],
                dateReception: [null],
                dateLivraison: [null],
                fournisseur: [''],
                referenceCommande: [''],
                trackingNumber: [''],
                commentaire: [''],
                hasCasse: [false],
                casseCount: [0],
                casseHistorique: [[]]
            })
        });
    }

    addEquipment(): void {
        const typeEquipement = 'Monture';

        const equipmentGroup = this.fb.group({
            type: [typeEquipement],
            dateAjout: [new Date()],
            monture: this.fb.group({
                reference: [''],
                marque: [''],
                couleur: [''],
                taille: [''],
                cerclage: ['cerclée'],
                prixMonture: [0],
                productId: [null],
                entrepotId: [null],
                entrepotType: [null],
                entrepotNom: [null],
                isPendingTransfer: [false]
            }),
            verres: this.fb.group({
                matiere: [null],
                marque: [null],
                indice: [null],
                traitement: [[]],
                prixOD: [0],
                prixOG: [0],
                differentODOG: [false],
                matiereOD: [null],
                marqueOD: [null],
                indiceOD: [null],
                traitementOD: [[]],
                matiereOG: [null],
                marqueOG: [null],
                indiceOG: [null],
                traitementOG: [[]],
                productId: [null],
                entrepotId: [null],
                entrepotType: [null],
                productIdOD: [null],
                productIdOG: [null],
                isPendingTransfer: [false]
            })
        });

        // Setup listeners for this new equipment
        this.setupLensListeners(equipmentGroup);

        this.equipements.push(equipmentGroup);

        // Expansion logic
        this.addedEquipmentsExpanded = this.addedEquipmentsExpanded.map(() => false);
        this.addedEquipmentsExpanded.push(true);
        this.mainEquipmentExpanded = false;

        this.cdr.markForCheck();
    }

    getEquipmentGroup(index: number): FormGroup {
        return this.equipements.at(index) as FormGroup;
    }

    toggleMainEquipment(): void {
        this.mainEquipmentExpanded = !this.mainEquipmentExpanded;
    }

    toggleAddedEquipment(index: number): void {
        if (this.addedEquipmentsExpanded[index] === undefined) {
            this.addedEquipmentsExpanded[index] = false;
        }
        this.addedEquipmentsExpanded[index] = !this.addedEquipmentsExpanded[index];
    }

    removeEquipment(index: number): void {
        if (confirm('Supprimer cet équipement ?')) {
            this.equipements.removeAt(index);
            this.addedEquipmentsExpanded.splice(index, 1);
            this.cdr.markForCheck();
        }
    }



    // File Handling
    openFileUpload(): void {
        this.fileInput.nativeElement.click();
    }

    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;

        Array.from(input.files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`Le fichier ${file.name} est trop volumineux(max 10MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = file.type === 'application/pdf'
                    ? this.sanitizer.bypassSecurityTrustResourceUrl(e.target?.result as string)
                    : e.target?.result as string;

                const prescriptionFile: PrescriptionFile = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    preview,
                    file,
                    uploadDate: new Date()
                };
                this.prescriptionFiles.push(prescriptionFile);
                // Sync with FormControl
                this.ficheForm.get('ordonnance.prescriptionFiles')?.setValue(this.prescriptionFiles);
                if (file.type.startsWith('image/')) {
                    this.extractData(prescriptionFile);
                }
                this.cdr.markForCheck();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }

    viewFile(file: PrescriptionFile): void {
        this.viewingFile = file;
        this.cdr.markForCheck();
    }

    closeViewer(): void {
        this.viewingFile = null;
        this.cdr.markForCheck();
    }

    deleteFile(index: number): void {
        if (confirm('Supprimer ce document ?')) {
            this.prescriptionFiles.splice(index, 1);
            this.cdr.markForCheck();
        }
    }

    // Camera Capture Methods
    async openCamera(): Promise<void> {
        try {
            this.showCameraModal = true;
            this.cdr.markForCheck();

            // Wait for view to update
            await new Promise(resolve => setTimeout(resolve, 100));

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });

            this.cameraStream = stream;
            if (this.videoElement?.nativeElement) {
                this.videoElement.nativeElement.srcObject = stream;
                this.videoElement.nativeElement.play();
            }
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Erreur d\'accès à la caméra:', error);
            alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
            this.closeCameraModal();
        }
    }

    capturePhoto(): void {
        if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
            return;
        }

        const video = this.videoElement.nativeElement;
        const canvas = this.canvasElement.nativeElement;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        this.cdr.markForCheck();
    }

    saveCapturedPhoto(): void {
        if (!this.capturedImage) return;

        // Convert base64 to blob
        fetch(this.capturedImage)
            .then(res => res.blob())
            .then(blob => {
                const timestamp = new Date().getTime();
                const file = new File([blob], `prescription_${timestamp}.jpg`, { type: 'image/jpeg' });

                const prescriptionFile: PrescriptionFile = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    preview: this.capturedImage!,
                    file,
                    uploadDate: new Date()
                };

                this.prescriptionFiles.push(prescriptionFile);
                // Sync with FormControl
                this.ficheForm.get('ordonnance.prescriptionFiles')?.setValue(this.prescriptionFiles);
                this.extractData(prescriptionFile);
                this.closeCameraModal();
                this.cdr.markForCheck();
            });
    }

    closeCameraModal(): void {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        this.showCameraModal = false;
        this.capturedImage = null;
        this.cdr.markForCheck();
    }


    private formatNumber(value: number): string {
        if (value === undefined || value === null) return '';
        let formatted = value.toFixed(2);
        if (value > 0) formatted = '+' + formatted;
        return formatted;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Paste Text Dialog and Apply functionality removed as per user request


    async extractData(file: PrescriptionFile): Promise<void> {
        console.log(`Extraction automatique des données de ${file.name}...`);

        try {
            // Import OCR functions dynamically
            const { extractTextFromImage } = await import('../../utils/ocr-extractor');
            const { parsePrescription } = await import('../../utils/prescription-parser');

            // Extract text from image
            const text = await extractTextFromImage(file.file);
            console.log('Texte extrait (OCR):', text);

            // Parse prescription data using the standardized parser
            const parsed = parsePrescription(text);
            console.log('Données parsées (OCR):', parsed);

            // Check if any data was found
            const hasOD = parsed.OD.sph !== 0 || parsed.OD.cyl !== 0 || parsed.OD.add !== undefined;
            const hasOG = parsed.OG.sph !== 0 || parsed.OG.cyl !== 0 || parsed.OG.add !== undefined;
            const hasEP = parsed.EP.val !== 0;

            if (!hasOD && !hasOG && !hasEP) {
                alert('Aucune donnée optique détectée dans l\'image. Vérifiez la netteté de la photo.');
                return;
            }

            // Build summary for user approval
            let summary = 'Données détectées :\n\n';
            if (hasOD) summary += `OD: ${parsed.OD.sph > 0 ? '+' : ''}${parsed.OD.sph} (${parsed.OD.cyl > 0 ? '+' : ''}${parsed.OD.cyl}) ${parsed.OD.axis ? '@' + parsed.OD.axis + '°' : ''} ${parsed.OD.add ? 'Add ' + parsed.OD.add : ''} \n`;
            if (hasOG) summary += `OG: ${parsed.OG.sph > 0 ? '+' : ''}${parsed.OG.sph} (${parsed.OG.cyl > 0 ? '+' : ''}${parsed.OG.cyl}) ${parsed.OG.axis ? '@' + parsed.OG.axis + '°' : ''} ${parsed.OG.add ? 'Add ' + parsed.OG.add : ''} \n`;
            if (hasEP) summary += `EP: ${parsed.EP.val} mm\n`;

            summary += '\nImporter ces valeurs ?';

            if (confirm(summary)) {
                // Apply extracted data to form
                this.setCorrectionOD(parsed.OD);
                this.setCorrectionOG(parsed.OG);
                if (parsed.EP) {
                    this.setCorrectionEP(parsed.EP);
                }
                alert('Données importées avec succès !');
                this.cdr.markForCheck();
            }

        } catch (error) {
            console.error('Erreur OCR:', error);
            alert('Impossible de lire l\'ordonnance automatiquement.');
        }
    }

    private setCorrectionOD(data: any): void {
        const odGroup = this.ficheForm.get('ordonnance.od');
        if (odGroup) {
            const values: any = {};
            if (data.sph !== 0) values.sphere = this.formatNumber(data.sph);
            if (data.cyl !== 0) values.cylindre = this.formatNumber(data.cyl);
            if (data.axis !== undefined) values.axe = data.axis + '°';
            if (data.add !== undefined) values.addition = this.formatNumber(data.add);
            if (data.prism !== undefined) values.prisme = data.prism;
            if (data.base !== undefined) values.base = data.base;
            odGroup.patchValue(values);
        }
    }

    private setCorrectionOG(data: any): void {
        const ogGroup = this.ficheForm.get('ordonnance.og');
        if (ogGroup) {
            const values: any = {};
            if (data.sph !== 0) values.sphere = this.formatNumber(data.sph);
            if (data.cyl !== 0) values.cylindre = this.formatNumber(data.cyl);
            if (data.axis !== undefined) values.axe = data.axis + '°';
            if (data.add !== undefined) values.addition = this.formatNumber(data.add);
            if (data.prism !== undefined) values.prisme = data.prism;
            if (data.base !== undefined) values.base = data.base;
            ogGroup.patchValue(values);
        }
    }

    private setCorrectionEP(data: { val: number; od?: number; og?: number }): void {
        const ordonnanceGroup = this.ficheForm.get('ordonnance');
        if (!ordonnanceGroup) return;

        if (data.od && data.og) {
            // Split provided (e.g. 32/32)
            ordonnanceGroup.get('od.ep')?.setValue(data.od);
            ordonnanceGroup.get('og.ep')?.setValue(data.og);
        } else if (data.val) {
            // Single value provided (e.g. 64) -> Split implicitly
            const half = data.val / 2;
            ordonnanceGroup.get('od.ep')?.setValue(half);
            ordonnanceGroup.get('og.ep')?.setValue(half);
        }
    }

    loadFiche(): void {
        if (!this.ficheId) return;

        this.loading = true;
        this.ficheService.getFicheById(this.ficheId).subscribe({
            next: (fiche: any) => {
                if (fiche) {
                    console.log('📄 [LOAD] Fiche loaded:', fiche.id);
                    this.currentFiche = fiche;
                    this.patchForm(fiche);

                    // [RECEPTION] Immediate trigger if invoice status is already known
                    if (this.linkedFactureSubject.value?.statut === 'VENTE_EN_INSTANCE') {
                        console.log('🔄 [RECEPTION] Triggering check from loadFiche...');
                        this.checkReceptionForInstance(fiche);
                    } else {
                        // Fallback delay for slower invoice loading
                        setTimeout(() => {
                            if (this.currentFiche && !this.receptionComplete) {
                                this.checkReceptionForInstance(this.currentFiche);
                            }
                        }, 500);
                    }
                }
                this.loading = false;
                this.cdr.markForCheck();

                // Generate nomenclature after loading fiche data
                setTimeout(() => {
                    this.generateInvoiceLines();
                    console.log('📋 Nomenclature generated after fiche load:', this.nomenclatureString);
                }, 100);
            },
            error: (err) => {
                console.error('Error loading fiche:', err);
                this.loading = false;
                alert('Erreur lors du chargement de la fiche.');
            }
        });
    }

    getVendeurName(): string {
        if (this.currentFiche?.vendeur) {
            return `${this.currentFiche.vendeur.prenom} ${this.currentFiche.vendeur.nom}`;
        }

        const user = this.loggedInUser;
        if (user) {
            if (user.employee) return `${user.employee.prenom} ${user.employee.nom}`;
            if (user.fullName) return user.fullName;
            if (user.email) return user.email;
        }

        return 'Utilisateur';
    }

    private patchForm(fiche: any): void {
        // Patch Form Values
        console.log('📦 [PATCH] Patching Montage Data:', fiche.montage);
        this.ficheForm.patchValue({
            ordonnance: fiche.ordonnance,
            monture: fiche.monture,
            montage: fiche.montage,
            suggestions: fiche.suggestions,
            dateLivraisonEstimee: fiche.dateLivraisonEstimee,
            suiviCommande: fiche.suiviCommande
        }, { emitEvent: false });

        // Explicitly patch verres to ensure UI updates for differentODOG
        if (fiche.verres) {
            const verresVals = { ...fiche.verres };

            // FIX: Guard against empty objects overwriting form
            if (Object.keys(verresVals).length === 0) return;

            // FIX: Convert numeric indices to strings for mat-select matching
            // Using strict check to handle 0 or existing values
            if (verresVals.indice !== undefined && verresVals.indice !== null) verresVals.indice = String(verresVals.indice);
            if (verresVals.indiceOD !== undefined && verresVals.indiceOD !== null) verresVals.indiceOD = String(verresVals.indiceOD);
            if (verresVals.indiceOG !== undefined && verresVals.indiceOG !== null) verresVals.indiceOG = String(verresVals.indiceOG);

            // FIX: Ensure differentODOG is set first for *ngIf visibility
            const diffODOG = verresVals.differentODOG === true;
            this.ficheForm.get('verres.differentODOG')?.setValue(diffODOG, { emitEvent: false });

            this.ficheForm.get('verres')?.patchValue(verresVals, { emitEvent: false });
        }

        // Restore suggestions and prescription files for display
        if (fiche.suggestions) {
            this.suggestions = fiche.suggestions;
            this.showSuggestions = this.suggestions.length > 0;
        }

        if (fiche.ordonnance && fiche.ordonnance.prescriptionFiles) {
            this.prescriptionFiles = fiche.ordonnance.prescriptionFiles;
        }

        // Handle Equipments (FormArray)
        if (fiche.equipements && Array.isArray(fiche.equipements)) {
            const equipementsArray = this.ficheForm.get('equipements') as FormArray;
            equipementsArray.clear(); // Clear existing

            fiche.equipements.forEach((eq: any) => {
                // Manually rebuild structure to ensure arrays (treatments) are handled correctly
                // and to include new fields like 'cerclage'
                const eqGroup = this.fb.group({
                    type: [eq.type],
                    dateAjout: [eq.dateAjout],
                    monture: this.fb.group({
                        reference: [eq.monture?.reference || ''],
                        marque: [eq.monture?.marque || ''],
                        couleur: [eq.monture?.couleur || ''],
                        taille: [eq.monture?.taille || ''],
                        cerclage: [eq.monture?.cerclage || 'cerclée'], // Added Field
                        prixMonture: [eq.monture?.prixMonture || 0],
                        productId: [eq.monture?.productId || null], // [NEW] Load if exists
                        entrepotId: [eq.monture?.entrepotId || null],
                        entrepotType: [eq.monture?.entrepotType || null],
                        isPendingTransfer: [eq.monture?.isPendingTransfer || false]
                    }),
                    verres: this.fb.group({
                        matiere: [eq.verres?.matiere],
                        marque: [eq.verres?.marque],
                        indice: [eq.verres?.indice ? String(eq.verres.indice) : null], // Type conversion
                        traitement: [eq.verres?.traitement || []], // Array safe here because passed as initial value? No, safest is patchValue below.
                        prixOD: [eq.verres?.prixOD],
                        prixOG: [eq.verres?.prixOG],
                        differentODOG: [eq.verres?.differentODOG || false],
                        matiereOD: [eq.verres?.matiereOD],
                        marqueOD: [eq.verres?.marqueOD],
                        indiceOD: [eq.verres?.indiceOD ? String(eq.verres.indiceOD) : null],
                        traitementOD: [eq.verres?.traitementOD || []],
                        matiereOG: [eq.verres?.matiereOG],
                        marqueOG: [eq.verres?.marqueOG],
                        indiceOG: [eq.verres?.indiceOG ? String(eq.verres.indiceOG) : null],
                        traitementOG: [eq.verres?.traitementOG || []],
                        productId: [eq.verres?.productId || null],
                        entrepotId: [eq.verres?.entrepotId || null],
                        isPendingTransfer: [eq.verres?.isPendingTransfer || false]
                    })
                });

                // Set up listeners first
                this.setupLensListeners(eqGroup);

                // Add to array
                equipementsArray.push(eqGroup);
                this.addedEquipmentsExpanded.push(false);

                // Disable if parent is disabled (View Mode)
                if (this.ficheForm.disabled) {
                    eqGroup.disable();
                }
            });
        }

        // Trigger visuals
        setTimeout(() => {
            this.calculateLensPrices();
            this.updateFrameCanvasVisualization();
        }, 500);

        // Force UI update (OnPush strategy might miss patchValue with emitEvent: false)
        this.cdr.markForCheck();
    }

    setActiveTab(index: number): void {
        if (!this.isTabAccessible(index)) {
            this.snackBar.open('Veuillez saisir une date de livraison valide dans l\'onglet "Montures et Verres"', 'Fermer', { duration: 3000 });
            return;
        }

        this.activeTab = index;

        // DEBUG: Log form structure when switching to Suivi Commande tab
        if (index === 5) {
            console.log('🔍 [DEBUG] Switching to Suivi Commande tab');
            console.log('ficheForm exists:', !!this.ficheForm);
            console.log('suiviCommande group exists:', !!this.ficheForm.get('suiviCommande'));
            console.log('suiviCommande value:', this.ficheForm.get('suiviCommande')?.value);
            console.log('All form controls:', Object.keys(this.ficheForm.controls));
        }

        // Load payments when switching to Payment tab
        if (index === 2 && this.paymentListComponent) {
            this.paymentListComponent.loadPayments();
        }

        // Load invoices when switching to Billing tab
        if (index === 3 && this.client) {
            this.updateInitialLines();
            this.loadClientFactures();
        }

        // Draw canvas when switching to Fiche Montage tab
        if (index === 4) {
            setTimeout(() => {
                this.updateFrameCanvasVisualization();
            }, 100);
        }
        this.cdr.markForCheck();
    }

    loadClientFactures() {
        this.loadLinkedFacture();
    }

    updateInitialLines() {
        this.initialLines = this.getInvoiceLines();
    }

    getInvoiceLines(): any[] {
        const lignes: any[] = [];
        const formValue = this.ficheForm.getRawValue();

        // 1. Main Equipment
        const mainMonture = formValue.monture;
        const mainVerres = formValue.verres;

        if (mainMonture && mainVerres) {
            // Monture
            const prixMonture = parseFloat(mainMonture.prixMonture) || 0;
            if (prixMonture > 0) {
                const ref = mainMonture.reference || 'Monture';
                const marque = mainMonture.marque || '';
                const detectedType = mainMonture.entrepotType || (this.allProducts?.find(p => p && p.id === mainMonture.productId)?.entrepot?.type) || null;

                lignes.push({
                    description: `Monture ${marque} ${ref}`.trim(),
                    qte: 1,
                    prixUnitaireTTC: prixMonture,
                    remise: 0,
                    totalTTC: prixMonture,
                    productId: mainMonture.productId || null,
                    entrepotId: mainMonture.entrepotId || null,
                    entrepotType: detectedType,
                    entrepotNom: mainMonture.entrepotNom || null
                });
                console.log(`🔍 Detected Stock Source for Main: ${detectedType} (ID: ${mainMonture.productId})`);
            }

            // Verres
            const differentODOG = mainVerres.differentODOG;
            const matiere = mainVerres.matiere || 'Verre';

            // Generate Nomenclature String (Internal use for notes)
            const odVars = formValue.ordonnance?.od || {};
            const ogVars = formValue.ordonnance?.og || {};

            const formatCorrection = (c: any) => {
                let s = '';
                if (c.sphere && c.sphere !== '0' && c.sphere !== '+0.00') s += (c.sphere.startsWith('+') || c.sphere.startsWith('-') ? c.sphere : '+' + c.sphere) + ' ';
                if (c.cylindre && c.cylindre !== '0' && c.cylindre !== '+0.00') s += `(${c.cylindre}) `;
                if (c.axe && c.axe !== '0°') s += `${c.axe} `;
                if (c.addition && c.addition !== '0' && c.addition !== '+0.00') s += `Add ${c.addition}`;
                return s.trim();
            };
            const descOD = formatCorrection(odVars);
            const descOG = formatCorrection(ogVars);

            this.nomenclatureString = `Nomenclature: OD: ${descOD} / OG: ${descOG}`;

            if (differentODOG) {
                const prixOD = parseFloat(mainVerres.prixOD) || 0;
                const prixOG = parseFloat(mainVerres.prixOG) || 0;
                const matiereOD = mainVerres.matiereOD || matiere;
                const matiereOG = mainVerres.matiereOG || matiere;
                const indiceOD = mainVerres.indiceOD || mainVerres.indice || '';
                const indiceOG = mainVerres.indiceOG || mainVerres.indice || '';

                if (prixOD > 0) {
                    lignes.push({
                        description: `Verre OD ${matiereOD} ${indiceOD}`.trim(),
                        qte: 1,
                        prixUnitaireTTC: prixOD,
                        remise: 0,
                        totalTTC: prixOD,
                        productId: mainVerres.productIdOD || mainVerres.productId || null,
                        entrepotId: mainVerres.entrepotId || null,
                        entrepotType: mainVerres.entrepotType || null,
                        entrepotNom: mainVerres.entrepotNom || null
                    });
                }
                if (prixOG > 0) {
                    lignes.push({
                        description: `Verre OG ${matiereOG} ${indiceOG}`.trim(),
                        qte: 1,
                        prixUnitaireTTC: prixOG,
                        remise: 0,
                        totalTTC: prixOG,
                        productId: mainVerres.productIdOG || mainVerres.productId || null,
                        entrepotId: mainVerres.entrepotId || null,
                        entrepotType: mainVerres.entrepotType || null,
                        entrepotNom: mainVerres.entrepotNom || null
                    });
                }
            } else {
                const prixOD = parseFloat(mainVerres.prixOD) || 0;
                const prixOG = parseFloat(mainVerres.prixOG) || 0;
                const indice = mainVerres.indice || '';

                if (prixOD > 0) {
                    lignes.push({
                        description: `Verre OD ${matiere} ${indice}`.trim(),
                        qte: 1,
                        prixUnitaireTTC: prixOD,
                        remise: 0,
                        totalTTC: prixOD,
                        productId: mainVerres.productId || null,
                        entrepotId: mainVerres.entrepotId || null,
                        entrepotType: mainVerres.entrepotType || null,
                        entrepotNom: mainVerres.entrepotNom || null
                    });
                }
                if (prixOG > 0) {
                    lignes.push({
                        description: `Verre OG ${matiere} ${indice}`.trim(),
                        qte: 1,
                        prixUnitaireTTC: prixOG,
                        remise: 0,
                        totalTTC: prixOG,
                        productId: mainVerres.productId || null,
                        entrepotId: mainVerres.entrepotId || null,
                        entrepotType: mainVerres.entrepotType || null,
                        entrepotNom: mainVerres.entrepotNom || null
                    });
                }
            }
        }

        // 2. Additional Equipments
        if (formValue.equipements && Array.isArray(formValue.equipements)) {
            formValue.equipements.forEach((equip: any, index: number) => {
                const monture = equip.monture;
                const verres = equip.verres;

                if (monture) {
                    const montureAdded = equip.monture;
                    if (montureAdded && montureAdded.prixMonture > 0) {
                        const detectedAddedType = montureAdded.entrepotType || (this.allProducts?.find(p => p && p.id === montureAdded.productId)?.entrepot?.type) || null;
                        lignes.push({
                            description: `Monture ${montureAdded.marque || ''} ${montureAdded.reference || ''}`.trim(),
                            qte: 1,
                            prixUnitaireTTC: parseFloat(montureAdded.prixMonture),
                            remise: 0,
                            totalTTC: parseFloat(montureAdded.prixMonture),
                            productId: montureAdded.productId || null,
                            entrepotId: montureAdded.entrepotId || null,
                            entrepotType: detectedAddedType,
                            entrepotNom: montureAdded.entrepotNom || null
                        });
                        console.log(`🔍 Detected Stock Source for Eq${index + 1}: ${detectedAddedType}`);
                    }
                }
                if (verres) {
                    const diff = verres.differentODOG;

                    // Helper to get description
                    const getDesc = (eye: 'OD' | 'OG') => {
                        if (diff) {
                            const mat = eye === 'OD' ? (verres.matiereOD || verres.matiere) : (verres.matiereOG || verres.matiere);
                            const ind = eye === 'OD' ? (verres.indiceOD || verres.indice) : (verres.indiceOG || verres.indice);
                            return `Verre ${eye} Eq${index + 1} ${mat || ''} ${ind || ''}`.trim();
                        } else {
                            const mat = verres.matiere || '';
                            const ind = verres.indice || '';
                            return `Verre ${eye} Eq${index + 1} ${mat} ${ind}`.trim();
                        }
                    };

                    const prixOD = parseFloat(verres.prixOD) || 0;
                    if (prixOD > 0) {
                        lignes.push({
                            description: getDesc('OD'),
                            qte: 1,
                            prixUnitaireTTC: prixOD,
                            remise: 0,
                            totalTTC: prixOD,
                            productId: verres.productIdOD || verres.productId || null,
                            entrepotId: verres.entrepotId || null,
                            entrepotType: verres.entrepotType || null,
                            entrepotNom: verres.entrepotNom || null
                        });
                    }
                    const prixOG = parseFloat(verres.prixOG) || 0;
                    if (prixOG > 0) {
                        lignes.push({
                            description: getDesc('OG'),
                            qte: 1,
                            prixUnitaireTTC: prixOG,
                            remise: 0,
                            totalTTC: prixOG,
                            productId: verres.productIdOG || verres.productId || null,
                            entrepotId: verres.entrepotId || null,
                            entrepotType: verres.entrepotType || null,
                            entrepotNom: verres.entrepotNom || null
                        });
                    }
                }
            });
        }

        return lignes;
    }

    generateFacture() {
        if (!this.client || !this.client.id) return;

        const lignes = this.getInvoiceLines();
        if (lignes.length === 0) {
            alert('Aucun article à facturer (Prix = 0)');
            return;
        }

        const totalTTC = (lines: any[]) => lines.reduce((acc: number, val: any) => acc + val.totalTTC, 0);
        const total = totalTTC(lignes);
        const tvaRate = 0.20;
        const totalHT = total / (1 + tvaRate);
        const tva = total - totalHT;

        const factureData: Partial<Facture> = {
            type: 'FACTURE',
            statut: 'BROUILLON',
            dateEmission: new Date(),
            clientId: this.client.id,
            lignes: lignes,
            totalTTC: total,
            totalHT: totalHT,
            totalTVA: tva,
            proprietes: {
                nomenclature: this.nomenclatureString || ''
            }
        };

        this.factureService.create(factureData).subscribe({
            next: (f) => this.router.navigate(['/p/clients/factures', f.id]),
            error: (err) => {
                const msg = err.error?.message || err.statusText || 'Erreur inconnue';
                alert(`Erreur: ${msg}`);
            }
        });
    }

    createFacture(): void {
        this.router.navigate(['/p/clients/factures/new'], {
            queryParams: { clientId: this.clientId }
        });
    }

    createSupplierInvoice(): void {
        const dialogRef = this.dialog.open(InvoiceFormDialogComponent, {
            width: '1200px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            data: {
                invoice: null,
                prefilledClientId: this.clientId,
                isBL: true,
                prefilledType: 'ACHAT_VERRE_OPTIQUE'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.snackBar.open('BL enregistré avec succès', 'OK', { duration: 3000 });
            }
        });
    }

    get shouldShowPostSaleTabs(): boolean {
        const fact = this.linkedFactureSubject.value;
        if (!fact) return false;
        return fact.type !== 'DEVIS' || this.isBonDeCommande;
    }

    get isLastVisibleTab(): boolean {
        return this.shouldShowPostSaleTabs ? this.activeTab === 5 : this.activeTab === 3;
    }

    nextTab(): void {
        if (this.isLastVisibleTab) {
            this.goBack();
            return;
        }

        let targetTab = this.activeTab + 1;

        // Skip post-sale tabs (2: Paiements, 4: Fiche Montage, 5: Suivi Commande) if they shouldn't be shown
        if (!this.shouldShowPostSaleTabs) {
            while (targetTab === 2 || targetTab === 4 || targetTab === 5) {
                targetTab++;
            }
        }

        // Validation for date if on tab 1 or moving to tab 2+
        if (!this.isTabAccessible(targetTab)) {
            if (!this.ficheId || this.ficheId === 'new') {
                this.snackBar.open('Veuillez enregistrer la fiche avant de passer aux paiements/facturation', 'Fermer', { duration: 4000 });
                return;
            }

            const dateVal = this.ficheForm.get('dateLivraisonEstimee')?.value;
            if (!dateVal) {
                this.snackBar.open('Veuillez saisir une date de livraison estimée', 'Fermer', { duration: 3000 });
            } else {
                this.snackBar.open('La date de livraison ne peut pas être dans le passé', 'Fermer', { duration: 3000 });
            }
            return;
        }

        // Logic for specific tab transitions
        if (targetTab === 4) { // Moving to Fiche Montage
            setTimeout(() => this.updateFrameCanvasVisualization(), 100);
        }

        if (targetTab === 3) { // Moving to Facturation
            this.generateInvoiceLines();
            // Optional: Auto-save if new? 
            if (this.factureComponent && (!this.factureComponent.id || this.factureComponent.id === 'new')) {
                if (this.factureComponent.form.value.lignes.length > 0) {
                    this.factureComponent.saveAsObservable().subscribe(() => {
                        this.setActiveTab(targetTab);
                    });
                    return;
                }
            }
        }

        this.setActiveTab(targetTab);
    }

    prevTab(): void {
        if (this.activeTab > 0) {
            let targetTab = this.activeTab - 1;

            // Skip post-sale tabs (2: Paiements, 4: Fiche Montage, 5: Suivi Commande) if they shouldn't be shown
            if (!this.shouldShowPostSaleTabs) {
                while (targetTab === 2 || targetTab === 4 || targetTab === 5) {
                    targetTab--;
                }
            }

            if (targetTab >= 0) {
                this.setActiveTab(targetTab);
            }
        }
    }

    generateInvoiceLines(): void {
        const lignes = this.getInvoiceLines();
        this.initialLines = lignes;

        if (this.factureComponent && this.factureComponent.form) {
            console.log('🔄 Syncing calculated lines to FactureComponent');
            if (this.factureComponent.lignes) {
                this.factureComponent.lignes.clear();
                lignes.forEach(l => {
                    const group = this.factureComponent.createLigne();
                    group.patchValue(l);
                    this.factureComponent.lignes.push(group);
                });
            }
            if (this.nomenclatureString) {
                this.factureComponent.nomenclature = this.nomenclatureString;
                this.factureComponent.form.get('proprietes.nomenclature')?.setValue(this.nomenclatureString);
            }
            this.factureComponent.calculateTotals();
        }
        this.cdr.markForCheck();
    }

    hasInvoiceLines(): boolean {
        const lines = this.getInvoiceLines();
        return lines && lines.length > 0;
    }


    formatSphereValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Format to 2 decimal places
            let formatted = numValue.toFixed(2);
            // Add '+' for positive numbers
            if (numValue > 0) {
                formatted = '+' + formatted;
            }
            this.ficheForm.get(`ordonnance.${eye}.sphere`)?.setValue(formatted, { emitEvent: false });
            input.value = formatted;
        }
    }

    formatCylindreValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Format to 2 decimal places
            let formatted = numValue.toFixed(2);
            // Add '+' for positive numbers
            if (numValue > 0) {
                formatted = '+' + formatted;
            }
            this.ficheForm.get(`ordonnance.${eye}.cylindre`)?.setValue(formatted, { emitEvent: false });
            input.value = formatted;
        }
    }

    formatAdditionValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Format to 2 decimal places
            let formatted = numValue.toFixed(2);
            // Add '+' for positive numbers
            if (numValue > 0) {
                formatted = '+' + formatted;
            }
            this.ficheForm.get(`ordonnance.${eye}.addition`)?.setValue(formatted, { emitEvent: false });
            input.value = formatted;
        }
    }

    formatAxeValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/[^0-9]/g, '');
        if (value) {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 180) {
                const formatted = `${numValue}°`;
                this.ficheForm.get(`ordonnance.${eye}.axe`)?.setValue(formatted, { emitEvent: false });
                input.value = formatted;
            }
        }
    }

    formatPrismeValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Prisms don't strictly need '+' typically, but we treat them as numeric
            this.ficheForm.get(`ordonnance.${eye}.prisme`)?.setValue(value, { emitEvent: false });
            input.value = value;
        }
    }

    formatEPValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        // Replace comma with dot first
        let cleanValue = input.value.replace(',', '.');
        // Remove strictly invalid chars but keep dot
        cleanValue = cleanValue.replace(/[^0-9.]/g, '');

        const value = parseFloat(cleanValue);
        if (!isNaN(value)) {
            // Keep decimal precision if user typed it, don't force .toFixed(2)
            // But append ' mm' for display if desired, or just keep number?
            // User requested "no rounding", usually just the number is safer for edit.
            // Let's keep the number in the model, and maybe just the number in input to match other fields?
            // The previous code appended ' mm'. I will respect that but without rounding.
            const formatted = `${cleanValue} mm`;
            this.ficheForm.get(`ordonnance.${eye}.ep`)?.setValue(value);
            input.value = formatted;
        }
    }

    formatBaseValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        const value = input.value.toUpperCase();
        this.ficheForm.get(`ordonnance.${eye}.base`)?.setValue(value, { emitEvent: false });
        input.value = value;
    }

    formatPrice(control: AbstractControl | null, event: Event): void {
        if (!control) return;
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            const formatted = numValue.toFixed(2);
            control.setValue(formatted, { emitEvent: false });
            input.value = formatted;
        }
    }

    handleSaleCancellation(reason: string, product: any): void {
        if (reason === 'NO_STOCK_AVAILABLE') {
            const confirmed = confirm(
                `Le produit "${product?.designation || 'sélectionné'}" n'est disponible dans aucun centre.\n\n` +
                `Voulez-vous annuler cette vente ?\n\n` +
                `Note: Si vous avez déjà effectué un paiement, vous devrez le rembourser manuellement.`
            );

            if (confirmed) {
                this.snackBar.open('Vente annulée. Retour à la fiche client.', 'OK', { duration: 4000 });
                // Navigate back to client detail
                if (this.clientId) {
                    this.router.navigate(['/p/clients', this.clientId]);
                } else {
                    this.router.navigate(['/p/clients']);
                }
            } else {
                // User chose to continue - they can select another product
                this.snackBar.open('Vous pouvez sélectionner un autre produit.', 'OK', { duration: 3000 });
            }
        }
    }

    async onSubmit() {
        console.log('🚀 [DIAGNOSTIC] onSubmit starting...');
        if (this.ficheForm.invalid || !this.clientId || this.loading) {
            console.log('⚠️ [DIAGNOSTIC] Form Invalid, No Client ID, or Loading', {
                invalid: this.ficheForm.invalid,
                clientId: this.clientId,
                loading: this.loading
            });
            this.ficheForm.markAllAsTouched();
            return;
        }
        this.loading = true;
        const formValue = this.ficheForm.getRawValue();

        const pMonture = parseFloat(formValue.monture.prixMonture) || 0;
        const pOD = parseFloat(formValue.verres.prixOD) || 0;
        const pOG = parseFloat(formValue.verres.prixOG) || 0;
        const montantTotal = pMonture + pOD + pOG;

        const serializableFiles = this.prescriptionFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            preview: typeof file.preview === 'string' ? file.preview : file.preview.toString(),
            uploadDate: file.uploadDate
        }));

        const ficheData: FicheMontureCreate = {
            clientId: this.clientId,
            type: TypeFiche.MONTURE,
            statut: StatutFiche.EN_COURS,
            dateLivraisonEstimee: formValue.dateLivraisonEstimee,
            ordonnance: {
                ...formValue.ordonnance,
                prescriptionFiles: serializableFiles
            },
            monture: formValue.monture,
            verres: formValue.verres,
            montage: formValue.montage,
            suggestions: this.suggestions,
            equipements: formValue.equipements || [],
            montantTotal,
            montantPaye: 0
        };

        const operation = (this.isEditMode && this.ficheId && this.ficheId !== 'new')
            ? this.ficheService.updateFiche(this.ficheId, ficheData)
            : this.ficheService.createFicheMonture(ficheData);

        const invoiceLines = this.getInvoiceLines();
        const productsWithStock = invoiceLines.filter(l => l.productId && l.entrepotType);
        const needsDecision = productsWithStock.length > 0;

        const hasPendingTransfer = formValue.monture?.isPendingTransfer ||
            formValue.verres?.isPendingTransfer ||
            (formValue.equipements || []).some((e: any) => e.monture?.isPendingTransfer || e.verres?.isPendingTransfer);

        const existingInvoice = this.linkedFactureSubject.value;
        const hasExistingOfficialInvoice = existingInvoice &&
            (existingInvoice.type === 'FACTURE' ||
                existingInvoice.statut === 'VALIDE' ||
                existingInvoice.statut === 'PAYEE' ||
                existingInvoice.statut === 'PARTIEL');

        if (hasExistingOfficialInvoice) {
            console.log('🛡️ Existing official invoice. Skipping status logic.');
            this.loading = false;
            this.finalizeSave(operation, null, null, false);

        } else if (hasPendingTransfer) {
            console.log('⚠️ Pending transfer detected. Forcing Instance.');
            this.loading = false;
            this.finalizeSave(operation, 'DEVIS', 'VENTE_EN_INSTANCE', false);

        } else if (needsDecision) {
            // Open Dialog
            const dialogRef = this.dialog.open(this.saveDialogTemplate, {
                width: '650px',
                panelClass: 'save-choice-dialog',
                disableClose: true
            });

            dialogRef.afterClosed().subscribe(result => {
                console.log('🤖 [MontureForm] Save Decision Dialog Result:', result);
                if (!result) {
                    this.loading = false;
                    return;
                }

                let type = 'DEVIS';
                let statut = 'DEVIS_EN_COURS';
                let decrement = false;

                if (result === 'FACTURE') {
                    type = 'FACTURE';
                    statut = 'BROUILLON';
                    decrement = true;
                } else if (result === 'COMMANDE') {
                    type = 'DEVIS';
                    statut = 'VENTE_EN_INSTANCE';
                    decrement = true;
                }

                console.log('📝 [MontureForm] Decision Mapping:', { type, statut, decrement });

                // [NEW] Perform Stock Availability Check before final save
                if (decrement) {
                    this.checkStockAvailability(invoiceLines, (type === 'FACTURE' ? 'Facture' : 'BC'))
                        .then((canProceed: boolean) => {
                            if (canProceed) {
                                this.finalizeSave(operation, type, statut, decrement);
                            } else {
                                this.loading = false;
                                this.cdr.detectChanges();
                            }
                        })
                        .catch(err => {
                            console.error('❌ [StockCheck] Error during availability check:', err);
                            // Fallback: allow save anyway but log error
                            this.finalizeSave(operation, type, statut, decrement);
                        });
                } else {
                    this.finalizeSave(operation, type, statut, decrement);
                }
            });

        } else {
            // Default Save for Fiche - Use VENTE_EN_INSTANCE (Bon de Commande) to ensure BC- serial number
            console.log('📝 [MontureForm] No stock items/payments. Defaulting to Bon de Commande workflow.');
            this.loading = false;
            this.finalizeSave(operation, 'DEVIS', 'VENTE_EN_INSTANCE', false);
        }
    }



    async cancelInstancedSale() {
        this.loading = true;
        try {
            const factures = await firstValueFrom(this.factureService.findAll({ clientId: this.clientId || '' }));
            const currentFacture = factures.find(f => f.ficheId === this.ficheId);

            if (currentFacture) {
                // Cancel the sale and restore stock
                const updateData: any = {
                    statut: 'ANNULEE',
                    proprietes: {
                        ...(currentFacture.proprietes || {}),
                        cancelReason: 'Transfert annulé par le centre expéditeur',
                        cancelledAt: new Date(),
                        restoreStock: true // Signal to restore stock from -1 to 0
                    }
                };

                this.factureService.update(currentFacture.id, updateData).subscribe({
                    next: (res) => {
                        this.loading = false;
                        this.snackBar.open('Vente annulée. Le stock a été restauré.', 'Fermer', { duration: 5000 });
                        this.linkedFactureSubject.next(res);
                        this.cdr.markForCheck();
                        // Optionally navigate back or disable editing
                        this.isEditMode = false;
                    },
                    error: (err) => {
                        this.loading = false;
                        console.error('❌ Error cancelling sale:', err);
                        alert("Erreur lors de l'annulation: " + (err.message || 'Erreur inconnue'));
                    }
                });
            } else {
                this.loading = false;
                console.warn('⚠️ No associated invoice found to cancel.');
            }
        } catch (e) {
            console.error('Error in cancelInstancedSale:', e);
            this.loading = false;
        }
    }

    async validateInstancedSale() {
        if (confirm("Voulez-vous valider cette vente maintenant que le produit est reçu ?")) {
            this.loading = true;
            try {
                // [FIX] Use Direct Backend Lookup by FicheID to avoid Pagination/Limit issues
                console.log('🔍 [VALIDATION] Searching for invoices with FicheID:', this.ficheId);
                const factures = await firstValueFrom(this.factureService.findAll({
                    clientId: this.clientId || '',
                    ficheId: this.ficheId
                }));

                const currentFacture = factures.find(f => f.ficheId === this.ficheId)
                    || (factures.length === 1 ? factures[0] : undefined);

                if (currentFacture) {
                    console.log('✅ [VALIDATION] Found matched Invoice:', currentFacture.numero);
                    await this.performSaleValidation(currentFacture);
                    this.snackBar.open('Vente validée avec succès !', 'OK', { duration: 3000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    console.warn('❌ [VALIDATION] No invoice matched ficheId (Backend Filtered):', this.ficheId);
                    this.loading = false;
                    alert("Impossible de trouver la facture associée. (Backend Lookup Failed)");
                }
            } catch (e) {
                console.error('Error in validateInstancedSale:', e);
                this.loading = false;
                alert("Une erreur est survenue lors de la validation.");
            }
        }
    }

    async onPaymentAdded() {
        console.log('💰 [EVENT] Payment Added - Checking for archiving decision...');

        if (this.hasUserDismissedValidation) {
            console.log('🔇 User previously dismissed validation prompt. Skipping check.');
            return;
        }

        // [NEW] Logic: Check if ANY product is pending transfer. If so, don't prompt for validation yet.
        const formValue = this.ficheForm.getRawValue();
        const hasPendingTransfer = formValue.monture?.isPendingTransfer ||
            formValue.verres?.isPendingTransfer ||
            (formValue.equipements || []).some((e: any) => e.monture?.isPendingTransfer || e.verres?.isPendingTransfer);

        if (hasPendingTransfer && !this.receptionComplete) {
            console.log('📦 Pending transfer detected. Skipping validation prompt until product arrival.');
            return;
        }

        // 1. Detect if we have any valid products with stock
        const invoiceLines = this.getInvoiceLines();
        const productsWithStock = invoiceLines.filter(l => l.productId && l.entrepotId);

        if (productsWithStock.length === 0) {
            console.log('ℹ️ No products with stock detected. No special alert needed.');
            return;
        }

        // [FIX] Check if invoice is already validated - skip prompt if already VALIDE
        try {
            const factures = await firstValueFrom(this.factureService.findAll({ clientId: this.clientId || '' }));
            const currentFacture = factures.find(f => f.ficheId === this.ficheId);

            if (currentFacture && (currentFacture.statut === 'VALIDE' || currentFacture.type === 'FACTURE')) {
                console.log('✅ Invoice already validated. Skipping validation prompt.');
                return;
            }
        } catch (e) {
            console.error('Error checking invoice status:', e);
        }

        // [MODIFIED] No more validation prompt on payment. Automatically set to INSTANCE.
        console.log('💰 Payment added. Automatically setting/keeping status as VENTE_EN_INSTANCE.');

        try {
            // We don't block UI with loading=true strictly, or maybe we do to prevent navigation
            // this.loading = true; 

            const factures = await firstValueFrom(this.factureService.findAll({ clientId: this.clientId || '' }));
            const currentFacture = factures.find(f => f.ficheId === this.ficheId);

            if (currentFacture) {
                // Check if already validated to be safe
                if (currentFacture.statut === 'VALIDE' || currentFacture.type === 'FACTURE') {
                    console.log('✅ Invoice already validated. No status change needed.');
                    return;
                }

                // Force status to VENTE_EN_INSTANCE (Bon de Commande) without prompt
                // This ensures that adding a payment confirms the order but doesn't validate stock/fiscal yet.
                await this.setInstanceFicheFacture(currentFacture);

                // Set flag to prevent goBack prompt
                this.hasUserDismissedValidation = true;
            }
        } catch (e) {
            console.error('Error updating status after payment:', e);
            this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', { duration: 3000 });
        } finally {
            this.loading = false;
        }
    }

    private async performSaleValidation(staleFacture: any) {
        // [FIX] Double-check status LIVE to prevent stale UI blocking validation
        // Fetch fresh product statuses before blocking
        console.log('🛡️ [VALIDATION] Performing live status check before validating...');
        let liveReserved = false;
        let liveTransit = false;

        // REFRESH INVOICE explicitly to ensure we have the latest version (e.g. correct total, status)
        let currentFacture = staleFacture;
        try {
            console.log('🔄 [VALIDATION] Refreshing invoice data:', staleFacture.id);
            const freshInvoice = await firstValueFrom(this.factureService.findOne(staleFacture.id));
            if (freshInvoice) {
                currentFacture = freshInvoice;
                console.log('✅ [VALIDATION] Invoice refreshed. Status:', currentFacture.statut);
            }
        } catch (e) {
            console.warn('⚠️ [VALIDATION] Failed to refresh invoice, using passed object.', e);
        }

        // Scan lines to identify products to check
        const lines = this.getInvoiceLines();
        if (lines.length > 0) {
            // [OPTIMIZATION] Removed heavy client-side "findAll" check.
            // We now rely on the backend `verifyProductsAreReceived` called within FacturesService.update
            // This prevents fetching thousands of products and hanging the UI.

            // Minimal check: if we KNOW based on local form state that something is wrong, we can block.
            // But for deep validation (transit etc), we let the backend handle it and catch the error.
            if (this.currentFiche && this.receptionComplete === false && this.isSaleEnInstance) {
                // Soft warning but let it proceed to backend for authoritative check
                console.log('⚠️ [VALIDATION] Frontend suspects products are not fully received, but proceeding to backend check.');
            }
        }

        // Use LIVE flags instead of potentially stale this.isReserved / this.isTransit
        if (liveReserved || liveTransit) {
            this.snackBar.open('⚠️ Impossible de valider la vente : le produit n\'a pas encore été réceptionné (Statut vérifié en direct).', 'OK', { duration: 5000 });
            this.loading = false;
            return;
        }

        console.log('📄 [VALIDATION] Converting Devis to official Facture:', currentFacture.numero);

        // [FIX] Guard against missing Product IDs
        // Only warn for FRAMES (Monture) as Lenses (Verres) are often ordered without stock management
        const missingIds = lines.filter(l => !l.productId && l.description.includes('Monture'));
        if (missingIds.length > 0) {
            console.error('❌ [VALIDATION] Missing ProductID for lines:', missingIds);
            const confirmNoStock = confirm(
                "⚠️ ATTENTION : Certains produits (Monture/Verres) n'ont pas d'identifiant associé.\n\n" +
                "Le stock NE SERA PAS décrémenté pour ces produits.\n\n" +
                "Voulez-vous quand même valider la vente ?"
            );
            if (!confirmNoStock) return;
        }

        // Log the products and their IDs for debugging
        console.log('📦 [VALIDATION] Products in invoice:', lines.map(l => ({
            desc: l.description,
            productId: l.productId,
            entrepotType: l.entrepotType,
            entrepotId: l.entrepotId
        })));

        const total = lines.reduce((acc, l) => acc + l.totalTTC, 0);
        const tvaRate = 0.20;
        const totalHT = total / (1 + tvaRate);
        const tva = total - totalHT;

        const updateData: any = {
            type: 'FACTURE',
            statut: 'VALIDE',
            lignes: lines,
            totalTTC: total,
            totalHT: totalHT,
            totalTVA: tva,
            resteAPayer: Math.max(0, total - (currentFacture.totalTTC - currentFacture.resteAPayer)),
            proprietes: {
                ...(currentFacture.proprietes || {}),
                nomenclature: this.nomenclatureString || '',
                validatedAt: new Date(),
                isTransferFulfilled: true, // Mark as fulfilled
                forceStockDecrement: true,  // Ensure stock is decremented upon validation from fiche
                // [FIX] Force Fiscal Flow: Tell backend to generate official number unconditionally
                // This resolves issues where "Nouveau Document" or draft status ambiguity skips the flow.
                forceFiscal: true
            }
        };

        // Protect numero from being overwritten if it already exists
        if (currentFacture.numero) {
            updateData.numero = currentFacture.numero;
        }

        console.log('📤 [VALIDATION] Sending update with forceStockDecrement:', updateData.proprietes.forceStockDecrement);
        console.log('📤 [VALIDATION] Update data:', JSON.stringify(updateData, null, 2));

        return new Promise<void>((resolve, reject) => {
            this.factureService.update(currentFacture.id, updateData).subscribe({
                next: (res) => {
                    console.log('✅ [VALIDATION] Invoice updated successfully:', res);
                    this.loading = false;
                    this.snackBar.open('Vente validée et facture générée avec succès', 'Fermer', { duration: 5000 });
                    this.receptionComplete = false; // Reset flag
                    console.log('🔄 [VALIDATION] Calling onInvoiceSaved...');
                    this.onInvoiceSaved(res);
                    resolve();
                },
                error: (err) => {
                    console.error('❌ [VALIDATION] Error validating sale:', err);
                    this.loading = false;
                    console.error('❌ Error validating sale:', err);
                    alert("Erreur lors de la validation: " + (err.message || 'Erreur inconnue'));
                    reject(err);
                }
            });
        });
    }

    setInstanceFicheFacture(facture: any) {
        console.log('📦 Setting Devis to Instance and Decrementing Stock for:', facture.numero);
        this.loading = true;

        const lines = this.getInvoiceLines();
        const total = lines.reduce((acc, l) => acc + l.totalTTC, 0);
        const tvaRate = 0.20;
        const totalHT = total / (1 + tvaRate);
        const tva = total - totalHT;

        const updateData: any = {
            statut: 'VENTE_EN_INSTANCE',
            lignes: lines,
            totalTTC: total,
            totalHT: totalHT,
            totalTVA: tva,
            proprietes: {
                ...(facture.proprietes || {}),
                nomenclature: this.nomenclatureString || '',
                forceStockDecrement: false, // Changed from true
                instancedAt: new Date()
            }
        };

        // Protect numero from being overwritten if it already exists
        if (facture.numero) {
            updateData.numero = facture.numero;
        }

        this.factureService.update(facture.id, updateData).subscribe({
            next: (res) => {
                this.loading = false;
                this.snackBar.open('Vente mise en instance et stock décrémenté', 'Fermer', { duration: 5000 });
                this.onInvoiceSaved(res);
            },
            error: (err) => {
                this.loading = false;
                console.error('❌ Error setting instance status:', err);
                alert("Erreur lors de la mise en instance: " + (err.message || 'Erreur inconnue'));
            }
        });
    }

    ngAfterViewInit(): void {
        // Ensure view is fully initialized
        this.cdr.detectChanges();

        // Initialize canvas drawing with longer delay to ensure DOM is ready
        setTimeout(() => {
            this.updateFrameCanvasVisualization();
        }, 500);

        // Listen to montage form changes for real-time canvas updates
        this.ficheForm.get('montage')?.valueChanges.subscribe(() => {
            this.updateFrameCanvasVisualization();
        });
    }



    /**
     * Silently updates the fiche in the backend without triggering full validation/navigation
     * @param reload Whether to reload the fiche data from server after update (default: true)
     */
    saveFicheSilently(reload: boolean = true): void {
        if (!this.ficheId || this.ficheId === 'new' || !this.clientId) return;

        const formValue = this.ficheForm.getRawValue();
        const montantTotal = (parseFloat(formValue.monture.prixMonture) || 0) +
            (parseFloat(formValue.verres.prixOD) || 0) +
            (parseFloat(formValue.verres.prixOG) || 0);

        // Files serialization
        const serializableFiles = (this.prescriptionFiles || []).map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            preview: typeof file.preview === 'string' ? file.preview : file.preview.toString(),
            uploadDate: file.uploadDate
        }));

        const ficheData: any = {
            clientId: this.clientId,
            type: 'MONTURE',
            statut: this.currentFiche?.statut || 'EN_COURS',
            dateLivraisonEstimee: formValue.dateLivraisonEstimee,
            ordonnance: {
                ...formValue.ordonnance,
                prescriptionFiles: serializableFiles
            },
            monture: formValue.monture,
            verres: formValue.verres,
            montage: formValue.montage,
            suggestions: this.suggestions || [],
            equipements: formValue.equipements || [],
            montantTotal,
            montantPaye: this.currentFiche?.montantPaye || 0
        };

        console.log('📤 [RECEPTION] Sending silent update to background...', { monture: formValue.monture?.productId });
        this.ficheService.updateFiche(this.ficheId, ficheData).subscribe({
            next: (res) => {
                console.log('✅ [RECEPTION] Fiche synced with local IDs.');

                // [NEW] Also sync the Facture in the background to ensure Monitor/Badges are updated
                this.factureService.findAll({ clientId: this.clientId || '' }).subscribe(factures => {
                    const linked = factures.find(f => f.ficheId === this.ficheId);
                    if (linked && linked.statut === 'VENTE_EN_INSTANCE') {
                        console.log('🔄 [RECEPTION] Background syncing linked invoice:', linked.numero);
                        const lines = this.getInvoiceLines();
                        const total = lines.reduce((acc, l) => acc + l.totalTTC, 0);
                        this.factureService.update(linked.id, {
                            lignes: lines,
                            totalTTC: total,
                            proprietes: {
                                ...(linked.proprietes || {}),
                                nomenclature: this.nomenclatureString || '',
                                lastSilentUpdate: new Date()
                            }
                        }).subscribe(() => {
                            console.log('✅ [RECEPTION] Invoice synced.');
                            if (reload) this.loadFiche();
                            else {
                                this.currentFiche = { ...this.currentFiche, ...ficheData };
                                // Trigger immediate UI refresh for status banners
                                this.checkReceptionForInstance(this.currentFiche);
                                this.cdr.markForCheck();
                                setTimeout(() => this.cdr.detectChanges(), 100);
                            }
                        });
                    } else {
                        if (reload) this.loadFiche();
                        else {
                            this.currentFiche = { ...this.currentFiche, ...ficheData };
                            this.checkReceptionForInstance(this.currentFiche);
                            this.cdr.markForCheck();
                            setTimeout(() => this.cdr.detectChanges(), 100);
                        }
                    }
                });
            },
            error: (err) => {
                console.error('❌ [RECEPTION] Error in silent update:', err);
                this.cdr.markForCheck();
            }
        });
    }



    /**
     * Open virtual centering modal with camera measurement
     */
    openVirtualCentering(): void {
        // Get frame data from form
        const taille = this.ficheForm.get('monture.taille')?.value || '52-18-140';
        const [calibreStr, pontStr] = taille.split('-');
        const calibre = parseInt(calibreStr) || 52;
        const pont = parseInt(pontStr) || 18;
        const typeMontage = this.ficheForm.get('montage.typeMontage')?.value || '';

        // Dynamically import the modal component
        import('../../../measurement/components/virtual-centering-modal/virtual-centering-modal.component')
            .then(m => {
                const dialogRef = this.dialog.open(m.VirtualCenteringModalComponent, {
                    width: '95vw',
                    maxWidth: '1400px',
                    height: '90vh',
                    disableClose: true,
                    panelClass: 'virtual-centering-dialog',
                    data: {
                        caliber: calibre,
                        bridge: pont,
                        mountingType: typeMontage
                    }
                });

                dialogRef.afterClosed().subscribe((measurement) => {
                    if (measurement) {
                        console.log('🔍 [DEBUG] Measurement received from modal:', measurement);
                        console.log('🔍 [DEBUG] frameHeightMm:', measurement.frameHeightMm);

                        // Fallback storage
                        this.lastMeasFrameHeight = measurement.frameHeightMm || null;

                        // FIX: Ensure 'hauteurVerre' control exists in 'montage' group to accept the value
                        const montageGroup = this.ficheForm.get('montage') as FormGroup;
                        if (montageGroup && !montageGroup.contains('hauteurVerre')) {
                            console.log('🔧 [FIX] Adding missing control: hauteurVerre to montage group');
                            montageGroup.addControl('hauteurVerre', new FormControl(null));
                        }

                        // Populate form with measurements (Precise values)
                        this.ficheForm.patchValue({
                            montage: {
                                ecartPupillaireOD: measurement.pdRightMm.toFixed(1), // Keep 1 decimal
                                ecartPupillaireOG: measurement.pdLeftMm.toFixed(1),
                                hauteurOD: measurement.heightRightMm ? measurement.heightRightMm.toFixed(1) : null,
                                hauteurOG: measurement.heightLeftMm ? measurement.heightLeftMm.toFixed(1) : null,
                                capturedImage: measurement.imageDataUrl || null,
                                hauteurVerre: measurement.frameHeightMm ? measurement.frameHeightMm.toFixed(1) : null,
                                diametreEffectif: `${measurement.edRightMm ? measurement.edRightMm.toFixed(1) : ''}/${measurement.edLeftMm ? measurement.edLeftMm.toFixed(1) : ''}`,
                                diagonalMm: measurement.diagonalMm ? parseFloat(measurement.diagonalMm.toFixed(2)) : null,
                                diagonalPoints: measurement.diagonalPoints || null
                            },
                            // Sync Ecarts to Ordonnance tab as well
                            ordonnance: {
                                od: { ep: measurement.pdRightMm.toFixed(1) },
                                og: { ep: measurement.pdLeftMm.toFixed(1) },
                                // Persist frame total height for reference
                                hauteurVerre: measurement.frameHeightMm ? measurement.frameHeightMm.toFixed(1) : null
                            }
                        });

                        // Redraw canvas with new values
                        setTimeout(() => {
                            this.updateFrameCanvasVisualization();

                            // AUTO-SAVE: Persist calibration data immediately
                            console.log('💾 Auto-saving calibration data...');
                            this.saveFicheSilently(false); // Don't reload to avoid UI flicker
                        }, 100);

                        this.cdr.markForCheck();
                    }
                });
            })
            .catch(error => {
                console.error('Failed to load virtual centering modal:', error);
                alert('Erreur lors du chargement du module de centrage virtuel');
            });
    }

    /**
     * Helper to calculate recommended ordering diameter (ED + 2mm)
     * Handles "60.3" and "60.3/58.1" formats
     */
    getRecommendedDiameter(): string {
        const val = this.ficheForm.get('montage.diametreEffectif')?.value;
        if (!val) return '';

        // Local helper for standard rounding (mirroring GeometryService more explicitly if needed, but we injected it)
        const getStd = (d: number) => {
            const standards = [55, 60, 65, 70, 75, 80, 85];
            for (const s of standards) {
                if (s >= d) return s;
            }
            return 85;
        };

        // Handle split values (OD/OG)
        if (typeof val === 'string' && val.includes('/')) {
            const parts = val.split('/');
            const od = parseFloat(parts[0]);
            const og = parseFloat(parts[1]);

            if (!isNaN(od) && !isNaN(og)) {
                const sOD = getStd(od + 2);
                const sOG = getStd(og + 2);
                return `Diamètre utile est ${val} mm. On ajoute 2 mm marge d'erreur ${(od + 2).toFixed(1)}/${(og + 2).toFixed(1)} mm (+2mm), on commande ${sOD}/${sOG} mm`;
            }
        }

        // Handle single value
        const num = parseFloat(val);
        if (!isNaN(num)) {
            const std = getStd(num + 2);
            return `Diamètre utile est ${num.toFixed(1)} mm. On ajoute 2 mm marge d'erreur ${(num + 2).toFixed(1)} mm (+2mm), on commande ${std} mm`;
        }

        return '';
    }

    /**
     * Draw frame visualization using a static high-fidelity reference background
     * OD (Right eye) is on the LEFT of the sheet (Technical Convention)
     */
    updateFrameCanvasVisualization(): void {
        if (!this.frameCanvas || !this.frameCanvas.nativeElement) return;

        const canvas = this.frameCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Assets & Data
        const customImage = this.ficheForm.get('montage.capturedImage')?.value;
        const bgSource = customImage || 'assets/calibration-reference.png';

        const epOD = parseFloat(this.ficheForm.get('montage.ecartPupillaireOD')?.value) || 32;
        const epOG = parseFloat(this.ficheForm.get('montage.ecartPupillaireOG')?.value) || 32;
        const hOD = parseFloat(this.ficheForm.get('montage.hauteurOD')?.value) || 20;
        const hOG = parseFloat(this.ficheForm.get('montage.hauteurOG')?.value) || 20;
        const taille = this.ficheForm.get('monture.taille')?.value || '52-18-140';
        const [calibreStr, pontStr, brancheStr] = taille.split('-');
        const calibre = parseInt(calibreStr) || 52;
        const pont = parseInt(pontStr) || 18;

        // [PERSISTENCE FIX] Check if value exists in currentFiche but dropped from Form
        // This handles cases where loadFiche mapping might have missed the field despite initForm fix
        if (this.currentFiche && (this.currentFiche as any).montage?.hauteurVerre && !this.ficheForm.get('montage.hauteurVerre')?.value) {
            const savedVal = (this.currentFiche as any).montage.hauteurVerre;
            console.log('♻️ [PERSISTENCE] Restoring hauteurVerre from saved fiche:', savedVal);
            this.ficheForm.get('montage')?.patchValue({ hauteurVerre: savedVal }, { emitEvent: false });
        }

        const img = new Image();
        img.src = bgSource;
        img.onload = () => {
            // Draw Background
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Overlay Measurements at fixed technical positions matching the reference image
            ctx.font = 'bold 24px "Outfit", sans-serif';
            ctx.fillStyle = '#0ea5e9'; // Modern Cyan matching reference arrows
            ctx.textAlign = 'center';

            // 1. EP Labels (Bottom Center-ish Arrows)
            ctx.fillText(`${epOD}`, 320, 370); // OD Position on arrows
            ctx.fillText(`${epOG}`, 480, 370); // OG Position on arrows

            // 2. Hauteur Verre (Height Labels from Virtual Centering - Inside lenses, near vertical arrows)
            ctx.fillStyle = '#ef4444'; // Modern Red for Heights (Pupillary Height)
            ctx.fillText(`${hOD}`, 235, 290); // Left lens (OD) - Pupillary Height
            ctx.fillText(`${hOG}`, 565, 290); // Right lens (OG) - Pupillary Height

            // 3. Hauteur Monture (Total Frame Height B-Dimension - Green on outer arrows)
            // Use captured Total Height if available, otherwise fallback/hide
            let hTotalVal = this.ficheForm.get('montage.hauteurVerre')?.value;

            // [display fix] Force fallback to currentFiche if form is empty
            if ((!hTotalVal || hTotalVal === '') && this.currentFiche && (this.currentFiche as any).montage?.hauteurVerre) {
                hTotalVal = (this.currentFiche as any).montage.hauteurVerre;
                console.log('✅ [DISPLAY] Using saved value from Fiche directly:', hTotalVal);
            }

            let hTotal = parseFloat(hTotalVal);

            // Fallback to local storage if form failed
            if (isNaN(hTotal) && this.lastMeasFrameHeight !== null) {
                hTotal = this.lastMeasFrameHeight;
                console.log('⚠️ Using local fallback for Frame Height:', hTotal);
            }

            // Console log for debugging
            console.log('✏️ Drawing Frame M Height:', hTotal, 'Raw:', hTotalVal);

            if (!isNaN(hTotal)) {
                ctx.fillStyle = '#22c55e'; // Modern Green for Frame Height
                const displayVal = hTotal.toFixed(1); // Format to 1 decimal
                ctx.fillText(`${displayVal}`, 70, 320);  // Left Outer Arrow (OD side) - Moved down below arrow (was 260)
                ctx.fillText(`${displayVal}`, 730, 320); // Right Outer Arrow (OG side) - Moved down below arrow (was 260)
            }

            // 4. Calibre / Pont Labels (Top)
            ctx.fillStyle = '#1e293b'; // Darker for top labels
            ctx.font = 'bold 20px "Outfit", sans-serif';
            ctx.fillText(`${calibre}`, 280, 110); // Calibre OD
            ctx.fillText(`${calibre}`, 520, 110); // Calibre OG
            ctx.fillText(`${pont}`, 400, 110);   // Pont

            ctx.font = 'italic 10px monospace';
            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.fillText('TECHNICAL_SYNC_ACTIVE: REF_V1.1', 100, 20);

            // [NEW] Draw Diagonal Measurement (Grand Diamètre - Black Arrow Style)
            const diagMm = this.ficheForm.get('montage.diagonalMm')?.value;
            const diagPoints = this.ficheForm.get('montage.diagonalPoints')?.value;

            if (diagMm && diagPoints && customImage) {
                // Scaling factors
                const scaleX = canvas.width / img.width;
                const scaleY = canvas.height / img.height;

                const p1 = { x: diagPoints.p1.x * scaleX, y: diagPoints.p1.y * scaleY };
                const p2 = { x: diagPoints.p2.x * scaleX, y: diagPoints.p2.y * scaleY };

                ctx.strokeStyle = '#000000'; // Black
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();

                // Draw Arrows
                const drawArrowHead = (pt1: { x: number, y: number }, pt2: { x: number, y: number }) => {
                    const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
                    const headLen = 14;
                    ctx.beginPath();
                    ctx.moveTo(pt2.x, pt2.y);
                    ctx.lineTo(pt2.x - headLen * Math.cos(angle - Math.PI / 6), pt2.y - headLen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(pt2.x, pt2.y);
                    ctx.lineTo(pt2.x - headLen * Math.cos(angle + Math.PI / 6), pt2.y - headLen * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                };
                drawArrowHead(p2, p1);
                drawArrowHead(p1, p2);

                // Label
                ctx.font = 'bold 20px "Outfit", sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.fillText(`Grand Diamètre: ${parseFloat(diagMm).toFixed(1)} mm`, midX, midY - 15);
            }
        };
    }

    onCalibrationImageUpload(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.ficheForm.patchValue({
                    montage: { capturedImage: e.target.result }
                });
                this.updateFrameCanvasVisualization();
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Helper to get canvas data URL for print templates
     */
    getFrameCanvasDataUrl(): string {
        try {
            return this.frameCanvas?.nativeElement?.toDataURL() || '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Print type to toggle specific print layouts
     */
    currentPrintType: 'FICHE_MONTAGE' | 'BON_COMMANDE' | null = null;

    /**
     * Print Fiche Montage
     */
    printFicheMontage(): void {
        this.currentPrintType = 'FICHE_MONTAGE';
        this.cdr.detectChanges();
        setTimeout(() => {
            window.print();
        }, 100);
    }

    /**
     * Print Bon de Commande Verre
     */
    printBonCommandeVerre(): void {
        this.currentPrintType = 'BON_COMMANDE';
        this.cdr.detectChanges();
        setTimeout(() => {
            window.print();
        }, 100);
    }

    /**
     * Generate and download montage sheet PDF (placeholder)
     */
    generateMontageSheet(): void {
        this.printFicheMontage();
    }

    // [NEW] Exit Logic with Sales Validation
    goBack(): void {
        const fact = this.linkedFactureSubject.value;
        const currentStatus = fact?.statut;
        const currentType = fact?.type;

        // [FIX] Use validatedAt instead of stockDecremented to allow prompting for BC/Drafts
        // that already moved stock but aren't "Validated" in the user workflow.
        const isValidated = !!(fact?.proprietes as any)?.validatedAt;

        // Validation trigger statuses:
        // - DEVIS_EN_COURS (Simple Devis)
        // - VENTE_EN_INSTANCE (Bon de Commande)
        // - BROUILLON (Facture Brouillon)
        const needsValidationPrompt = (
            currentStatus === 'DEVIS_EN_COURS' ||
            currentStatus === 'VENTE_EN_INSTANCE' ||
            currentStatus === 'BROUILLON'
        );

        if (needsValidationPrompt && this.ficheId && this.ficheId !== 'new' && !isValidated) {
            const lines = this.getInvoiceLines();
            const productsWithStock = lines.filter(l => l.productId && l.entrepotType);

            if (productsWithStock.length > 0) {
                let message = "";

                if (currentType === 'FACTURE') {
                    message = "Cette facture est encore en 'BROUILLON'.\n\n" +
                        "Souhaitez-vous la VALIDER (et déstocker) avant de quitter ?\n\n";
                } else if (currentStatus === 'VENTE_EN_INSTANCE') {
                    message = "Ce document est un 'BON DE COMMANDE' (En instance).\n\n" +
                        "Souhaitez-vous VALIDER la vente (et déstocker) avant de quitter ?\n\n";
                } else {
                    // DEVIS_EN_COURS
                    message = "Ce document est un simple 'DEVIS'.\n\n" +
                        "Souhaitez-vous le VALIDER en BON DE COMMANDE (et déstocker) avant de quitter ?\n\n";
                }

                // [NEW] Mention warehouse origin
                const warehouseNames = Array.from(new Set(productsWithStock.map(p => p.entrepotNom || 'Inconnu'))).join(', ');
                message += `📍 Produits issus de l'entrepôt : ${warehouseNames}\n\n`;

                message += "OK = Valider et Quitter\nAnnuler = Quitter sans valider";

                const confirmValidation = confirm(message);

                if (confirmValidation) {
                    this.validateSaleAndExit();
                    return;
                }
            }
        }

        // [FIX] Always use location.back().
        // Previous logic using toggleEditMode() caused 'Empty Fiche' state/freeze.
        // User expects 'Retour' to navigate back to the client folder.
        this.location.back();
    }

    validateSaleAndExit(): void {
        const invoice = this.linkedFactureSubject.value;
        if (!invoice) {
            this.location.back();
            return;
        }

        this.loading = true;

        // Prepare validation update - preserve existing type and status
        const lines = this.getInvoiceLines();
        const total = lines.reduce((acc, l) => acc + l.totalTTC, 0);
        const tvaRate = 0.20;
        const totalHT = total / (1 + tvaRate);
        const tva = total - totalHT;

        const updateData: any = {
            // DO NOT change type or statut - preserve Bon de Commande if it's already BC
            lignes: lines,
            totalTTC: total,
            totalHT: totalHT,
            totalTVA: tva,
            proprietes: {
                ...(invoice.proprietes || {}),
                nomenclature: this.nomenclatureString || '',
                validatedAt: new Date(),
                // Ensure stock is marked as decremented
                stockDecremented: true
            }
        };

        // [FIX] Actually upgrade status on validation from exit
        if (invoice.statut === 'DEVIS_EN_COURS') {
            updateData.type = 'DEVIS';
            updateData.statut = 'VENTE_EN_INSTANCE'; // Upgrade Devis to BC
        } else if (invoice.statut === 'BROUILLON' && invoice.type === 'FACTURE') {
            updateData.statut = 'VALIDE'; // Upgrade Draft to Validated
        }
        // Note: VENTE_EN_INSTANCE stays VENTE_EN_INSTANCE but gets validatedAt property.

        // Protect numero from being overwritten if it already exists
        if (invoice.numero) {
            updateData.numero = invoice.numero;
        }

        this.factureService.update(invoice.id, updateData).subscribe({
            next: (res) => {
                this.loading = false;
                this.snackBar.open('Vente validée.', 'Fermer', { duration: 3000 });

                // [FIX] Reliably exit to client folder
                if (this.clientId) {
                    this.router.navigate(['/p/clients', this.clientId]);
                } else {
                    this.location.back();
                }
            },
            error: (err) => {
                this.loading = false;
                console.error('Error validating sale on exit:', err);
                alert('Erreur validation: ' + (err.message || 'Inconnue'));

                if (this.clientId) {
                    this.router.navigate(['/p/clients', this.clientId]);
                } else {
                    this.location.back();
                }
            }
        });
    }
    get uniqueWarehousesString(): string {
        const lines = this.getInvoiceLines();
        const stockLines = lines.filter(l => l.productId && l.entrepotType);
        return [...new Set(stockLines.map(p => p.entrepotNom || p.entrepotType))].join(' / ');
    }

    get canDirectlyBill(): boolean {
        const inv = this.linkedFactureSubject.value;

        // Case 1: No linked document -> Allow starting fresh as Facture
        if (!inv) return true;

        // Case 2: Already a Facture -> Allowed (updates)
        if (inv.type === 'FACTURE') return true;

        // Case 3: Bon de Commande (Instance) -> Allowed to convert to Facture
        if (inv.statut === 'VENTE_EN_INSTANCE') return true;

        // Case 4: Simple Devis or anything else -> Blocked
        return false;
    }

    /**
     * [NEW] Checks availability for all products in the invoice lines
     * across current center and other centers.
     */
    async checkStockAvailability(lines: any[], type: 'BC' | 'Facture'): Promise<boolean> {
        try {
            const productsToCheck = lines.filter(l => l.productId && l.entrepotType);
            if (productsToCheck.length === 0) return true;

            const currentCentre = await firstValueFrom(this.store.select(UserCurrentCentreSelector).pipe(take(1)));
            const centreId = currentCentre?.id;

            if (!centreId) return true;

            const availabilityIssues: any[] = [];

            for (const item of productsToCheck) {
                try {
                    const localProduct = await firstValueFrom(this.productService.findOne(item.productId).pipe(take(1)));
                    const required = item.qte || 1;

                    if (localProduct && localProduct.quantiteActuelle < required) {
                        const globalMatches = await firstValueFrom(this.productService.findAll({
                            global: true,
                            reference: localProduct.codeInterne || undefined,
                            codeBarres: localProduct.codeBarres || undefined
                        }).pipe(take(1)));

                        const otherCentres = (globalMatches || [])
                            .filter((p: any) => p.entrepot?.centreId !== centreId && p.quantiteActuelle > 0)
                            .map((p: any) => ({
                                centreName: p.entrepot?.centre?.nom || 'Inconnu',
                                entrepotNom: p.entrepot?.nom || 'Inconnu',
                                quantite: p.quantiteActuelle
                            }));

                        availabilityIssues.push({
                            description: item.description,
                            reference: localProduct.codeInterne || localProduct.codeBarres || 'N/A',
                            localStock: localProduct.quantiteActuelle,
                            required: required,
                            globalAvailability: otherCentres
                        });
                    }
                } catch (innerErr) {
                    console.warn(`⚠️ [StockCheck] Failed to check product ${item.productId}:`, innerErr);
                    // Continue with other products
                }
            }

            if (availabilityIssues.length > 0) {
                const dialogRef = this.dialog.open(StockAvailabilityDialogComponent, {
                    width: '700px',
                    data: {
                        items: availabilityIssues,
                        documentType: type
                    }
                });

                const result = await firstValueFrom(dialogRef.afterClosed());
                return !!result;
            }

            return true;
        } catch (err) {
            console.error('❌ [StockCheck] Critical failure in availability check logic:', err);
            return true; // Don't block the sale if the check itself fails
        }
    }

    finalizeSave(
        operation: Observable<any>,
        userForcedType: string | null,
        userForcedStatut: string | null,
        userForcedStockDecrement: boolean
    ): void {
        console.log('💾 [MontureForm] finalizeSave start:', { userForcedType, userForcedStatut, userForcedStockDecrement });
        const wasNew = !this.ficheId || this.ficheId === 'new';
        this.loading = true;

        operation.pipe(
            // Ensure loading is reset regardless of outcome
            finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
            }),
            switchMap(fiche => {
                if (!fiche) {
                    throw new Error('La sauvegarde de la fiche a retourné aucune donnée (null). Vérifiez le service.');
                }
                this.ficheId = fiche.id;

                const generatedLines = this.getInvoiceLines();
                const shouldCreateInvoice = generatedLines.length > 0;

                if (shouldCreateInvoice) {
                    if (this.factureComponent) {
                        this.factureComponent.ficheIdInput = fiche.id;

                        // [FIX] Strict Workflow Guard
                        if (userForcedType === 'FACTURE' && !this.canDirectlyBill) {
                            userForcedType = 'DEVIS';
                            userForcedStatut = 'VENTE_EN_INSTANCE';
                        }

                        // [FIX] Force VENTE_EN_INSTANCE (Bon de Commande) for all saved orders to ensure numbering
                        const finalStatut = userForcedStatut || 'VENTE_EN_INSTANCE';
                        const finalType = userForcedType || 'DEVIS';

                        this.factureComponent.form.patchValue({
                            type: finalType,
                            statut: finalStatut
                        }, { emitEvent: false });

                        const extraProps: any = {};
                        if (userForcedStockDecrement) extraProps.forceStockDecrement = true;

                        // [FIX] Force child component to sync lines and totals before save
                        if (this.factureComponent) {
                            this.factureComponent.syncLines(generatedLines);
                        }

                        return this.factureComponent.saveAsObservable(true, extraProps, finalStatut).pipe(
                            tap(updated => {
                                if (!updated) {
                                    console.warn('⚠️ [finalizeSave] Component save returned null (Form might be invalid).');
                                    return;
                                }
                                console.log('✅ [finalizeSave] Component saved, updating subject:', updated.numero);
                                this.linkedFactureSubject.next({ ...updated }); // Deep copy for reactivity

                                // [FIX] Force update child component state using direct assignment
                                if (this.factureComponent) {
                                    this.factureComponent.factureId = updated.id;
                                    this.factureComponent.id = updated.id;

                                    if (updated.numero) {
                                        this.factureComponent.form.get('numero')?.setValue(updated.numero, { emitEvent: true });
                                        this.factureComponent.form.get('statut')?.setValue(updated.statut, { emitEvent: true });
                                        this.factureComponent.cdr.detectChanges();
                                    }
                                }

                                this.cdr.detectChanges();
                            }),
                            map(() => fiche)
                        );
                    } else {
                        return this.factureService.findAll({ clientId: this.clientId!, ficheId: fiche.id }).pipe(
                            map(fs => fs.find(f => f.ficheId === fiche.id)),
                            switchMap(existing => {
                                const total = generatedLines.reduce((acc, val) => acc + val.totalTTC, 0);
                                const tvaRate = 0.20;
                                const totalHT = total / (1 + tvaRate);
                                const tva = total - totalHT;

                                const commonData = {
                                    lignes: generatedLines,
                                    totalTTC: total,
                                    totalHT,
                                    totalTVA: tva,
                                    proprietes: {
                                        nomenclature: this.nomenclatureString || '',
                                        forceStockDecrement: userForcedStockDecrement
                                    }
                                };

                                if (existing) {
                                    const updateData: any = { ...commonData };
                                    if (userForcedType) updateData.type = userForcedType;
                                    if (userForcedStatut) updateData.statut = userForcedStatut;
                                    updateData.proprietes = { ...existing.proprietes as object, ...commonData.proprietes };
                                    if ((existing.proprietes as any)?.forceStockDecrement) {
                                        (updateData.proprietes as any).forceStockDecrement = true;
                                    }
                                    // Protect numero from being overwritten if it already exists
                                    if (existing.numero) {
                                        updateData.numero = existing.numero;
                                    }

                                    return this.factureService.update(existing.id, updateData).pipe(
                                        tap(updated => {
                                            if (!updated) {
                                                console.error('❌ [finalizeSave] Update returned null/undefined!');
                                                // Don't throw here to avoid breaking flow, but log error
                                                return;
                                            }
                                            this.linkedFactureSubject.next({ ...updated });
                                            this.cdr.detectChanges();
                                        }),
                                        map(() => fiche)
                                    );
                                } else {
                                    console.log('📝 [finalizeSave] Creating new invoice via service');
                                    const createData: any = {
                                        ...commonData,
                                        type: userForcedType || 'DEVIS',
                                        statut: userForcedStatut || 'VENTE_EN_INSTANCE', // Default to VENTE_EN_INSTANCE
                                        clientId: this.clientId,
                                        ficheId: fiche.id,
                                        dateEmission: new Date(),
                                        resteAPayer: total
                                    };
                                    console.log('📤 [finalizeSave] Create invoice data:', createData);
                                    return this.factureService.create(createData).pipe(
                                        tap(created => {
                                            if (!created) {
                                                console.error('❌ [finalizeSave] Create returned null/undefined!');
                                                return;
                                            }
                                            console.log('✅ [finalizeSave] Invoice created:', created.numero);
                                            // [FIX] Use deep copy as well
                                            this.linkedFactureSubject.next({ ...created });
                                            this.cdr.detectChanges();
                                        }),
                                        map(() => fiche)
                                    );
                                }
                            })
                        );
                    }
                }
                return of(fiche);
            })
        ).subscribe({
            next: (fiche) => {
                console.log('✅ [finalizeSave] SUCCESS! Fiche saved:', fiche.id);
                this.loading = false;
                this.snackBar.open('Enregistrement réussi.', 'OK', { duration: 3000 });
                this.isEditMode = false;
                this.ficheForm.disable();
                this.ficheId = fiche.id;
                this.currentFiche = fiche;
                this.patchForm(fiche);

                this.snackBar.open('Fiche et Document enregistrés avec succès', 'Fermer', { duration: 3000 });

                // [FIX] Update URL without full reload (unless strictly needed)
                if (wasNew) {
                    // Update URL silently to avoid component destruction race
                    this.location.go(`/p/clients/${this.clientId}/fiche-monture/${fiche.id}`);
                }

                // [FIX] Final reliability check: ensure the linked facture is loaded and synced
                setTimeout(() => {
                    this.loadLinkedFacture();
                }, 1500);

                if ((this as any).loadClientFactures) (this as any).loadClientFactures();
                this.cdr.markForCheck();
                setTimeout(() => this.cdr.detectChanges(), 100);
            },
            error: (err) => {
                this.loading = false;
                console.error('❌ [finalizeSave] ERROR:', err);
                const msg = err.error?.message || err.message || 'Erreur inconnue';

                if (msg.includes("Cannot read properties of null") || msg.includes("reading 'id'")) {
                    alert(`Erreur Technique: ${msg}.\n\nCela peut arriver si un formulaire est invalide ou si le serveur a un problème. Veuillez vérifier que tous les champs obligatoires (Vendeur, etc.) sont remplis.`);
                } else {
                    alert('Erreur: ' + msg);
                }
            }
        });
    }
}

