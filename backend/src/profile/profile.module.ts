import { Module } from "@nestjs/common";
import { UsersModule } from "src/users/users.module";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Apprenant } from "src/apprenants/entities/apprenant.entity";
import { User } from "src/users/users.entity";
import { Performance } from "src/performances/entities/performance.entity";



@Module({
    controllers: [ProfileController],
    providers: [ProfileService, RolesGuard], 
    exports: [],
    imports: [TypeOrmModule.forFeature([Apprenant, User, Performance]),UsersModule]
    
})
export class ProfileModule {}