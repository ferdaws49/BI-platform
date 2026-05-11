import { redirect } from 'next/navigation';

export default function FinancierIndex() {
  // Dès qu'on arrive sur /apprenant, on est envoyé vers /apprenant/dashboard
  redirect('/financier/dashboard');
}