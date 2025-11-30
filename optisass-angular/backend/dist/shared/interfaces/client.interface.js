"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderType = exports.VisitType = exports.CoverageType = exports.Title = exports.ClientStatus = exports.ClientType = void 0;
var ClientType;
(function (ClientType) {
    ClientType["PARTICULIER"] = "particulier";
    ClientType["ANONYME"] = "anonyme";
    ClientType["PROFESSIONNEL"] = "professionnel";
})(ClientType || (exports.ClientType = ClientType = {}));
var ClientStatus;
(function (ClientStatus) {
    ClientStatus["ACTIF"] = "actif";
    ClientStatus["INACTIF"] = "inactif";
    ClientStatus["COMPTE"] = "compte";
    ClientStatus["PASSAGE"] = "passage";
})(ClientStatus || (exports.ClientStatus = ClientStatus = {}));
var Title;
(function (Title) {
    Title["MR"] = "Mr";
    Title["MME"] = "Mme";
    Title["MLLE"] = "Mlle";
    Title["ENF"] = "Enf";
})(Title || (exports.Title = Title = {}));
var CoverageType;
(function (CoverageType) {
    CoverageType["MUTUELLE"] = "mutuelle";
    CoverageType["CNSS"] = "cnss";
    CoverageType["RAMED"] = "ramed";
    CoverageType["AUTRE"] = "autre";
})(CoverageType || (exports.CoverageType = CoverageType = {}));
var VisitType;
(function (VisitType) {
    VisitType["CONSULTATION"] = "consultation";
    VisitType["VENTE"] = "vente";
    VisitType["CONTROLE"] = "controle";
    VisitType["REPARATION"] = "reparation";
    VisitType["AUTRE"] = "autre";
})(VisitType || (exports.VisitType = VisitType = {}));
var ReminderType;
(function (ReminderType) {
    ReminderType["CONTROLE_ANNUEL"] = "controle_annuel";
    ReminderType["RENOUVELLEMENT_LENTILLES"] = "renouvellement_lentilles";
    ReminderType["SUIVI_COMMANDE"] = "suivi_commande";
    ReminderType["AUTRE"] = "autre";
})(ReminderType || (exports.ReminderType = ReminderType = {}));
//# sourceMappingURL=client.interface.js.map