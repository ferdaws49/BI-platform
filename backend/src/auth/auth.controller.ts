import { Controller, Post,
   Body, Get, ParseIntPipe,
    Param, UseGuards,
     HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JWTPayloadType } from "../utils/types";
import { UsersService } from 'src/users/users.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from "./dtos/reset-password.dto";

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  //Get: ~/api/users/current-user
  @Get("current-user")
  @UseGuards(AuthGuard)// awel mayji e request bech yodkhol UseGuard   
  public getCurrentUser(@CurrentUser() payload: JWTPayloadType){
    return this.usersService.getCurrentUser(payload.id);
    //fi getCurrentUser yestha9 el id ,
    //  donc ena lezem n9oul lel user kenek theb taamel request lezemzk ta3tini token bech ena,
    //  naamellou décodage w nkharej el id w mba3ed flellekher na3tih lel getCurrentUser
     // bech naamelou decodage bech nemchi lel user.service . chouf auth.guard
        
    }

     //@POST: ~/api/users/forgot-password
    @Post("forgot-password")
    @HttpCode(HttpStatus.OK)
    public forgotPassword(@Body() Body: ForgotPasswordDto){
        return this.authService.sendResetPasswordLink(Body.email);
    }
    //GET: ~/api/users/reset-password/:id/:resetPasswordToken
    @Get("reset-password/:id/:resetPasswordToken")
    public getResetPassword(
        @Param("id", ParseIntPipe) id: number,
        @Param("resetPasswordToken") resetPasswordToken: string
    ){
        return this.authService.getResetPasswordLink(id, resetPasswordToken);
    }

    //Post: ~/api/users/reset-password
    @Post("reset-password")
    public resetPassword(@Body() body: ResetPasswordDto){
        return this.authService.resetPassword(body);

    }

}


