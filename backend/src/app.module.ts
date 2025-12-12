import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './features/clients/clients.module';
import { FichesModule } from './features/fiches/fiches.module';
import { FacturesModule } from './features/factures/factures.module';

@Module({
  imports: [PrismaModule, ClientsModule, FichesModule, FacturesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
