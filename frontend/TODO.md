# TODO - Planning UI (supprimer session)

- [x] Identifier le vrai handler de suppression dans le planning (`app/respedagogique/planning/page.tsx`).
- [ ] Remplacer `window.confirm` par une **box/modal** UI (petit composant) avec boutons Annuler/Supprimer.
- [ ] Ajouter un état `deletingSessionId` ou `pendingDelete` pour désactiver le bouton pendant la requête.
- [ ] Après succès: mise à jour du state (`sessions.filter`) + toast success + (optionnel) refresh `fetchAll()`.
- [ ] Vérifier aussi le flux quand on supprime depuis la vue `CalendarView`.
