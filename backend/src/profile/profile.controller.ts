import { Body, Controller,
     Get,
     Param, ParseIntPipe, 
     Post, UseGuards, 
     UseInterceptors, UploadedFile, BadRequestException, Delete,
     Res,
     Put,
     Patch
     } from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import {diskStorage} from 'multer';
import type { Express, Response } from "express";
import { ProfileService } from "./profile.service";
import { CurrentUser } from "src/users/decorators/current-user.decorator";

import { UpdateProfileDto } from "./dtos/update-profile.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("profile")
export class ProfileController{
    constructor(
        private readonly profileService: ProfileService
    ){}
    @Get('me')

public async getFullProfile(@CurrentUser() payload: any) {
    return this.profileService.getProfile(payload.userId); // Vous devrez créer cette méthode dans le service
}
    //wa9t el user yheb ybadel profile image:
    //POST: ~/profile/upload-image
    @Post('upload-image')
    @UseInterceptors(FileInterceptor('user-image',{
        storage: diskStorage({
            destination: './images/users',
            filename: (req, file, cb) =>{
                const prefix =  `${Date.now()}-${Math.round(Math.random()*1000000)}`;
                const filename = `${prefix}-${file.originalname}`;
                cb(null, filename);
            }
        }),
        fileFilter: (req, file, cb) => {
            if(file.mimetype.startsWith("image")) {
                cb(null, true);
            }else{
                cb(new BadRequestException("Unsepported file format"), false)
            }
        },
        limits: { fileSize: 1024 * 1024}// 1 megabyte
    }))
    public uploadProfileImage(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() payload : any){
            if(!file) throw new BadRequestException("no image provided");
            return this.profileService.setProfileImage(payload.userId, file.filename)
        }
        // ynajem el user juste yheb yfassakh el profile image akahaw:
        //DELETE: ~/profile/remove-profile-image
        @Delete("images/remove-profile-image")
        public removeProfileImage(@CurrentUser() payload: any){
            return this.profileService.removeProfileImage(payload.userId);
        }
        
        //GET: ~/profile/images/:image
        @Get("images/:image")
        public showProfileImage(@Param('image') image: string, @Res() res: Response){
            return res.sendFile(image, {root : 'images/users'})
        }

        //PUT: ~/profile/
        @Put()
        public updateProfile(@CurrentUser() payload : any, @Body() body: UpdateProfileDto) {
             console.log("Données reçues :", body)
            return this.profileService.update(payload.userId, body)

        }

        //DELETE: /profile/:id
        @Delete(":id")
        
        public deleteProfile(@Param("id", ParseIntPipe) id: number, @CurrentUser() payload:any) {
            return this.profileService.delete(id, payload);

        }


}

