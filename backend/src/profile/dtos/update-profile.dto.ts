import {  IsString, Length, MinLength, IsOptional } from "class-validator";

export class UpdateProfileDto {
    
    @IsOptional()
    @MinLength(6) 
    @IsString()
    password?: string; 

    @IsOptional()
    @IsString()
    @Length(2, 150)
    nom?: string;

    @IsOptional()
    @IsString()
    @Length(2, 150)
    prenom?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}