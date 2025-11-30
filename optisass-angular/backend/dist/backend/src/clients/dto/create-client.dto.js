"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateClientDto = exports.ConventionDto = exports.InternalContactDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_interface_1 = require("../../../../shared/interfaces/client.interface");
class InternalContactDto {
    nom;
    prenom;
    role;
    telephone;
    email;
}
exports.InternalContactDto = InternalContactDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InternalContactDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InternalContactDto.prototype, "prenom", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InternalContactDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InternalContactDto.prototype, "telephone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], InternalContactDto.prototype, "email", void 0);
class ConventionDto {
    hasConvention;
    typePartenariat;
    tauxRemise;
    details;
}
exports.ConventionDto = ConventionDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConventionDto.prototype, "hasConvention", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConventionDto.prototype, "typePartenariat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ConventionDto.prototype, "tauxRemise", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConventionDto.prototype, "details", void 0);
class CreateClientDto {
    type;
    status = client_interface_1.ClientStatus.ACTIF;
    title;
    nom;
    prenom;
    dateNaissance;
    telephone;
    email;
    emailParticulier;
    partenaireNom;
    partenairePrenom;
    partenaireTelephone;
    ville;
    adresse;
    codePostal;
    cin;
    hasCouverture;
    couvertureType;
    couvertureDetails;
    antecedents;
    remarques;
    parrainId;
    raisonSociale;
    identifiantFiscal;
    ice;
    numeroSociete;
    convention;
    contactsInternes;
    facturationGroupee;
}
exports.CreateClientDto = CreateClientDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_interface_1.ClientType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_interface_1.ClientStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsEnum)(client_interface_1.Title),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "prenom", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Date)
], CreateClientDto.prototype, "dateNaissance", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type !== client_interface_1.ClientType.ANONYME),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "telephone", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PROFESSIONNEL),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "emailParticulier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "partenaireNom", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "partenairePrenom", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "partenaireTelephone", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type !== client_interface_1.ClientType.ANONYME),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "ville", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "adresse", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "codePostal", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "cin", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateClientDto.prototype, "hasCouverture", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PARTICULIER && o.hasCouverture),
    (0, class_validator_1.IsEnum)(client_interface_1.CoverageType),
    __metadata("design:type", String)
], CreateClientDto.prototype, "couvertureType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "couvertureDetails", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "antecedents", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "remarques", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "parrainId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PROFESSIONNEL),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "raisonSociale", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PROFESSIONNEL),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "identifiantFiscal", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "ice", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "numeroSociete", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PROFESSIONNEL),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ConventionDto),
    __metadata("design:type", ConventionDto)
], CreateClientDto.prototype, "convention", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.type === client_interface_1.ClientType.PROFESSIONNEL),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InternalContactDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateClientDto.prototype, "contactsInternes", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateClientDto.prototype, "facturationGroupee", void 0);
//# sourceMappingURL=create-client.dto.js.map