# 🔐 GUIDE SÉCURITÉ - OptiSaas ERP

**Dernière mise à jour**: 2026-07-05
**Statut**: Ce document remplace les versions précédentes (v3.0 "8/10" et l'audit "4.8/10"), qui affirmaient des correctifs non présents dans le code au moment de leur rédaction. Tout ce qui suit a été vérifié directement dans le code et/ou testé en conditions réelles (curl, base de données, navigateur) le jour de cette mise à jour.

---

## ✅ CORRIGÉ ET VÉRIFIÉ

| # | Sujet | État | Preuve |
|---|---|---|---|
| 1 | Isolation multi-tenant | Le `centreId` (header `Tenant`) est validé contre les `UserCentreRole` réels de l'utilisateur via `AuthGuard` (`src/common/guards/auth.guard.ts`) avant d'atteindre un contrôleur. Auparavant, ce header était utilisé sans vérification. | Testé : accès refusé (403) sur un centre non autorisé |
| 2 | Authentification globale | `AuthGuard` global (`APP_GUARD`) - toute route est protégée par défaut sauf `@Public()` (login, refresh) | Testé en direct |
| 3 | Secrets par défaut | Tous les fallbacks codés en dur supprimés (JWT_SECRET, MINIO_*, mot de passe utilisateur) - l'app refuse de démarrer si absents | Vérifié par grep exhaustif, 0 occurrence restante |
| 4 | RBAC par rôle | `RolesGuard` + `@Roles()` sur 7 contrôleurs (utilisateurs, paie, exports comptables, centres, groupes, entrepôts, paramètres entreprise) | Testé : 403 pour un rôle insuffisant |
| 5 | MFA (TOTP) | Setup/vérification/désactivation + connexion à deux étapes, écran "Sécurité (2FA)" | **Testé de bout en bout dans un vrai navigateur** (voir note ci-dessous) |
| 6 | ValidationPipe | `whitelist: true` - les champs non déclarés sur un DTO sont supprimés silencieusement (anti mass-assignment) | - |
| 7 | Rate limiting | Middleware actif : 100 req/min général, 10 req/10s sur `/login` | Testé : HTTP 429 après 10 tentatives |
| 8 | Headers HTTP (Helmet) | CSP, HSTS, X-Frame-Options, noSniff actifs | Vérifié dans `main.ts` |
| 9 | TLS sortant (SMTP) | `rejectUnauthorized` conditionné à `NODE_ENV=production` au lieu de toujours `false` | - |
| 10 | SQL brut | 9 usages de `$queryRawUnsafe`/`$executeRawUnsafe` audités un par un - tous paramétrés correctement sauf `LIMIT`/`OFFSET` dans `treasury.service.ts`, corrigé | Testé : endpoints treasury fonctionnels après correctif |
| 11 | Audit logging | Persisté en base (`AuditLog`), purge automatique nocturne configurable (`AUDIT_LOG_RETENTION_DAYS`, 180j par défaut) | Testé : entrée créée en base après une requête réelle |
| 12 | Chiffrement des sauvegardes | Scripts d'export/import DB chiffrent en AES-256 (`DB_BACKUP_PASSPHRASE` requis) | Testé : chiffrement + déchiffrement + rejet d'un mauvais mot de passe |
| 13 | Fuite de données historique (git) | Deux dépôts GitHub publics avaient des `.env` réels et des dumps SQL/JSON dans leur historique. `achouika-net/optisass-angular` : rendu privé + historique réécrit. `optisaas25/optisaas-angular` : historique réécrit (reste public - décision utilisateur) | Vérifié via l'API GitHub après force-push |

**Note sur le MFA** : la première implémentation avait un bug critique - cette application tourne sans zone.js (`window.Zone` est `undefined`), donc les propriétés de classe mutables classiques ne déclenchaient jamais de rafraîchissement visuel. Le clic sur "Activer le 2FA" ne faisait rien à l'écran bien que l'appel serveur réussisse. Corrigé en passant sur des Signals Angular. Un audit du reste du code frontend modifié cette session n'a trouvé aucune autre occurrence de ce problème.

---

## ⚠️ DÉCISIONS QUI VOUS REVIENNENT (pas des correctifs techniques)

Ces points ne sont pas des oublis - ce sont des arbitrages produit, légal ou budgétaire que je ne peux pas trancher à votre place :

1. **Chiffrement au repos champ par champ** (RIB bancaire, prescriptions médicales) - nécessite un arbitrage légal/conformité, casse la recherche SQL native sur ces champs s'il est mal fait. Le chiffrement des disques/sauvegardes (item 12 ci-dessus) couvre déjà une partie du risque.
2. **Automatisation de la rotation des secrets** - une vraie rotation de `JWT_SECRET` invalide toutes les sessions actives ; nécessite soit une fenêtre de maintenance planifiée, soit un mécanisme de double-secret (ancien+nouveau acceptés temporairement) à concevoir si l'usage le justifie.
3. **Module de télétransmission assurance/tiers-payant** - absent du code (confirmé par recherche exhaustive). C'est l'écart fonctionnel le plus significatif face aux leaders du marché (RxOffice, Eyefinity) qui ont cette intégration. Développement de plusieurs semaines si retenu.
4. **Certification tierce (SOC2, pentest)** - démarche payante avec un prestataire externe, pas quelque chose qu'une revue de code peut produire.
5. **Politique de rétention des données clients/PII** au-delà des logs d'audit (déjà couverts, item 11).

---

## 🏗️ ARCHITECTURE DE SÉCURITÉ ACTUELLE

```
Requête HTTP
    ↓
LoggerMiddleware → RateLimitMiddleware → AuditMiddleware
    ↓
AuthGuard (JWT + validation tenant contre UserCentreRole réel)
    ↓
RolesGuard (@Roles() si présent sur la route)
    ↓
ValidationPipe (whitelist: true)
    ↓
Contrôleur → Service → Prisma (requêtes paramétrées)
```

## 🔧 CONFIGURATION REQUISE EN PRODUCTION

Voir `backend/.env.production.example` - toutes les variables y sont documentées avec leur rationale (y compris `sslmode` pour une base de données distante et la fréquence de rotation recommandée des secrets).
