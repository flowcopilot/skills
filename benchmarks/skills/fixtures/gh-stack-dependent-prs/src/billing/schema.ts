export type Plan = {
  id: string;
  name: string;
  priceCents: number;
};

export type Subscription = {
  id: string;
  customerId: string;
  planId: string;
  renewsAt: string;
};
