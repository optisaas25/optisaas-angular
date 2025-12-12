import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FacturesService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.FactureUncheckedCreateInput) {
        // Generate sequential number
        const type = data.type; // FACTURE, DEVIS, AVOIR, BL
        const year = new Date().getFullYear();
        const prefix = this.getPrefix(type);

        // Find last document of this type for current year
        const lastDoc = await this.prisma.facture.findFirst({
            where: {
                type: type,
                numero: {
                    startsWith: `${prefix}-${year}`
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        let sequence = 1;
        if (lastDoc) {
            const parts = lastDoc.numero.split('-');
            if (parts.length === 3) {
                sequence = parseInt(parts[2]) + 1;
            }
        }

        const numero = `${prefix}-${year}-${sequence.toString().padStart(3, '0')}`;

        // Auto-calculate amounts if not provided (safety)
        // Assuming backend receives calculated values, but good to verify?
        // User asked for "reverse calculation" in frontend, so backend just stores what it gets for now.

        const facture = await this.prisma.facture.create({
            data: {
                ...data,
                numero,
                statut: data.statut || 'BROUILLON'
            }
        });

        return facture;
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        cursor?: Prisma.FactureWhereUniqueInput;
        where?: Prisma.FactureWhereInput;
        orderBy?: Prisma.FactureOrderByWithRelationInput;
    }) {
        const { skip, take, cursor, where, orderBy } = params;
        return this.prisma.facture.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
            include: {
                client: true,
                fiche: true
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.facture.findUnique({
            where: { id },
            include: {
                client: true,
                fiche: true
            }
        });
    }

    async update(params: {
        where: Prisma.FactureWhereUniqueInput;
        data: Prisma.FactureUpdateInput;
    }) {
        const { where, data } = params;
        return this.prisma.facture.update({
            data,
            where,
        });
    }

    async remove(where: Prisma.FactureWhereUniqueInput) {
        return this.prisma.facture.delete({
            where,
        });
    }

    private getPrefix(type: string): string {
        switch (type) {
            case 'FACTURE': return 'FAC';
            case 'DEVIS': return 'DEV';
            case 'AVOIR': return 'AVR';
            case 'BL': return 'BL';
            default: return 'DOC';
        }
    }
}
