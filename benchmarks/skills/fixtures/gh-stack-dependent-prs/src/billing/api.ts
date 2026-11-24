import { Router } from "express";
import type { Subscription } from "./schema";

const subscriptions: Subscription[] = [];

export const billingRoutes = Router();

billingRoutes.get("/customers/:customerId/subscriptions", (request, response) => {
  response.json(subscriptions.filter((subscription) => subscription.customerId === request.params.customerId));
});
