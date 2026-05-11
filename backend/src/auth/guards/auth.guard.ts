import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CURRENT_USER_KEY } from "src/utils/constants";
import { JWTPayloadType } from "src/utils/types";



@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ){}


    async canActivate(context: ExecutionContext) {
        // resultat mte3ou boolean el classe hedhi ken naamle false, bech yaamel throwexception, w ken true bech ykalli request todkhol
        // andou 3 cas:
        const request = context.switchToHttp().getRequest(); //awel haja tsir nekhdh el request mn code
        const [type, token]=request.headers.authorization?.split(" ")?? []; // mba3ed nejbed token w type 
        if(token && type === "Bearer"){// lenna net2aked ken 3tani token w nthabet mn type
            try {
                const payload: JWTPayloadType = await this.jwtService.verifyAsync(// methode hedhi tnahi tashfir mtaa token a l'aide de token et secret code
                token,
                {
                    secret: this.configService.get<string>("SECRET_KEY")
                }
            );
            //mba3ed nhot el payload fi request object essmou user , chouf constants.ts
            request.user = payload;
            request[CURRENT_USER_KEY] = payload;
                
            } catch (error) { /// wa9teh el catch yekhdem? saat ynajem ykoun token ghayer saleh/ modet salahytou wfet, donc verifyAsync tamel throw exception, wa9tha el catch yekhdem
                throw new UnauthorizedException("access denied, invalid token");
                
            }
            

        }else {
            throw new UnauthorizedException("access denied, invalid token");
        }
        return true;
    }
}
