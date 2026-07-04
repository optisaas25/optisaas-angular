import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import compression = require('compression'); // Triggering re-compilation for Docker synchronization
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes to match frontend config
  app.setGlobalPrefix('api');

  // Security: Use Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'", 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // Set the limit for incoming JSON and URL-encoded data to support large imports
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable Gzip compression to significantly reduce network payload size
  app.use(compression());

  const isProduction = process.env.NODE_ENV === 'production';

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties not declared on the DTO - prevents mass-assignment /
      // property-injection (e.g. a client sneaking `role: 'admin'` into a body).
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.error('❌ Validation Errors:', JSON.stringify(errors, null, 2));
        if (isProduction) {
          // Don't leak DTO field names/constraints to the client in production.
          return new BadRequestException('Invalid input data');
        }
        return new BadRequestException(errors);
      },
    }),
  );

  // Strict CORS: Only allow specific origins, configurable via env instead of hardcoded IPs/domains
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:4200',
    ...envOrigins,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    maxAge: 3600,
  });

  const port = process.env.PORT ?? 3000;

  // LOG STARTUP TO FILE TO BE 100% SURE
  const fs = require('fs');
  const logFile = 'server.log';
  const LOG_MAX_SIZE = 10 * 1024 * 1024; // 10MB - rotate instead of growing forever

  function appendLog(message: string) {
    try {
      if (fs.existsSync(logFile) && fs.statSync(logFile).size > LOG_MAX_SIZE) {
        fs.renameSync(logFile, `${logFile}.1`);
      }
      fs.appendFileSync(logFile, message);
    } catch (e) {
      // Never let logging crash the app
    }
  }

  appendLog(
    `\n--- SERVER STARTUP: ${new Date().toISOString()} --- VERSION 3.0 (SECURITY HARDENED) ---\n`,
  );

  // Redirect console to file
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.log = (...args) => {
    appendLog(`[LOG] ${new Date().toISOString()}: ${args.join(' ')}\n`);
    originalConsoleLog.apply(console, args);
  };

  console.error = (...args) => {
    appendLog(`[ERROR] ${new Date().toISOString()}: ${args.join(' ')}\n`);
    originalConsoleError.apply(console, args);
  };

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🚀 OptiSaas ERP - Version 3.0 (Security Hardened)  ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║   Port: ${port}${' '.repeat(50 - `Port: ${port}`.length)}║`);
  console.log(
    `║   Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(43 - `Environment: ${process.env.NODE_ENV || 'development'}`.length)}║`,
  );
  console.log('║   Security: Helmet + JWT + Rate Limit + Audit Log     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  await app.listen(port, '0.0.0.0');
}
bootstrap();

// Trigger restart
