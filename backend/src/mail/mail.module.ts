import { Module } from '@nestjs/common';
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { MailService } from './mail.service';
import{ join } from "node:path";
import{EjsAdapter} from "@nestjs-modules/mailer/adapters/ejs.adapter";

@Module({
  imports:[
        MailerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                return{
                    transport: {
                        host: config.get<string>("SMTP_HOST"),
                        port: config.get<number>("SMTP_PORT"),
                        secure: false, //dans la production on met true(//https)
                        auth:{
                            user: config.get<string>("SMTP_USERNAME"),
                            pass: config.get<string>("SMTP_PASSWORD"),
                    }
                    },
                    template: {
                        dir: join(process.cwd(), 'src/mail/templates'),
                        adapter:new EjsAdapter({
                            inlineCssEnabled: true
                        })

                    }
                }
            }
        })
    ],

  providers: [MailService],
  exports: [MailService], // ← exporté pour être utilisé dans UsersModule
})
export class MailModule {}
