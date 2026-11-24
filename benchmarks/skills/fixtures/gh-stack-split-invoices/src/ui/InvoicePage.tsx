import { useEffect, useState } from "react";
import type { Invoice } from "../models/invoice";

export function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetch("/invoices/unpaid")
      .then((response) => response.json())
      .then(setInvoices);
  }, []);

  return (
    <ul>
      {invoices.map((invoice) => (
        <li key={invoice.id}>{invoice.amountCents / 100}</li>
      ))}
    </ul>
  );
}
