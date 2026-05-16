import { IsEmail, IsNotEmpty, IsString, Length, MaxLength, MinLength, IsOptional, IsInt } from "class-validator";


export class RegisterDto {
    
    @IsEmail() /** decorators faire une validation de email*/
    @MaxLength(250)
    @IsNotEmpty()
    email : string;
    
    
    @MinLength(6) 
    @IsString()
    @IsNotEmpty() 
    password: string; 

    
    


    @IsString()
    @Length(2, 150)
    nom: string;


    @IsString()
    @Length(2, 150)
    prenom: string;



    @IsString()
    @IsNotEmpty()
    programme: string;


    @IsOptional()
    @IsString()
    telephone?: string;



    
}

