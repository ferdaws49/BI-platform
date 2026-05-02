export const translations = {
  fr: {
    dashboard: {
      title: "Tableau de bord",
      welcome: "Bonjour Directeur !",
      subtitle: "votre Espace de gestion et analyse",
    },
    settings: {
      title: "Paramètres",
      subtitle: "Gérez vos préférences et votre profil",
      tabs: {
        profile: "Profil",
        security: "Sécurité",
        notifications: "Notifications",
        preferences: "Préférences",
      },
      profile: {
        title: "Informations Personnelles",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Email",
        phone: "Téléphone",
        save: "Enregistrer les modifications",
        saving: "Enregistrement...",
        success: "Profil mis à jour avec succès",
        error: "Erreur lors de la mise à jour",
      },
      security: {
        title: "Gestion de la Sécurité",
        current: "Mot de passe actuel",
        new: "Nouveau mot de passe",
        confirm: "Confirmer le mot de passe",
        save: "Modifier le mot de passe",
        saving: "Modification...",
        success: "Mot de passe modifié avec succès",
        mismatch: "Les mots de passe ne correspondent pas",
        error: "Mot de passe actuel incorrect",
      },
      notifications: {
        title: "Préférences de Notifications",
        save: "Enregistrer",
        saved: "Sauvegardé !",
        items: [
          {
            key: "emailAlerts",
            label: "Alertes par email",
            desc: "Recevez des alertes importantes par email",
          },
          {
            key: "weeklyReport",
            label: "Rapport hebdomadaire",
            desc: "Rapports de performance chaque lundi",
          },
          {
            key: "systemUpdates",
            label: "Mises à jour système",
            desc: "Notifications sur les mises à jour du système",
          },
          {
            key: "performanceNotifs",
            label: "Notifications de performance",
            desc: "Alertes sur les anomalies de performance détectées",
          },
        ],
      },
      preferences: {
        title: "Préférences de l'Application",
        dataRefresh: "Actualisation des données",
        refresh1: "Chaque minute",
        refresh5: "Chaque 5 minutes",
        refresh15: "Chaque 15 minutes",
        refresh30: "Chaque 30 minutes",
        save: "Enregistrer les préférences",
        saved: "Sauvegardé !",
      },
    },
  },
};