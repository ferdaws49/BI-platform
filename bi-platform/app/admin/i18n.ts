export const translations = {
  fr: {
    dashboard: {
      title: "Tableau de bord",
      welcome: "Administrateur",
      subtitle: "Gestion et administration de la plateforme",
    },
    pages: {
      dashboard: {
        title: "Bonjour Admin !",
        subtitle: "Monitoring système & santé de la plateforme",
      },
      users: {
        title: "Gestion des utilisateurs",
        subtitle: "Créez, modifiez et gérez les accès RBAC",
      },
      learners: {
        title: "Gestion des apprenants",
        subtitle: "Inscriptions, validation et suivi des apprenants",
      },
      resources: {
        title: "Ressources",
        subtitle: "Formations et formateurs du centre",
      },
      import: {
        title: "Import de données",
        subtitle: "Importation de fichiers CSV / Excel vers PostgreSQL",
      },
      settings: {
        title: "Paramètres",
        subtitle: "Configuration générale de la plateforme",
      },
    },
    settings: {
      title: "Paramètres",
      subtitle: "Gérez votre profil administrateur et les préférences de la plateforme",
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
        title: "Préférences de Notification",
        save: "Enregistrer",
        saved: "Sauvegardé !",
        items: [
          {
            key: "learnerRequests",
            label: "Demandes d'apprenants",
            desc: "Recevoir des alertes pour les nouvelles inscriptions",
          },
          {
            key: "accountChanges",
            label: "Modifications de comptes",
            desc: "Alertes sur les changements de mots de passe ou droits",
          },
          {
            key: "imports",
            label: "Importations de données",
            desc: "Notifications concernant les imports Excel/CSV",
          },
          {
            key: "systemAlerts",
            label: "Alertes système",
            desc: "Pannes, maintenance et mises à jour",
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