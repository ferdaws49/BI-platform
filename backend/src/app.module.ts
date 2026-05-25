import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { User } from './users/users.entity';

// Modules métiers
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ApprenantModule } from './apprenants/apprenants.module';
import { FormationModule } from './formations/formations.module';
import { FormateurModule } from './formateurs/formateurs.module';
import { FinancesModule } from './finances/finances.module';
import { QualityModule } from './quality/Quality.module';
import { ExportModule } from './export/export.module';
import { PerformanceModule } from './performances/performances.module';
import { SessionsModule } from './sessions/sessions.module';
import { SettingsModule } from './settings/settings.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { SessionApprenantModule } from './session-apprenant/session-apprenant.module';
import { SchedulesModule } from './schedule/schedule.module';
import { JwtModule } from '@nestjs/jwt';
import { ProfileModule } from './profile/profile.module';
import { RecommendationModule } from './ai/recommendations/recommendation.module';
import { ImportModule } from './import/import.module';
import { ResponsableApprenantsModule } from './apprenants/Responsable.apprenants.module';
import { FinanceAlertModule } from './alerts/financier/finance-alert.module';
import { FinancePredictModule } from './ai/financier/ai-prediction.module';
import { DwModule } from './dw/dw.module';
import { SatisfactionModule } from './satisfaction/satisfaction.module';
import { AlertsModule as ResponsableAlertsModule } from './ai/alerts/alerts.module';
import { AlertsModule as DirecteurAlertsModule } from './alerts/alerts.module';
import { ForecastModule } from './ai/forecast/forecast.module';
import { ScheduleModule } from '@nestjs/schedule';


// Importe ton Guard de JWT (ajuste le chemin selon ton projet)
// import { AtGuard } from './auth/guards/at.guard'; 
/*import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';*/
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // 1. Configuration des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    JwtModule.register({
  global: true,
  secret: process.env.SECRET_KEY,
  signOptions: { expiresIn: '1d' },
}),
    // 2. Configuration de la base de données
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // Utile en développement (PFE), à désactiver en prod
      ssl: { rejectUnauthorized: false },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      extra: {
        keepAlive: true,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 15000,
        max: 5,
      },
    }),

    // 3. Tes modules
    AuthModule,
    UsersModule,
    DashboardModule,
    ApprenantModule,
    FormationModule,
    FormateurModule,
    FinancesModule,
    PerformanceModule,
    QualityModule, // directeur quality endpoints
    ExportModule,
    ImportModule,
    SessionsModule,
    SettingsModule,
    InscriptionsModule,
    SessionApprenantModule,
    SchedulesModule,
    ProfileModule,
    RecommendationModule,
    ResponsableApprenantsModule,
    FinanceAlertModule,
    FinancePredictModule,
    DwModule,
    SatisfactionModule,
    ResponsableAlertsModule,
    DirecteurAlertsModule,
    ForecastModule,
  ] /* providers: [
    /* 4. Activer cette partie pour protéger TOUTES tes routes par défaut.
       Il faudra utiliser le décorateur @Public() pour les routes comme 'Login' 
    */,

  /* { provide: APP_GUARD, useClass: JwtAuthGuard },   // always runs first
       // then checks roles
  
    
  ],*/
  
})
export class AppModule {}
