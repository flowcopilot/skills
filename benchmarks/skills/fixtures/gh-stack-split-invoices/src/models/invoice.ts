export type Invoice = {
  id: string;
  customerId: string;
  amountCents: number;
  paidAt: string | null;
};

export function isPaid(invoice: Invoice): boolean {
  return invoice.paidAt !== null;
}
