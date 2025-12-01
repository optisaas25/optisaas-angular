import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ClientService } from '../services/client.service';
import {
  TypeClient,
  TitreClient,
  TypeCouverture,
  StatutClient,
  Client,
  ClientCreate
} from '../models/client.model';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css'
})
export class ClientFormComponent implements OnInit {
  clientForm!: FormGroup;
  isEditMode = signal(false);
  clientId = signal<string | null>(null);
  loading = signal(false);

  // Enums pour les templates
  TypeClient = TypeClient;
  TitreClient = TitreClient;
  TypeCouverture = TypeCouverture;
  StatutClient = StatutClient;

  // Listes pour les selects
  titres = Object.values(TitreClient);
  typesCouverture = Object.values(TypeCouverture);
  statuts = Object.values(StatutClient);

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initForm();

    // Vérifier si on est en mode édition
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.clientId.set(id);
      this.loadClient(id);
    }

    // Écouter les changements de type de client
    this.clientForm.get('typeClient')?.valueChanges.subscribe(type => {
      this.onTypeClientChange(type);
    });

    // Écouter les changements de convention
    this.clientForm.get('conventionActif')?.valueChanges.subscribe(actif => {
      this.toggleConventionFields(actif);
    });

    // Écouter les changements de couverture sociale
    this.clientForm.get('couvertureSocialeActif')?.valueChanges.subscribe(actif => {
      this.toggleCouvertureSocialeFields(actif);
    });
  }

  private initForm(): void {
    this.clientForm = this.fb.group({
      // Type de client (obligatoire)
      typeClient: [TypeClient.PARTICULIER, Validators.required],

      // Champs communs
      telephone: [''],
      ville: [''],
      adresse: [''],
      statut: [StatutClient.ACTIF, Validators.required],

      // Champs Client Particulier
      titre: [TitreClient.MR],
      nom: [''],
      prenom: [''],
      cin: [''],
      cinParent: [''],
      dateNaissance: [null],
      email: ['', Validators.email],

      // Convention
      conventionActif: [false],
      conventionNom: [''],
      conventionContactNom: [''],
      conventionContactPrenom: [''],
      conventionContactTelephone: [''],
      conventionRemise: [0],

      // Couverture sociale
      couvertureSocialeActif: [false],
      couvertureSocialeType: [null],
      couvertureSocialeNumero: [''],

      // Dossier médical
      dossierMedicalAntecedents: [''],
      dossierMedicalRemarques: [''],

      // Champs Client Professionnel
      raisonSociale: [''],
      identifiantFiscal: [''],
      ice: [''],
      numeroSociete: [''],
      typePartenariat: [''],
      facturationGroupee: [false],
      contacts: this.fb.array([])
    });

    // Initialiser avec les validateurs pour le type par défaut
    this.onTypeClientChange(TypeClient.PARTICULIER);
  }

  private onTypeClientChange(type: TypeClient): void {
    // Réinitialiser tous les validateurs
    this.clearAllValidators();

    switch (type) {
      case TypeClient.PARTICULIER:
        this.setParticulierValidators();
        break;
      case TypeClient.ANONYME:
        this.setAnonymeValidators();
        break;
      case TypeClient.PROFESSIONNEL:
        this.setProfessionnelValidators();
        break;
    }

    // Mettre à jour la validation
    Object.keys(this.clientForm.controls).forEach(key => {
      this.clientForm.get(key)?.updateValueAndValidity();
    });
  }

  private clearAllValidators(): void {
    const fields = ['titre', 'nom', 'prenom', 'cin', 'dateNaissance', 'telephone', 'ville', 'email',
      'raisonSociale', 'identifiantFiscal', 'ice'];
    fields.forEach(field => {
      this.clientForm.get(field)?.clearValidators();
    });
  }

  private setParticulierValidators(): void {
    this.clientForm.get('titre')?.setValidators([Validators.required]);
    this.clientForm.get('nom')?.setValidators([Validators.required]);
    this.clientForm.get('prenom')?.setValidators([Validators.required]);
    this.clientForm.get('cin')?.setValidators([Validators.required, Validators.minLength(5)]);
    this.clientForm.get('dateNaissance')?.setValidators([Validators.required]);
    this.clientForm.get('telephone')?.setValidators([Validators.required]);
    this.clientForm.get('ville')?.setValidators([Validators.required]);
  }

  private setAnonymeValidators(): void {
    // Aucun champ obligatoire pour anonyme
  }

  private setProfessionnelValidators(): void {
    this.clientForm.get('raisonSociale')?.setValidators([Validators.required]);
    this.clientForm.get('identifiantFiscal')?.setValidators([Validators.required]);
    this.clientForm.get('ice')?.setValidators([Validators.required]);
    this.clientForm.get('telephone')?.setValidators([Validators.required]);
    this.clientForm.get('email')?.setValidators([Validators.required, Validators.email]);
    this.clientForm.get('ville')?.setValidators([Validators.required]);
  }

  private toggleConventionFields(actif: boolean): void {
    const fields = ['conventionNom', 'conventionContactNom', 'conventionContactPrenom',
      'conventionContactTelephone', 'conventionRemise'];

    fields.forEach(field => {
      const control = this.clientForm.get(field);
      if (actif) {
        control?.setValidators([Validators.required]);
      } else {
        control?.clearValidators();
      }
      control?.updateValueAndValidity();
    });
  }

  private toggleCouvertureSocialeFields(actif: boolean): void {
    const control = this.clientForm.get('couvertureSocialeType');
    if (actif) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
    }
    control?.updateValueAndValidity();
  }

  get contacts(): FormArray {
    return this.clientForm.get('contacts') as FormArray;
  }

  addContact(): void {
    const contactGroup = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      fonction: ['', Validators.required],
      telephone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
    this.contacts.push(contactGroup);
  }

  removeContact(index: number): void {
    this.contacts.removeAt(index);
  }

  private loadClient(id: string): void {
    this.loading.set(true);
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        if (client) {
          this.populateForm(client);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du client:', error);
        this.loading.set(false);
      }
    });
  }

  private populateForm(client: Client): void {
    // TODO: Implémenter le remplissage du formulaire
    // selon le type de client
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const clientData = this.buildClientData();

    if (this.isEditMode() && this.clientId()) {
      this.updateClient(this.clientId()!, clientData);
    } else {
      this.createClient(clientData);
    }
  }

  private buildClientData(): any {
    const formValue = this.clientForm.value;
    const typeClient = formValue.typeClient;

    const baseData = {
      typeClient,
      telephone: formValue.telephone || undefined,
      ville: formValue.ville || undefined,
      adresse: formValue.adresse || undefined,
      statut: formValue.statut
    };

    if (typeClient === TypeClient.PARTICULIER) {
      return {
        ...baseData,
        typeClient: TypeClient.PARTICULIER,
        titre: formValue.titre,
        nom: formValue.nom,
        prenom: formValue.prenom,
        cin: formValue.cin,
        cinParent: formValue.cinParent || undefined,
        dateNaissance: formValue.dateNaissance,
        telephone: formValue.telephone,
        email: formValue.email || undefined,
        ville: formValue.ville,
        convention: formValue.conventionActif ? {
          actif: true,
          nomConvention: formValue.conventionNom,
          contactNom: formValue.conventionContactNom,
          contactPrenom: formValue.conventionContactPrenom,
          contactTelephone: formValue.conventionContactTelephone,
          remiseOfferte: formValue.conventionRemise
        } : undefined,
        couvertureSociale: formValue.couvertureSocialeActif ? {
          actif: true,
          type: formValue.couvertureSocialeType,
          numeroAdhesion: formValue.couvertureSocialeNumero
        } : undefined,
        dossierMedical: {
          antecedents: formValue.dossierMedicalAntecedents,
          remarques: formValue.dossierMedicalRemarques
        }
      };
    } else if (typeClient === TypeClient.PROFESSIONNEL) {
      return {
        ...baseData,
        typeClient: TypeClient.PROFESSIONNEL,
        raisonSociale: formValue.raisonSociale,
        identifiantFiscal: formValue.identifiantFiscal,
        ice: formValue.ice,
        numeroSociete: formValue.numeroSociete || undefined,
        telephone: formValue.telephone,
        email: formValue.email,
        ville: formValue.ville,
        typePartenariat: formValue.typePartenariat || undefined,
        facturationGroupee: formValue.facturationGroupee,
        contacts: formValue.contacts || []
      };
    } else {
      // Anonyme
      return {
        ...baseData,
        typeClient: TypeClient.ANONYME
      };
    }
  }

  private createClient(clientData: any): void {
    this.clientService.createClient(clientData).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/p/clients']);
      },
      error: (error) => {
        console.error('Erreur lors de la création du client:', error);
        this.loading.set(false);
        alert(error.message || 'Erreur lors de la création du client');
      }
    });
  }

  private updateClient(id: string, clientData: any): void {
    this.clientService.updateClient(id, clientData as Partial<Client>).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/p/clients']);
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du client:', error);
        this.loading.set(false);
        alert(error.message || 'Erreur lors de la mise à jour du client');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/p/clients']);
  }
}
