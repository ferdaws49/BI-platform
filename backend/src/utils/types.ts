import { UserRole } from "src/users/users.entity";

export type JWTPayloadType = {
    id: number;
    role: string;
    userId:number;
    

}

export type AccessTokenType = {
    accessToken: string;
    user: {
        id: number;
        email: string;
        role: UserRole;
        nom: string;
        prenom: string;
    };
} 