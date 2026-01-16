
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
import { FicheMontureCreate, TypeFiche, StatutFiche, TypeEquipement, SuggestionIA, FicheProduit } from '../../models/fiche-client.model';
import { FactureService, Facture } from '../../services/facture.service';
import { FactureFormComponent } from '../facture-form/facture-form.component';
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
    selector: 'app-fiche-produit-form',
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
        FactureFormComponent
    ],
    providers: [
        ClientManagementService,
        FicheService,
        FactureService,
        ProductService
    ],
    templateUrl: './fiche-produit-form.component.html',
    styleUrls: ['./fiche-produit-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FicheProduitFormComponent implements OnInit, OnDestroy {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    @ViewChild('saveDialog') saveDialogTemplate!: TemplateRef<any>;
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
    @ViewChild('frameCanvasElement') frameCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild(FactureFormComponent) factureComponent!: FactureFormComponent;
    // PaymentListComponent removed from view child usage as tab is hidden, but kept in imports if needed later

    ficheForm: FormGroup;
    clientId: string | null = null;
    client: Client | null = null;
    allProducts: any[] = [];
    ficheId: string | null = null;
    activeTab: number = 0;
    loading = false;
    isEditMode = false;
    centreId: string | null = null;

    readonly TypeEquipement = TypeEquipement;

    selectedEquipmentType = new FormControl<TypeEquipement | null>(null);
    typesEquipement = Object.values(TypeEquipement);

    lensMaterials: string[] = getLensMaterials();

    dateToday = new Date();

    get minDate(): Date {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    isTabAccessible(index: number): boolean {
        // Tab mapping: 0=Ordonnance, 1=Montures/Verres, 2=Facturation (Hidden Payments in between)
        if (index <= 1) return true;

        // Requirements for moving past tab 1
        if (!this.ficheId || this.ficheId === 'new') {
            return false;
        }

        const dateVal = this.ficheForm.get('dateLivraisonEstimee')?.value;
        const hasLinkedInvoice = !!this.linkedFactureSubject.value;
        if (!dateVal && !hasLinkedInvoice) {
            return false;
        }

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

    lensBrands: string[] = [
        'Essilor', 'Zeiss', 'Hoya', 'Nikon', 'Rodenstock', 'Seiko',
        'BBGR', 'Optiswiss', 'Shamir', 'Kodak', 'Generic', 'Autre'
    ];

    typesMontage: string[] = [
        'Cerclé (Complet)', 'Percé (Nylor)', 'Semi-cerclé (Nylor)', 'Sans monture (Percé)'
    ];

    mainEquipmentExpanded = true;
    addedEquipmentsExpanded: boolean[] = [];

    suggestions: SuggestionIA[] = [];
    showSuggestions = false;
    activeSuggestionIndex: number | null = null;

    prescriptionFiles: PrescriptionFile[] = [];
    viewingFile: PrescriptionFile | null = null;

    showCameraModal = false;
    cameraStream: MediaStream | null = null;
    capturedImage: string | null = null;

    public linkedFactureSubject = new BehaviorSubject<Facture | null>(null);
    linkedFacture$ = this.linkedFactureSubject.asObservable();

    private destroy$ = new Subject<void>();

    // No reception checks for generic FicheProduit usually, but keeping logic just in case
    receptionComplete = false;
    isReserved = false;
    isTransit = false;
    currentFiche: any = null;
    initialLines: any[] = [];
    loggedInUser: any = null;

    nomenclatureString: string | null = null;

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
        const montageGroup = this.ficheForm.get('montage') as FormGroup;
        if (montageGroup && !montageGroup.contains('hauteurVerre')) {
            montageGroup.addControl('hauteurVerre', new FormControl(null));
        }

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
                this.isEditMode = false;
                this.ficheForm.disable();
                this.loadFiche();
                this.loadLinkedFacture();
            } else {
                this.isEditMode = true;
                this.ficheForm.enable();
                this.setActiveTab(0); // Start on Ordonnance for new
            }
        });

        this.store.select(UserCurrentCentreSelector).pipe(take(1)).subscribe(c => {
            if (c) this.centreId = c.id;
        });

        this.setupLensListeners(this.ficheForm);
        this.setupLensTypeAutoUpdate();
        this.setupSynchronization();

        this.selectedEquipmentType.valueChanges.subscribe(value => {
            if (value && this.equipements.length === 0) {
                this.ficheForm.get('monture.typeEquipement')?.setValue(value);
            }
        });

        this.ficheForm.get('ordonnance')?.valueChanges.subscribe(() => {
            this.updateNomenclature();
        });
        this.updateNomenclature();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // Simplified logic: no reception check for now on generic fiche
    checkReceptionForInstance(fiche: any): void { }

    loadLinkedFacture(): void {
        if (!this.clientId || !this.ficheId || this.ficheId === 'new') return;
        this.factureService.findAll({ ficheId: this.ficheId }).subscribe({
            next: (factures) => {
                const found = factures[0];
                console.log('📄 [FicheProduit] Linked Invoice loaded:', found);
                if (found) {
                    this.linkedFactureSubject.next(found);
                    // Critical safety: If invoice exists but has no number, forcefully reload/repair?
                    if (!found.numero) {
                        console.warn('⚠️ [FicheProduit] Loaded invoice has NO NUMBER! ID:', found.id);
                    }
                } else if (!this.linkedFactureSubject.value?.numero) {
                    this.linkedFactureSubject.next(null);
                }
            },
            error: (err) => console.error('Error loading linked invoice:', err)
        });
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
    }

    setupSynchronization(): void {
        const ordonnance = this.ficheForm.get('ordonnance');
        const montage = this.ficheForm.get('montage');
        if (!ordonnance || !montage) return;

        ordonnance.get('od.ep')?.valueChanges.subscribe(val => {
            if (val && val !== montage.get('ecartPupillaireOD')?.value) {
                montage.patchValue({ ecartPupillaireOD: val }, { emitEvent: false });
            }
        });
        ordonnance.get('og.ep')?.valueChanges.subscribe(val => {
            if (val && val !== montage.get('ecartPupillaireOG')?.value) {
                montage.patchValue({ ecartPupillaireOG: val }, { emitEvent: false });
            }
        });
        montage.get('ecartPupillaireOD')?.valueChanges.subscribe(val => {
            if (val && val !== ordonnance.get('od.ep')?.value) {
                ordonnance.patchValue({ od: { ep: val } }, { emitEvent: false });
            }
        });
        montage.get('ecartPupillaireOG')?.valueChanges.subscribe(val => {
            if (val && val !== ordonnance.get('og.ep')?.value) {
                ordonnance.patchValue({ og: { ep: val } }, { emitEvent: false });
            }
        });
    }

    toggleEditMode(): void {
        this.isEditMode = !this.isEditMode;
        if (this.isEditMode) {
            this.ficheForm.enable();
        } else {
            this.ficheForm.disable();
            if (this.ficheId && this.ficheId !== 'new') {
                this.loadFiche();
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

    setupLensListeners(group: AbstractControl): void {
        const verresGroup = group.get('verres');
        if (!verresGroup) return;
        const updatePrice = () => this.calculateLensPrices(group);

        verresGroup.get('matiere')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indice')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitement')?.valueChanges.subscribe(updatePrice);

        verresGroup.get('differentODOG')?.valueChanges.subscribe((isSplit: boolean) => {
            if (isSplit) {
                const currentVals = verresGroup.value;
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

        verresGroup.get('matiereOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indiceOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitementOD')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('matiereOG')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('indiceOG')?.valueChanges.subscribe(updatePrice);
        verresGroup.get('traitementOG')?.valueChanges.subscribe(updatePrice);

        verresGroup.get('prixOD')?.valueChanges.subscribe((val) => {
            if (!verresGroup.get('differentODOG')?.value) {
                verresGroup.get('prixOG')?.setValue(val, { emitEvent: false });
            }
        });
    }

    setupLensTypeAutoUpdate(): void {
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
        this.ficheForm.get('monture.typeEquipement')?.valueChanges.subscribe(() => updateMainLensType());
        this.ficheForm.get('ordonnance.od.addition')?.valueChanges.subscribe(() => updateMainLensType());
        this.ficheForm.get('ordonnance.og.addition')?.valueChanges.subscribe(() => updateMainLensType());
    }

    calculateLensPrices(group: AbstractControl = this.ficheForm): void {
        const verresGroup = group.get('verres');
        if (!verresGroup) return;

        const differentODOG = verresGroup.get('differentODOG')?.value;
        let prixOD = 0;
        let prixOG = 0;

        if (differentODOG) {
            const matiereOD = verresGroup.get('matiereOD')?.value;
            const indiceOD = verresGroup.get('indiceOD')?.value;
            const traitementsOD = verresGroup.get('traitementOD')?.value || [];
            prixOD = calculateLensPrice(matiereOD, indiceOD, traitementsOD);

            const matiereOG = verresGroup.get('matiereOG')?.value;
            const indiceOG = verresGroup.get('indiceOG')?.value;
            const traitementsOG = verresGroup.get('traitementOG')?.value || [];
            prixOG = calculateLensPrice(matiereOG, indiceOG, traitementsOG);
        } else {
            const matiere = verresGroup.get('matiere')?.value;
            const indice = verresGroup.get('indice')?.value;
            const traitements = verresGroup.get('traitement')?.value || [];
            prixOD = calculateLensPrice(matiere, indice, traitements);
            prixOG = prixOD;
        }

        verresGroup.patchValue({ prixOD, prixOG }, { emitEvent: false });
        this.cdr.markForCheck();
    }

    // AI Suggestions (Simplified copy)
    checkSuggestion(index: number = -1): void {
        this.activeSuggestionIndex = index;
        const odValues = this.ficheForm.get('ordonnance.od')?.value;
        const ogValues = this.ficheForm.get('ordonnance.og')?.value;

        let montureGroup = this.ficheForm.get('monture');
        if (index >= 0) {
            montureGroup = this.equipements.at(index)?.get('monture') || null;
        }

        const tailleStr = montureGroup?.get('taille')?.value || '';
        const ed = parseInt(tailleStr.split('-')[0]) || 52;
        const cerclage = montureGroup?.get('cerclage')?.value || 'cerclée';

        const frameData: FrameData = {
            ed,
            shape: 'rectangular',
            mount: 'full-rim',
            cerclage: cerclage as any
        };

        let equipmentType: string = '';
        if (index >= 0) {
            equipmentType = this.equipements.at(index)?.get('type')?.value || '';
        } else {
            equipmentType = this.ficheForm.get('monture.typeEquipement')?.value || '';
        }

        const sphOD = parseFloat(odValues.sphere) || 0;
        const sphOG = parseFloat(ogValues.sphere) || 0;
        const addOD = parseFloat(odValues.addition) || 0;
        const addOG = parseFloat(ogValues.addition) || 0;
        const cylOD = parseFloat(odValues.cylindre) || 0;
        const cylOG = parseFloat(ogValues.cylindre) || 0;

        const isNearVision = equipmentType === TypeEquipement.VISION_PRES;

        const corrOD: Correction = {
            sph: sphOD, cyl: cylOD, add: isNearVision ? addOD : undefined
        };
        const corrOG: Correction = {
            sph: sphOG, cyl: cylOG, add: isNearVision ? addOG : undefined
        };

        const recOD = getLensSuggestion(corrOD, frameData);
        const recOG = getLensSuggestion(corrOG, frameData);

        const diffSph = Math.abs(corrOD.sph - corrOG.sph);
        const diffCyl = Math.abs(corrOD.cyl - corrOG.cyl);

        this.suggestions = [];
        this.ficheForm.get('suggestions')?.setValue([]);

        if (diffSph <= 0.5 && diffCyl <= 0.75) {
            const useOD = recOD.option.index >= recOG.option.index;
            const bestRec = useOD ? recOD : recOG;
            const thicknessInfo = `~${bestRec.estimatedThickness} mm`;
            const allWarnings = [...(recOD.warnings || []), ...(recOG.warnings || [])];
            const uniqueWarnings = [...new Set(allWarnings)];

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
            this.suggestions.push({
                type: 'OD',
                matiere: this.mapMaterialToUI(recOD.option.material),
                indice: this.mapIndexToUI(recOD.option.index),
                traitements: this.mapTreatmentsToUI(recOD.selectedTreatments),
                raison: recOD.rationale,
                epaisseur: `~${recOD.estimatedThickness} mm`,
                warnings: recOD.warnings
            });
            this.suggestions.push({
                type: 'OG',
                matiere: this.mapMaterialToUI(recOG.option.material),
                indice: this.mapIndexToUI(recOG.option.index),
                traitements: this.mapTreatmentsToUI(recOG.selectedTreatments),
                raison: recOG.rationale,
                epaisseur: `~${recOG.estimatedThickness} mm`,
                warnings: recOG.warnings
            });
        }
        this.ficheForm.get('suggestions')?.setValue(this.suggestions);
        this.showSuggestions = true;
        this.cdr.markForCheck();
    }

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
            verresGroup.patchValue({
                differentODOG: false,
                matiere: suggestion.matiere,
                indice: suggestion.indice,
                traitement: suggestion.traitements || [],
                matiereOD: suggestion.matiere,
                indiceOD: suggestion.indice,
                traitementOD: suggestion.traitements || [],
                matiereOG: suggestion.matiere,
                indiceOG: suggestion.indice,
                traitementOG: suggestion.traitements || []
            });
            this.closeSuggestions();
        } else {
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
            if (result && (result.action === 'SELECT' || result.action === 'ORDER_AND_SELL') && result.product) {
                if (!this.isEditMode) {
                    this.isEditMode = true;
                    this.ficheForm.enable();
                }
                this.allProducts.push(result.product);
                const isPending = result.action === 'ORDER_AND_SELL' || result.isPendingTransfer || result.isPendingOrder || false;
                this.fillProductDetails(result.product, index, target, isPending);
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
                    reference: product.codeInterne || product.codeBarres || product.designation,
                    marque: product.marque || '',
                    couleur: product.couleur || '',
                    prixMonture: product.prixVenteTTC,
                    productId: product.id,
                    entrepotId: product.entrepotId,
                    entrepotType: product.entrepot?.type || null,
                    entrepotNom: product.entrepot?.nom || null,
                    isPendingTransfer: isPendingTransfer
                });
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
                        entrepotType: product.entrepot?.type || null
                    });
                } else if (target === 'od') {
                    verresGroup.patchValue({
                        marqueOD: product.marque || '',
                        matiereOD: product.modele || product.designation || '',
                        prixOD: product.prixVenteTTC,
                        productIdOD: product.id,
                        entrepotId: product.entrepotId,
                        entrepotType: product.entrepot?.type || null
                    });
                } else if (target === 'og') {
                    verresGroup.patchValue({
                        marqueOG: product.marque || '',
                        matiereOG: product.modele || product.designation || '',
                        prixOG: product.prixVenteTTC,
                        productIdOG: product.id,
                        entrepotId: product.entrepotId,
                        entrepotType: product.entrepot?.type || null
                    });
                }
            }
        }
        this.cdr.markForCheck();
    }

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

    closeSuggestions(): void {
        this.showSuggestions = false;
        this.activeSuggestionIndex = null;
        this.cdr.markForCheck();
    }

    get equipements(): FormArray {
        return this.ficheForm.get('equipements') as FormArray;
    }

    initForm(): FormGroup {
        const typeEquipement = 'Monture';
        const typeVerre = 'Unifocal';

        return this.fb.group({
            clientId: [this.clientId],
            type: ['PRODUIT'], // Generic type
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
            ordonnance: this.fb.group({
                od: this.fb.group({
                    sphere: [null], cylindre: [null], axe: [null], addition: [null], prisme: [null], base: [null], ep: [null]
                }),
                og: this.fb.group({
                    sphere: [null], cylindre: [null], axe: [null], addition: [null], prisme: [null], base: [null], ep: [null]
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
                remarques: [''],
                hauteurVerre: [null]
            }),
            suggestions: [[]],
            equipements: this.fb.array([]),
            dateLivraisonEstimee: [null, Validators.required]
        });
    }

    addEquipment(): void {
        const typeEquipement = 'Monture';
        const equipmentGroup = this.fb.group({
            type: [typeEquipement],
            dateAjout: [new Date()],
            monture: this.fb.group({
                reference: [''], marque: [''], couleur: [''], taille: [''], cerclage: ['cerclée'],
                prixMonture: [0], productId: [null], entrepotId: [null], entrepotType: [null], entrepotNom: [null], isPendingTransfer: [false]
            }),
            verres: this.fb.group({
                matiere: [null], marque: [null], indice: [null], traitement: [[]],
                prixOD: [0], prixOG: [0], differentODOG: [false],
                matiereOD: [null], marqueOD: [null], indiceOD: [null], traitementOD: [[]],
                matiereOG: [null], marqueOG: [null], indiceOG: [null], traitementOG: [[]],
                productId: [null], entrepotId: [null], entrepotType: [null],
                productIdOD: [null], productIdOG: [null], isPendingTransfer: [false]
            })
        });
        this.setupLensListeners(equipmentGroup);
        this.equipements.push(equipmentGroup);
        this.addedEquipmentsExpanded = this.addedEquipmentsExpanded.map(() => false);
        this.addedEquipmentsExpanded.push(true);
        this.mainEquipmentExpanded = false;
        this.cdr.markForCheck();
    }

    getEquipmentGroup(index: number): FormGroup {
        return this.equipements.at(index) as FormGroup;
    }

    toggleMainEquipment(): void { this.mainEquipmentExpanded = !this.mainEquipmentExpanded; }
    toggleAddedEquipment(index: number): void {
        if (this.addedEquipmentsExpanded[index] === undefined) this.addedEquipmentsExpanded[index] = false;
        this.addedEquipmentsExpanded[index] = !this.addedEquipmentsExpanded[index];
    }
    removeEquipment(index: number): void {
        if (confirm('Supprimer cet équipement ?')) {
            this.equipements.removeAt(index);
            this.addedEquipmentsExpanded.splice(index, 1);
            this.cdr.markForCheck();
        }
    }

    openFileUpload(): void { this.fileInput.nativeElement.click(); }
    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        Array.from(input.files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { alert(`Fichier trop volumineux: ${file.name}`); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = file.type === 'application/pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(e.target?.result as string) : e.target?.result as string;
                this.prescriptionFiles.push({
                    name: file.name, type: file.type, size: file.size, preview, file, uploadDate: new Date()
                });
                this.ficheForm.get('ordonnance.prescriptionFiles')?.setValue(this.prescriptionFiles);
                this.cdr.markForCheck();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }

    viewFile(file: PrescriptionFile): void { this.viewingFile = file; this.cdr.markForCheck(); }
    closeViewer(): void { this.viewingFile = null; this.cdr.markForCheck(); }
    deleteFile(index: number): void {
        if (confirm('Supprimer ce document ?')) {
            this.prescriptionFiles.splice(index, 1);
            this.ficheForm.get('ordonnance.prescriptionFiles')?.setValue(this.prescriptionFiles);
            this.cdr.markForCheck();
        }
    }

    async openCamera(): Promise<void> {
        try {
            this.showCameraModal = true;
            this.cdr.markForCheck();
            await new Promise(resolve => setTimeout(resolve, 100));
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
            this.cameraStream = stream;
            if (this.videoElement?.nativeElement) {
                this.videoElement.nativeElement.srcObject = stream;
                this.videoElement.nativeElement.play();
            }
            this.cdr.markForCheck();
        } catch (error) {
            console.error('Erreur caméra:', error);
            this.closeCameraModal();
        }
    }

    capturePhoto(): void {
        if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) return;
        const video = this.videoElement.nativeElement;
        const canvas = this.canvasElement.nativeElement;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        this.cdr.markForCheck();
    }

    saveCapturedPhoto(): void {
        if (!this.capturedImage) return;
        fetch(this.capturedImage).then(res => res.blob()).then(blob => {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            this.prescriptionFiles.push({
                name: file.name, type: file.type, size: file.size, preview: this.capturedImage!, file, uploadDate: new Date()
            });
            this.ficheForm.get('ordonnance.prescriptionFiles')?.setValue(this.prescriptionFiles);
            this.closeCameraModal();
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

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    }

    loadFiche(): void {
        if (!this.ficheId) return;
        this.loading = true;
        this.ficheService.getFicheById(this.ficheId).subscribe({
            next: (fiche: any) => {
                if (fiche) {
                    this.currentFiche = fiche;
                    this.patchForm(fiche);
                }
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    getVendeurName(): string {
        if (this.currentFiche?.vendeur) return `${this.currentFiche.vendeur.prenom} ${this.currentFiche.vendeur.nom}`;
        const user = this.loggedInUser;
        if (user) return user.employee ? `${user.employee.prenom} ${user.employee.nom}` : user.fullName || user.email;
        return 'Utilisateur';
    }

    private patchForm(fiche: any): void {
        this.ficheForm.patchValue({
            ordonnance: fiche.ordonnance,
            monture: fiche.monture,
            montage: fiche.montage,
            suggestions: fiche.suggestions,
            dateLivraisonEstimee: fiche.dateLivraisonEstimee
        }, { emitEvent: false });

        if (fiche.verres) {
            const verresVals = { ...fiche.verres };
            if (Object.keys(verresVals).length > 0) {
                if (verresVals.indice) verresVals.indice = String(verresVals.indice);
                if (verresVals.indiceOD) verresVals.indiceOD = String(verresVals.indiceOD);
                if (verresVals.indiceOG) verresVals.indiceOG = String(verresVals.indiceOG);
                this.ficheForm.get('verres.differentODOG')?.setValue(verresVals.differentODOG === true, { emitEvent: false });
                this.ficheForm.get('verres')?.patchValue(verresVals, { emitEvent: false });
            }
        }
        if (fiche.suggestions) this.suggestions = fiche.suggestions;
        if (fiche.ordonnance?.prescriptionFiles) this.prescriptionFiles = fiche.ordonnance.prescriptionFiles;

        if (fiche.equipements && Array.isArray(fiche.equipements)) {
            const equipementsArray = this.ficheForm.get('equipements') as FormArray;
            equipementsArray.clear();
            fiche.equipements.forEach((eq: any) => {
                // Rebuild equipment
                const eqGroup = this.fb.group({
                    type: [eq.type],
                    dateAjout: [eq.dateAjout],
                    monture: this.fb.group({
                        reference: [eq.monture?.reference || ''], marque: [eq.monture?.marque || ''], couleur: [eq.monture?.couleur || ''],
                        taille: [eq.monture?.taille || ''], cerclage: [eq.monture?.cerclage || 'cerclée'],
                        prixMonture: [eq.monture?.prixMonture || 0], productId: [eq.monture?.productId || null],
                        entrepotId: [eq.monture?.entrepotId || null], entrepotType: [eq.monture?.entrepotType || null], isPendingTransfer: [eq.monture?.isPendingTransfer || false]
                    }),
                    verres: this.fb.group({
                        matiere: [eq.verres?.matiere], marque: [eq.verres?.marque], indice: [eq.verres?.indice ? String(eq.verres.indice) : null],
                        traitement: [eq.verres?.traitement || []], prixOD: [eq.verres?.prixOD], prixOG: [eq.verres?.prixOG],
                        differentODOG: [eq.verres?.differentODOG || false],
                        matiereOD: [eq.verres?.matiereOD], marqueOD: [eq.verres?.marqueOD], indiceOD: [eq.verres?.indiceOD ? String(eq.verres.indiceOD) : null],
                        traitementOD: [eq.verres?.traitementOD || []],
                        matiereOG: [eq.verres?.matiereOG], marqueOG: [eq.verres?.marqueOG], indiceOG: [eq.verres?.indiceOG ? String(eq.verres.indiceOG) : null],
                        traitementOG: [eq.verres?.traitementOG || []],
                        productId: [eq.verres?.productId || null], entrepotId: [eq.verres?.entrepotId || null], isPendingTransfer: [eq.verres?.isPendingTransfer || false]
                    })
                });
                this.setupLensListeners(eqGroup);
                equipementsArray.push(eqGroup);
                this.addedEquipmentsExpanded.push(false);
            });
        }
        setTimeout(() => this.calculateLensPrices(), 500);
        this.cdr.markForCheck();
    }

    setActiveTab(index: number): void {
        if (!this.isTabAccessible(index)) {
            this.snackBar.open('Veuillez saisir une date de livraison valide.', 'Fermer', { duration: 3000 });
            return;
        }
        this.activeTab = index;

        if (index === 2) {
            this.updateInitialLines();
            this.loadLinkedFacture();
        }
        this.cdr.markForCheck();
    }

    updateInitialLines() {
        this.initialLines = this.getInvoiceLines();
    }

    getInvoiceLines(): any[] {
        const lignes: any[] = [];
        const formValue = this.ficheForm.getRawValue();
        const mainMonture = formValue.monture;
        const mainVerres = formValue.verres;

        if (mainMonture && mainVerres) {
            const prixMonture = parseFloat(mainMonture.prixMonture) || 0;
            if (prixMonture > 0) {
                lignes.push({
                    description: `Monture ${mainMonture.marque} ${mainMonture.reference}`.trim(),
                    qte: 1, prixUnitaireTTC: prixMonture, remise: 0, totalTTC: prixMonture,
                    productId: mainMonture.productId || null, entrepotId: mainMonture.entrepotId || null, entrepotType: mainMonture.entrepotType || null, entrepotNom: mainMonture.entrepotNom || null
                });
            }

            const differentODOG = mainVerres.differentODOG;
            const matiere = mainVerres.matiere || 'Verre';

            // Generate Nomenclature
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
                if (prixOD > 0) {
                    lignes.push({
                        description: `Verre OD ${mainVerres.matiereOD || matiere} ${mainVerres.indiceOD || mainVerres.indice || ''}`.trim(),
                        qte: 1, prixUnitaireTTC: prixOD, remise: 0, totalTTC: prixOD,
                        productId: mainVerres.productIdOD || mainVerres.productId || null, entrepotId: mainVerres.entrepotId || null
                    });
                }
                if (prixOG > 0) {
                    lignes.push({
                        description: `Verre OG ${mainVerres.matiereOG || matiere} ${mainVerres.indiceOG || mainVerres.indice || ''}`.trim(),
                        qte: 1, prixUnitaireTTC: prixOG, remise: 0, totalTTC: prixOG,
                        productId: mainVerres.productIdOG || mainVerres.productId || null, entrepotId: mainVerres.entrepotId || null
                    });
                }
            } else {
                const prixOD = parseFloat(mainVerres.prixOD) || 0;
                const prixOG = parseFloat(mainVerres.prixOG) || 0;
                if (prixOD > 0) {
                    lignes.push({
                        description: `Verre OD ${matiere} ${mainVerres.indice || ''}`.trim(),
                        qte: 1, prixUnitaireTTC: prixOD, remise: 0, totalTTC: prixOD,
                        productId: mainVerres.productId || null, entrepotId: mainVerres.entrepotId || null
                    });
                }
                if (prixOG > 0) {
                    lignes.push({
                        description: `Verre OG ${matiere} ${mainVerres.indice || ''}`.trim(),
                        qte: 1, prixUnitaireTTC: prixOG, remise: 0, totalTTC: prixOG,
                        productId: mainVerres.productId || null, entrepotId: mainVerres.entrepotId || null
                    });
                }
            }
        }

        if (formValue.equipements && Array.isArray(formValue.equipements)) {
            formValue.equipements.forEach((equip: any, index: number) => {
                const montureAdded = equip.monture;
                if (montureAdded && montureAdded.prixMonture > 0) {
                    lignes.push({
                        description: `Monture ${montureAdded.marque || ''} ${montureAdded.reference || ''} (Eq${index + 1})`.trim(),
                        qte: 1, prixUnitaireTTC: parseFloat(montureAdded.prixMonture), remise: 0, totalTTC: parseFloat(montureAdded.prixMonture),
                        productId: montureAdded.productId || null, entrepotId: montureAdded.entrepotId || null
                    });
                }
                // (Logic for added glasses can be expanded similarly if needed, currently simplified)
            });
        }
        return lignes;
    }

    generateInvoiceLines(): void {
        const lignes = this.getInvoiceLines();
        this.initialLines = lignes;
        if (this.factureComponent && this.factureComponent.form) {
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

    goBack(): void {
        if (this.clientId) {
            this.router.navigate(['/p/clients', this.clientId]);
        } else {
            this.router.navigate(['/p/clients']);
        }
    }

    saveFiche(mode: string): void {
        this.loading = true;
        const formVal = this.ficheForm.getRawValue();

        const ficheData: any = {
            ...formVal,
            clientId: this.clientId!,
            type: TypeFiche.PRODUIT,
            statut: StatutFiche.EN_COURS
        };

        const ficheOp = (this.ficheId && this.ficheId !== 'new')
            ? this.ficheService.updateFiche(this.ficheId, ficheData)
            : this.ficheService.createFicheProduit(ficheData);

        ficheOp.subscribe({
            next: (savedFiche) => {
                this.ficheId = savedFiche.id;
                this.snackBar.open('Fiche enregistrée', 'OK', { duration: 2000 });
                // If proceeding to DEVIS/FACTURE
                if (mode === 'DEVIS' || mode === 'FACTURE' || mode === 'COMMANDE') {
                    // This should typically happen via the Facture Component's save logic when in tab 2
                    // But if triggered externally (like the main Save button):
                    this.finalizeSave(savedFiche as any, mode as any);
                } else {
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            },
            error: (err) => {
                console.error(err);
                this.snackBar.open('Erreur lors de la sauvegarde de la fiche', 'OK', { duration: 3000 });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    onSubmit(): void {
        // Validation check
        if (this.ficheForm.invalid) {
            this.snackBar.open('Veuillez remplir les champs obligatoires.', 'OK', { duration: 3000 });
            return;
        }

        const dialogRef = this.dialog.open(this.saveDialogTemplate, { width: '450px' });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.saveFiche(result);
            }
        });
    }

    async finalizeSave(savedFiche: any, mode: 'DEVIS' | 'COMMANDE' | 'FACTURE') {
        // Only switch and wait if not already on the tab
        if (this.activeTab !== 2) {
            this.setActiveTab(2);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (this.factureComponent) {
            this.factureComponent.form.patchValue({
                type: mode === 'FACTURE' ? 'FACTURE' : 'DEVIS',
                statut: mode === 'FACTURE' ? 'VALIDE' : (mode === 'COMMANDE' ? 'VENTE_EN_INSTANCE' : 'BROUILLON')
            });

            try {
                // Ensure we pass the updated ficheId if it was just created
                if (savedFiche.id && this.factureComponent.ficheIdInput !== savedFiche.id) {
                    this.factureComponent.ficheIdInput = savedFiche.id;
                }

                await firstValueFrom(this.factureComponent.saveAsObservable(true));

                if (mode === 'COMMANDE' || mode === 'FACTURE') {
                    await this.checkStockAvailability(savedFiche);
                }

                this.goBack();
            } catch (err) {
                console.error('Error finalizing save:', err);
            }
        }
    }

    onInvoiceSaved(facture: any): void {
        console.log('✅ Invoice saved, updating linked invoice state:', facture);
        this.linkedFactureSubject.next(facture);
        this.cdr.markForCheck();
    }

    async checkStockAvailability(savedFiche: any): Promise<boolean> {
        // Collect all product IDs to check
        const productIdsToCheck: { id: string, label: string }[] = [];

        // 1. Main Equipment
        if (savedFiche.monture?.productId) productIdsToCheck.push({ id: savedFiche.monture.productId, label: 'Monture Principale' });
        if (savedFiche.verres?.productIdOD) productIdsToCheck.push({ id: savedFiche.verres.productIdOD, label: 'Verre OD' });
        if (savedFiche.verres?.productIdOG) productIdsToCheck.push({ id: savedFiche.verres.productIdOG, label: 'Verre OG' });

        // 2. Added Equipments
        if (savedFiche.equipements) {
            savedFiche.equipements.forEach((eq: any, idx: number) => {
                if (eq.monture?.productId) productIdsToCheck.push({ id: eq.monture.productId, label: `Monture Équipement ${idx + 1}` });
                if (eq.verres?.productIdOD) productIdsToCheck.push({ id: eq.verres.productIdOD, label: `Verre OD Équipement ${idx + 1}` });
                if (eq.verres?.productIdOG) productIdsToCheck.push({ id: eq.verres.productIdOG, label: `Verre OG Équipement ${idx + 1}` });
            });
        }

        if (productIdsToCheck.length === 0) return true;

        // Check availability via dialog (or direct service if we prefer silently)
        // Using the dialog gives a nice summary if multiple items
        // But for "Stock Check" before Command, we might want to just warn.

        // Actually, let's use the StockAvailabilityDialog which is already imported
        const dialogRef = this.dialog.open(StockAvailabilityDialogComponent, {
            width: '600px',
            data: {
                products: productIdsToCheck.map(p => ({
                    productId: p.id,
                    requiredQuantity: 1,
                    label: p.label
                })),
                centreId: this.centreId // Check against current center
            }
        });

        // The dialog returns true if user confirms proceding (even with warnings) or if all good
        // returns false if cancelled.
        const result = await firstValueFrom(dialogRef.afterClosed());
        return result === true;
    }

    // Formatting Helpers
    formatSphereValue(eye: 'od' | 'og', event: Event): void { this.formatNumericField(eye, 'sphere', event); }
    formatCylindreValue(eye: 'od' | 'og', event: Event): void { this.formatNumericField(eye, 'cylindre', event); }
    formatAdditionValue(eye: 'od' | 'og', event: Event): void { this.formatNumericField(eye, 'addition', event); }

    formatNumericField(eye: 'od' | 'og', field: string, event: any) {
        let val = event.target.value;
        if (!val) return;
        val = val.replace(',', '.');
        const num = parseFloat(val);
        if (!isNaN(num)) {
            const formatted = (num > 0 ? '+' : '') + num.toFixed(2);
            this.ficheForm.get(`ordonnance.${eye}.${field}`)?.setValue(formatted, { emitEvent: false });
            event.target.value = formatted;
        }
    }
    formatAxeValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        let val = input.value.replace(/[^0-9]/g, '');
        if (val) {
            const n = parseInt(val);
            if (!isNaN(n) && n >= 0 && n <= 180) {
                const fmt = `${n}°`;
                this.ficheForm.get(`ordonnance.${eye}.axe`)?.setValue(fmt, { emitEvent: false });
                input.value = fmt;
            }
        }
    }
    formatPrismeValue(eye: 'od' | 'og', event: Event): void {
        const input = event.target as HTMLInputElement;
        const val = input.value.replace(',', '.');
        if (!isNaN(parseFloat(val))) {
            this.ficheForm.get(`ordonnance.${eye}.prisme`)?.setValue(val, { emitEvent: false });
        }
    }
}
