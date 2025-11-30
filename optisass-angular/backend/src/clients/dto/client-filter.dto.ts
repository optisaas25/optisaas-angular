import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ClientType, ClientStatus } from '../../../../shared/interfaces/client.interface';

export class ClientFilterDto {
    @IsEnum(ClientType)
    @IsOptional()
    type?: ClientType;

    @IsEnum(ClientStatus)
    @IsOptional()
    status?: ClientStatus;

    @IsString()
    @IsOptional()
    search?: string;

    @IsString()
    @IsOptional()
    ville?: string;
}
