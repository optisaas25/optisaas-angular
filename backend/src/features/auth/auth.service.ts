import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { requireEnv } from '../../common/config/require-env';
import { mapRoleToRoleId } from '../../common/auth/role.util';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.jwtSecret = requireEnv(this.configService, 'JWT_SECRET');
    this.refreshSecret = requireEnv(this.configService, 'REFRESH_SECRET');
  }

  async login(email: string, pass: string, mfaToken?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { centreRoles: true, employee: true },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.mfaEnabled) {
      if (!mfaToken) {
        return { mfaRequired: true };
      }
      const result = await verifyOtp({ secret: user.mfaSecret!, token: mfaToken });
      if (!result.valid) {
        throw new UnauthorizedException('Code de vérification invalide');
      }
    }

    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      user: this.mapToCurrentUser(user),
    };
  }

  /** Generates a new TOTP secret and QR code for the user to scan; MFA stays disabled until verifyAndEnableMfa succeeds. */
  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    const otpauth = generateURI({ issuer: 'OptiSaaS', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    return { secret, qrCodeDataUrl };
  }

  async verifyAndEnableMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) {
      throw new BadRequestException(
        "La configuration MFA n'a pas été initialisée",
      );
    }
    const result = await verifyOtp({ secret: user.mfaSecret, token });
    if (!result.valid) {
      throw new UnauthorizedException('Code de vérification invalide');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    return { success: true };
  }

  async disableMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException(
        "L'authentification à deux facteurs n'est pas activée",
      );
    }
    const result = await verifyOtp({ secret: user.mfaSecret, token });
    if (!result.valid) {
      throw new UnauthorizedException('Code de vérification invalide');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { success: true };
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1d' });
    const refresh_token = jwt.sign(payload, this.refreshSecret, {
      expiresIn: '7d',
    });

    return { token, refresh_token };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { centreRoles: true, employee: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.mapToCurrentUser(user);
  }

  private mapToCurrentUser(user: any) {
    // Map backend User and UserCentreRole to frontend ICurrentUser
    return {
      id: user.id,
      first_name: user.prenom,
      last_name: user.nom,
      email: user.email,
      mobile: user.telephone || '',
      address: '', // Mocked if not in schema
      is_callcenter: false,
      remember_token: '',
      menu_favoris: '',
      mfaEnabled: user.mfaEnabled,
      centers: user.centreRoles.map((cr: any) => ({
        id: cr.centreId,
        name: cr.centreName,
        role: cr.role,
        role_id: mapRoleToRoleId(cr.role),
        active: true,
        migrated: false,
        entrepotIds: cr.entrepotIds,
        entrepotNames: cr.entrepotNames,
      })),
      employee: user.employee,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException();

      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }
}
