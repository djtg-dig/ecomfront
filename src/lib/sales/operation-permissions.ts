export type CommercialOperation = "DIRECT_SALE" | "INVOICE";
export type CommercialAction = "view" | "create" | "update" | "lineView" | "lineCreate" | "lineUpdate" | "issue" | "cancel" | "paymentCreate";

const permissions: Record<CommercialOperation, Record<CommercialAction, string>> = {
  DIRECT_SALE: {
    view: "SALE_VIEW",
    create: "SALE_CREATE",
    update: "SALE_UPDATE",
    lineView: "SALE_LINE_VIEW",
    lineCreate: "SALE_LINE_CREATE",
    lineUpdate: "SALE_UPDATE",
    issue: "SALE_COMPLETE",
    cancel: "SALE_CANCEL",
    paymentCreate: "SALE_COMPLETE",
  },
  INVOICE: {
    view: "INVOICE_VIEW",
    create: "INVOICE_CREATE",
    update: "INVOICE_UPDATE",
    lineView: "INVOICE_VIEW",
    lineCreate: "INVOICE_UPDATE",
    lineUpdate: "INVOICE_UPDATE",
    issue: "INVOICE_ISSUE",
    cancel: "INVOICE_CANCEL",
    paymentCreate: "INVOICE_PAYMENT_CREATE",
  },
};

export function operationPermission(operation: CommercialOperation, action: CommercialAction): string {
  return permissions[operation][action];
}
