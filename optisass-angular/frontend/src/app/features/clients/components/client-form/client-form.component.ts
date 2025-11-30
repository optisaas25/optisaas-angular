import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { ClientsService } from '../../services/clients.service';
import { ClientType, ClientStatus, Title, CoverageType, ClientProfessionnel } from '../../../../shared/interfaces/client.interface';

@Component({
    selector: 'app-client-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatCheckboxModule,
        MatStepperModule
    ],
    templateUrl: './client-form.component.html',
    styleUrls: ['./client-form.component.scss']
})
export class ClientFormComponent implements OnInit {
    clientForm: FormGroup;
    isEditMode = false;
    clientId: string | null = null;

    clientTypes = Object.values(ClientType);
    titles = Object.values(Title);
    coverageTypes = Object.values(CoverageType);

    constructor(
        private fb: FormBuilder,
        private clientsService: ClientsService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.clientForm = this.fb.group({
            type: [ClientType.PARTICULIER, Validators.required],
            status: [ClientStatus.ACTIF],

            // Particulier
            title: [''],
            nom: [''],
            prenom: [''],
            dateNaissance: [''],
            telephone: [''],
            email: [''], // Shared with Pro
            partenaireNom: [''],
            partenairePrenom: [''],
            partenaireTelephone: [''],
            adresse: [''], // Shared with Pro
            ville: [''], // Shared with Pro
            codePostal: [''], // Shared with Pro
            cin: [''],
            hasCouverture: [false],
            couvertureType: [''],
            couvertureDetails: [''],
            antecedents: [''],
            remarques: [''],
            parrainId: [''],

            // Professionnel
            raisonSociale: [''],
            identifiantFiscal: [''],
            ice: [''],
            numeroSociete: [''],
            facturationGroupee: [false],

            // Convention (Pro)
            convention: this.fb.group({
                hasConvention: [false],
                typePartenariat: [''],
                tauxRemise: [0],
                details: ['']
            }),

            // Contacts Internes (Pro)
            contactsInternes: this.fb.array([])
        });
    }

    ngOnInit() {
        this.clientId = this.route.snapshot.paramMap.get('id');
        if (this.clientId) {
            this.isEditMode = true;
            this.loadClient(this.clientId);
        }

        // Dynamic validation based on type
        this.clientForm.get('type')?.valueChanges.subscribe(type => {
            this.updateValidators(type);
        });

        // Trigger initial validation setup
        this.updateValidators(this.clientForm.get('type')?.value);
    }

    get contactsInternes() {
        return this.clientForm.get('contactsInternes') as FormArray;
    }

    addContactInterne() {
        const contactGroup = this.fb.group({
            nom: ['', Validators.required],
            prenom: ['', Validators.required],
            role: ['', Validators.required],
            telephone: [''],
            email: ['']
        });
        this.contactsInternes.push(contactGroup);
    }

    removeContactInterne(index: number) {
        this.contactsInternes.removeAt(index);
    }

    updateValidators(type: ClientType) {
        // Reset validators first
        Object.keys(this.clientForm.controls).forEach(key => {
            const control = this.clientForm.get(key);
            if (key !== 'type' && key !== 'status' && key !== 'contactsInternes' && key !== 'convention') {
                control?.clearValidators();
                control?.updateValueAndValidity();
            }
        });

        if (type === ClientType.PARTICULIER) {
            this.clientForm.get('nom')?.setValidators(Validators.required);
            this.clientForm.get('nom')?.updateValueAndValidity();

            this.clientForm.get('prenom')?.setValidators(Validators.required);
            this.clientForm.get('prenom')?.updateValueAndValidity();

            this.clientForm.get('telephone')?.setValidators(Validators.required);
            this.clientForm.get('telephone')?.updateValueAndValidity();

            this.clientForm.get('ville')?.setValidators(Validators.required);
            this.clientForm.get('ville')?.updateValueAndValidity();

            this.clientForm.get('cin')?.setValidators(Validators.required);
            this.clientForm.get('cin')?.updateValueAndValidity();
        } else if (type === ClientType.PROFESSIONNEL) {
            this.clientForm.get('raisonSociale')?.setValidators(Validators.required);
            this.clientForm.get('raisonSociale')?.updateValueAndValidity();

            this.clientForm.get('identifiantFiscal')?.setValidators(Validators.required);
            this.clientForm.get('identifiantFiscal')?.updateValueAndValidity();

            this.clientForm.get('adresse')?.setValidators(Validators.required);
            this.clientForm.get('adresse')?.updateValueAndValidity();

            this.clientForm.get('ville')?.setValidators(Validators.required);
            this.clientForm.get('ville')?.updateValueAndValidity();

            this.clientForm.get('telephone')?.setValidators(Validators.required);
            this.clientForm.get('telephone')?.updateValueAndValidity();

            this.clientForm.get('email')?.setValidators([Validators.required, Validators.email]);
            this.clientForm.get('email')?.updateValueAndValidity();
        } else if (type === ClientType.ANONYME) {
            // No required fields
        }

        console.log('Validators updated for type:', type);
        console.log('Form valid after update:', this.clientForm.valid);
    }

    loadClient(id: string) {
        this.clientsService.findOne(id).subscribe(client => {
            this.clientForm.patchValue(client);
            if (client.type === ClientType.PROFESSIONNEL && (client as ClientProfessionnel).contactsInternes) {
                (client as ClientProfessionnel).contactsInternes?.forEach(contact => {
                    this.addContactInterne();
                    const index = this.contactsInternes.length - 1;
                    this.contactsInternes.at(index).patchValue(contact);
                });
            }
        });
    }

    onSubmit() {
        console.log('Form submitted');
        console.log('Form valid:', this.clientForm.valid);
        console.log('Form value:', this.clientForm.value);
        console.log('Form errors:', this.getFormValidationErrors());

        if (this.clientForm.valid) {
            const clientData = this.clientForm.value;

            if (this.isEditMode && this.clientId) {
                console.log('Updating client:', this.clientId);
                this.clientsService.update(this.clientId, clientData).subscribe(() => {
                    console.log('Client updated, navigating to /clients');
                    this.router.navigate(['/clients']);
                });
            } else {
                console.log('Creating new client');
                this.clientsService.create(clientData).subscribe((newClient) => {
                    console.log('Client created:', newClient);
                    this.router.navigate(['/clients']);
                });
            }
        } else {
            console.error('Form is invalid. Please check required fields.');
            // Mark all fields as touched to show validation errors
            Object.keys(this.clientForm.controls).forEach(key => {
                this.clientForm.get(key)?.markAsTouched();
            });
        }
    }

    getFormValidationErrors() {
        const errors: any = {};
        Object.keys(this.clientForm.controls).forEach(key => {
            const control = this.clientForm.get(key);
            if (control && control.errors) {
                errors[key] = control.errors;
            }
        });
        return errors;
    }
}
