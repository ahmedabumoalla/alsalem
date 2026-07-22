export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PressureCostRow = {
  id: string;
  pressure: number;
  standard_block_cost: number;
  standard_length_cm: number;
  standard_width_cm: number;
  standard_height_cm: number;
  created_at: string;
  updated_at: string;
}

export type CustomerRow = {
  id: string;
  name: string;
  normalized_name: string;
  phone: string | null;
  normalized_phone: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  customer_phone_snapshot: string | null;
  seller_name_snapshot: string;
  invoice_date: string;
  delivery_date: string | null;
  delivery_fee: number;
  subtotal: number;
  total_cost: number;
  invoice_total: number;
  net_profit: number;
  profit_margin: number;
  schema_version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  density_pressure: number;
  quantity: number;
  unit_sale_price: number;
  unit_cost: number;
  cost_source: "auto" | "manual";
  product_subtotal: number;
  total_cost: number;
  net_profit: number;
  weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export type ReceiptRow = {
  id: string;
  receipt_number: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  date: string;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "other";
  reference_number: string | null;
  notes: string | null;
  source: "manual" | "legacy_invoice_payment" | "invoice_initial_payment";
  source_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  source: "call" | "whatsapp" | "visit" | "referral" | "ad" | "exhibition" | "website" | "other";
  custom_source: string | null;
  notes: string | null;
  status: "new" | "contacted" | "interested" | "converted" | "not_interested";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  source: string;
  created_at: string;
}

export type AppMetaRow = {
  key: string;
  value: Json;
  created_at: string;
  updated_at: string;
}

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      pressure_costs: TableDefinition<PressureCostRow>;
      customers: TableDefinition<CustomerRow>;
      invoices: TableDefinition<InvoiceRow>;
      invoice_items: TableDefinition<InvoiceItemRow>;
      customer_receipts: TableDefinition<ReceiptRow>;
      leads: TableDefinition<LeadRow>;
      audit_logs: TableDefinition<AuditLogRow>;
      app_meta: TableDefinition<AppMetaRow>;
    };
    Views: Record<never, never>;
    Functions: {
      create_invoice_with_items: { Args: { p_invoice: Json; p_items: Json }; Returns: Json };
      create_invoice_with_initial_payment: {
        Args: { p_invoice: Json; p_items: Json; p_initial_payment: Json };
        Returns: Json;
      };
      update_invoice_with_items: { Args: { p_id: string; p_invoice: Json; p_items: Json }; Returns: Json };
      soft_delete_invoice: { Args: { p_id: string }; Returns: Json };
      restore_invoice: { Args: { p_id: string }; Returns: Json };
      create_customer_receipt: { Args: { p_receipt: Json }; Returns: Json };
      update_customer_receipt: { Args: { p_id: string; p_receipt: Json }; Returns: Json };
      soft_delete_customer_receipt: { Args: { p_id: string }; Returns: Json };
      restore_customer_receipt: { Args: { p_id: string }; Returns: Json };
    };
    Enums: {
      lead_status: LeadRow["status"];
      payment_method: ReceiptRow["payment_method"];
      receipt_source: ReceiptRow["source"];
      cost_source: InvoiceItemRow["cost_source"];
    };
    CompositeTypes: Record<never, never>;
  };
}
