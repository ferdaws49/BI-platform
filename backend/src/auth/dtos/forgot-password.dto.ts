import { IsEmail, IsNotEmpty, MaxLength } from "class-validator";

export class ForgotPasswordDto {
    
    @IsEmail() /** decorators faire une validation de email*/
    @MaxLength(250)
    @IsNotEmpty()
    email : string; 

   
}