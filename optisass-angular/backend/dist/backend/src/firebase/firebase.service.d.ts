import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
export declare class FirebaseService implements OnModuleInit {
    private configService;
    private db;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    getFirestore(): admin.firestore.Firestore;
    getCollection(collectionName: string): admin.firestore.CollectionReference<admin.firestore.DocumentData, admin.firestore.DocumentData>;
}
