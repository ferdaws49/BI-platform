import {IsNotEmpty,  IsNumber,  IsString, Min, MinLength } from "class-validator";

export class ResetPasswordDto {

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    newPassword: string; 

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    userId: number;

    @IsString()
    @MinLength(10)
    @IsNotEmpty()
    resetPasswordToken: string;

   
}