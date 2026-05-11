import { redirect } from 'next/navigation';

export default function ApprenantIndex() {
  // Dès qu'on arrive sur /apprenant, on est envoyé vers /apprenant/dashboard
  redirect('/apprenant/dashboard');
}