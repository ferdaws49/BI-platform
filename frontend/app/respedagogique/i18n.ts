export const translations = {
  fr: {
    dashboard: {
      title: "Tableau de bord",
      welcome: "Responsable Pédagogique",
      subtitle: "Tableau de bord et suivi pédagogique",
    },
    settings: {
      title: "Paramètres",
      subtitle: "Gérez votre profil responsable pédagogique et vos préférences",
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
            key: "sessionAlerts",
            label: "Alertes de session",
            desc: "Recevoir des alertes pour les sessions de formation",
          },
          {
            key: "learnerRiskAlerts",
            label: "Risque d'abandon",
            desc: "Alertes sur les apprenants à risque d'abandon",
          },
          {
            key: "trainerUpdates",
            label: "Mises à jour formateurs",
            desc: "Notifications concernant les formateurs",
          },
          {
            key: "feedbackAlerts",
            label: "Alertes de feedback",
            desc: "Nouveaux retours et évaluations",
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