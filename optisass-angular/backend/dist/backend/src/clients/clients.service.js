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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
const client_interface_1 = require("../../../shared/interfaces/client.interface");
let ClientsService = class ClientsService {
    firebaseService;
    collectionName = 'clients';
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async create(createClientDto) {
        const collection = this.firebaseService.getCollection(this.collectionName);
        const docRef = collection.doc();
        const newClient = {
            id: docRef.id,
            ...createClientDto,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await docRef.set(newClient);
        return newClient;
    }
    async findAll(filterDto) {
        let query = this.firebaseService.getCollection(this.collectionName);
        if (filterDto.type) {
            query = query.where('type', '==', filterDto.type);
        }
        if (filterDto.status) {
            query = query.where('status', '==', filterDto.status);
        }
        if (filterDto.ville) {
            query = query.where('ville', '==', filterDto.ville);
        }
        const snapshot = await query.get();
        let clients = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            };
        });
        if (filterDto.search) {
            const searchLower = filterDto.search.toLowerCase();
            clients = clients.filter(client => {
                if ('nom' in client && client.nom?.toLowerCase().includes(searchLower))
                    return true;
                if ('prenom' in client && client.prenom?.toLowerCase().includes(searchLower))
                    return true;
                if ('raisonSociale' in client && client.raisonSociale?.toLowerCase().includes(searchLower))
                    return true;
                if (client.telephone?.includes(searchLower))
                    return true;
                return false;
            });
        }
        return clients;
    }
    async findOne(id) {
        const doc = await this.firebaseService.getCollection(this.collectionName).doc(id).get();
        if (!doc.exists) {
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        }
        const data = doc.data();
        if (!data) {
            throw new common_1.NotFoundException(`Client data with ID ${id} not found`);
        }
        return {
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
        };
    }
    async update(id, updateClientDto) {
        const docRef = this.firebaseService.getCollection(this.collectionName).doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        }
        const updateData = {
            ...updateClientDto,
            updatedAt: new Date(),
        };
        await docRef.update(updateData);
        return this.findOne(id);
    }
    async remove(id) {
        const docRef = this.firebaseService.getCollection(this.collectionName).doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        }
        await docRef.delete();
    }
    async getStats() {
        const snapshot = await this.firebaseService.getCollection(this.collectionName).get();
        const clients = snapshot.docs.map(doc => doc.data());
        return {
            totalClients: clients.length,
            clientsCompte: clients.filter(c => c.status === client_interface_1.ClientStatus.COMPTE).length,
            clientsPassage: clients.filter(c => c.status === client_interface_1.ClientStatus.PASSAGE).length,
            clientsAccess: 0,
            byType: {
                particulier: clients.filter(c => c.type === 'particulier').length,
                anonyme: clients.filter(c => c.type === 'anonyme').length,
                professionnel: clients.filter(c => c.type === 'professionnel').length,
            }
        };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map