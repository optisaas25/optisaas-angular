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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientFilterDto = void 0;
const class_validator_1 = require("class-validator");
const client_interface_1 = require("../../../shared/interfaces/client.interface");
class ClientFilterDto {
    type;
    status;
    search;
    ville;
}
exports.ClientFilterDto = ClientFilterDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_interface_1.ClientType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", typeof (_a = typeof client_interface_1.ClientType !== "undefined" && client_interface_1.ClientType) === "function" ? _a : Object)
], ClientFilterDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_interface_1.ClientStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", typeof (_b = typeof client_interface_1.ClientStatus !== "undefined" && client_interface_1.ClientStatus) === "function" ? _b : Object)
], ClientFilterDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ClientFilterDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ClientFilterDto.prototype, "ville", void 0);
//# sourceMappingURL=client-filter.dto.js.map