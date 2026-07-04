import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  

  constructor(
    private readonly mailerService: MailerService
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS, // ← mot de passe d'application Google (16 chars)
      },
    });
  }

  // ─── Envoyer email de réinitialisation ────────────────────
  async sendResetPasswordEmail(
    to: string,
    prenom: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: `"Centre de Formation" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: #059669; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">
              Centre de Formation
            </h1>
          </div>
          <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin-top: 0;">
              Bonjour ${prenom},
            </h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe.
              Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                style="background: #059669; color: white; padding: 12px 32px;
                       border-radius: 8px; text-decoration: none; font-weight: bold;
                       display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Ce lien est valable pendant <strong>1 heure</strong>.<br/>
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
          </div>
        </div>
      `,
    });

    this.logger.log(`Email de réinitialisation envoyé à ${to}`);
  }

  public async sendVerifyEmailTemplate(email: string, link: string){
        try {
            await this.mailerService.sendMail({
                to: email,
                from: `<no-reply@my-nestjs-app.com`,
                subject: 'Verify your email',
                template: 'verify-email',
                context: { link }
                })
        
                } catch (error){
                    console.log(error);
                    throw new RequestTimeoutException();
                }
  }

  public async sendResetPasswordTemplate(email: string, resetPasswordLink: string){
        try {
            await this.mailerService.sendMail({
                to: email,
                from: `<no-reply@my-nestjs-app.com`,
                subject: 'Resetpassword',
                template: 'reset-password',
                context: { resetPasswordLink }
                })
        
                } catch (error){
                    console.log(error);
                    throw new RequestTimeoutException();
                }

    }

  async sendInscriptionAccepted(email: string, prenom: string, nom: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: '✅ Votre inscription a été acceptée',
      template: './inscription-accepted', // templates/inscription-accepted.hbs
      context: { prenom, nom },
    });
  }

  async sendInscriptionRejected(email: string, prenom: string, nom: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: '❌ Votre inscription a été refusée',
      template: './inscription-rejected', // templates/inscription-rejected.hbs
      context: { prenom, nom },
    });
  }
}

