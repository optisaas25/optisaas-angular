import { ClientType, ClientStatus } from '../../../shared/interfaces/client.interface';
export declare class ClientFilterDto {
    type?: ClientType;
    status?: ClientStatus;
    search?: string;
    ville?: string;
}
