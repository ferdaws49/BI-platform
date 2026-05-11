import { SelectQueryBuilder } from 'typeorm';
import { PaiementStatus } from './enums';

/** Filtre SQL sur le statut de paiement d’une inscription (alias TypeORM). */
export function applyInscriptionPaymentStatusFilter(
  qb: SelectQueryBuilder<any>,
  inscriptionAlias: string,
  paymentStatus?: PaiementStatus,
): void {
  if (!paymentStatus) return;

  if (paymentStatus === PaiementStatus.UNPAID) {
    qb.andWhere(
      `(${inscriptionAlias}.paiementStatus = :ps OR ${inscriptionAlias}.paiementStatus IS NULL)`,
      { ps: PaiementStatus.UNPAID },
    );
    return;
  }

  qb.andWhere(`${inscriptionAlias}.paiementStatus = :ps`, {
    ps: paymentStatus,
  });
}
