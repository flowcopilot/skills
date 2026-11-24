import { Router } from "express";
import { type Invoice, isPaid } from "../models/invoice";

const invoices: Invoice[] = [];

export const invoiceRoutes = Router();

invoiceRoutes.get("/invoices/unpaid", (_request, response) => {
  response.json(invoices.filter((invoice) => !isPaid(invoice)));
});
