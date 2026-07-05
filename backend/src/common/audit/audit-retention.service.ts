import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audit logs accumulate real business/PII data (client names, amounts, IPs)
 * on every state-changing request - keeping them forever is its own data
 * retention liability. Default to 180 days, configurable via env.
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger('AUDIT_RETENTION');

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldAuditLogs() {
    const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 180;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      const { count } = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(`Purged ${count} audit log entries older than ${retentionDays} days`);
      }
    } catch (error) {
      this.logger.error('Failed to purge old audit logs:', error);
    }
  }
}
