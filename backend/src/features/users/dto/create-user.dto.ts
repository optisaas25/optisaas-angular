import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserCentreRoleDto {
  @IsString()
  @IsNotEmpty()
  centreId: string;

  @IsString()
  @IsNotEmpty()
  centreName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @IsOptional()
  entrepotIds?: string[];

  @IsArray()
  @IsOptional()
  entrepotNames?: string[];
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  @IsNotEmpty()
  prenom: string;

  @IsString()
  @IsNotEmpty()
  civilite: string;

  @IsString()
  @IsOptional()
  telephone?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  employeeId?: string; // New Linkage field

  @IsString()
  @IsOptional()
  matricule?: string;

  @IsString()
  @IsOptional()
  statut?: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.',
  })
  password?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateUserCentreRoleDto)
  centreRoles?: CreateUserCentreRoleDto[];
}
