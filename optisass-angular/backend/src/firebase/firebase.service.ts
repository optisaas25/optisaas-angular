import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private db: admin.firestore.Firestore;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        // Initialize Firebase Admin SDK
        // In production, use environment variables or a service account file
        // For local development, if no credentials provided, it might try to use default credentials
        // or we can mock it for now if needed.

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                // databaseURL: this.configService.get<string>('FIREBASE_DATABASE_URL'),
            });
        }

        this.db = admin.firestore();
    }

    getFirestore() {
        return this.db;
    }

    getCollection(collectionName: string) {
        return this.db.collection(collectionName);
    }
}
