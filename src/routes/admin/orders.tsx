import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Loader2,
  X,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  ErrorState,
  LoadingState,
} from "@/components/StateBlocks";

import { StatusBadge } from "@/components/StatusBadge";

import {
  adminOrdersQuery,
  adminPaymentsQuery,
} from "@/lib/admin-data";

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  dateTime,
  money,
} from "@/lib/format";

import {
  reviewPayment,
  updateOrderStatus,
  reserveDigitalInventoryForOrder,
  sendDigitalDeliveryEmail,
} from "@/lib/admin.functions";

import { getProofUrl } from "@/lib/downloads.functions";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      {
        title: "Orders & Payments — DIGITAL HUB GH Admin",
      },
      {
        name: "description",
        content:
          "Verify Mobile Money payments and move orders through fulfilment.",
      },
      {
        property: "og:title",
        content: "Orders & Payments — DIGITAL HUB GH Admin",
      },
      {
        property: "og:description",
        content:
          "Verify Mobile Money payments and move orders through fulfilment.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: Page,
});

function Page() {
  const qc = useQueryClient();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const [deliveryOrder, setDeliveryOrder] =
    useState<any | null>(null);

  const [selectedInventoryId, setSelectedInventoryId] =
    useState("");

  const [showAllInventory, setShowAllInventory] =
    useState(false);


  const [deliveryBusy, setDeliveryBusy] =
    useState(false);

  const [showDeliveryPassword, setShowDeliveryPassword] =
    useState(false);
const [deliveryEmailBusy, setDeliveryEmailBusy] =
  useState(false);
  // --------------------------------------------------
  // QUERIES
  // --------------------------------------------------

  const orders = useQuery(adminOrdersQuery());
  const payments = useQuery(adminPaymentsQuery());

  // Keep the admin orders/payments view synchronized with new customer activity.
  // The database already publishes these tables to Supabase Realtime.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void qc.invalidateQueries({ queryKey: ["admin-orders"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          void qc.invalidateQueries({ queryKey: ["admin-payments"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  // --------------------------------------------------
  // SERVER FUNCTIONS
  // --------------------------------------------------

  const runReview = useServerFn(reviewPayment);

  const runStatus = useServerFn(updateOrderStatus);

  const runProof = useServerFn(getProofUrl);

  const reserveDigitalInventory = useServerFn(
    reserveDigitalInventoryForOrder,
  );

  // --------------------------------------------------
  // AVAILABLE DIGITAL INVENTORY
  // --------------------------------------------------

  const inventory = useQuery({
    queryKey: ["digital-inventory-available"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_inventory" as any)
        .select("*")
        .eq("status", "available")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as any[];
    },
  });

  // Only offer inventory that matches the products in this order,
  // matched by catalog product id first and product name as a fallback.
  const matchingInventory = useMemo(() => {
    const all = (inventory.data ?? []) as any[];

    if (!deliveryOrder) return all;

    const items = (deliveryOrder.order_items ?? []) as any[];
    const ids = new Set(
      items.map((i) => i.product_id).filter(Boolean),
    );
    const names = new Set(
      items
        .map((i) => String(i.product_name ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    return all.filter(
      (item) =>
        (item.product_id && ids.has(item.product_id)) ||
        names.has(String(item.product_name ?? "").trim().toLowerCase()),
    );
  }, [inventory.data, deliveryOrder]);

  const visibleInventory = showAllInventory
    ? ((inventory.data ?? []) as any[])
    : matchingInventory;

  // --------------------------------------------------
  // RESERVED DELIVERY
  // --------------------------------------------------


  const reservedDelivery = useQuery({
    queryKey: [
      "digital-delivery",
      deliveryOrder?.id,
    ],

    enabled: !!deliveryOrder?.id,

    queryFn: async () => {
      if (!deliveryOrder?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from("digital_deliveries" as any)
        .select(`
          id,
          order_id,
          inventory_id,
          customer_email,
          product_name,
          delivery_status,
          sent_at,
          created_at,
          digital_inventory (
            id,
            product_name,
            product_type,
            account_email,
            account_username,
            account_password,
            recovery_info,
            notes,
            status
          )
        `)
        .eq("order_id", deliveryOrder.id)
        .eq("delivery_status", "pending")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as any;
    },
  });

  // --------------------------------------------------
  // RESERVE DIGITAL PRODUCT
  // --------------------------------------------------

  const reserveInventory = async () => {
    if (!deliveryOrder) {
      toast.error("No order selected.");
      return;
    }

    if (!selectedInventoryId) {
      toast.error("Select an inventory item first.");
      return;
    }

    setDeliveryBusy(true);

    try {
      await reserveDigitalInventory({
        data: {
          inventoryId: selectedInventoryId,
          orderId: deliveryOrder.id,
        },
      });

      toast.success(
        "Digital product reserved successfully.",
      );

      // Keep the modal open so the admin can review
      // the reserved account before sending it.
      setSelectedInventoryId("");
      setShowDeliveryPassword(false);

      await Promise.all([
        qc.invalidateQueries({
          queryKey: [
            "digital-inventory-available",
          ],
        }),

        qc.invalidateQueries({
          queryKey: ["admin-orders"],
        }),

        qc.invalidateQueries({
          queryKey: [
            "digital-delivery",
            deliveryOrder.id,
          ],
        }),
      ]);

      // Explicit refetch in case the reservation query
      // needs to update immediately.
      await qc.refetchQueries({
        queryKey: [
          "digital-delivery",
          deliveryOrder.id,
        ],
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to reserve digital product.",
      );
    } finally {
      setDeliveryBusy(false);
    }
  };
const sendDeliveryEmail = async () => {
  if (!reservedDelivery.data?.id) {
    toast.error("No reserved delivery found.");
    return;
  }

  setDeliveryEmailBusy(true);

  try {
    await sendDigitalDeliveryEmail({
      data: {
        deliveryId: reservedDelivery.data.id,
      },
    });

    toast.success("Delivery email sent successfully.");

    await reservedDelivery.refetch();
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["digital-inventory-admin"] }),
      qc.invalidateQueries({ queryKey: ["admin-orders"] }),
      qc.invalidateQueries({ queryKey: ["admin-stats"] }),
    ]);
  } catch (error) {
    console.error("Failed to send delivery email:", error);

    toast.error(
      error instanceof Error
        ? error.message
        : "Could not send the delivery email.",
    );
  } finally {
    setDeliveryEmailBusy(false);
  }
};
  
  // --------------------------------------------------
  // CLOSE DELIVERY MODAL
  // --------------------------------------------------

  const closeDeliveryModal = () => {
    setDeliveryOrder(null);
    setSelectedInventoryId("");
    setShowDeliveryPassword(false);
  };

  // --------------------------------------------------
  // REFRESH ADMIN DATA
  // --------------------------------------------------

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({
        queryKey: ["admin-orders"],
      }),

      qc.invalidateQueries({
        queryKey: ["admin-payments"],
      }),

      qc.invalidateQueries({
        queryKey: ["admin-stats"],
      }),
    ]);
  };

  // --------------------------------------------------
  // REVIEW PAYMENT
  // --------------------------------------------------

  const review = async (
    paymentId: string,
    action: "approve" | "reject",
  ) => {
    setBusy(paymentId);

    try {
      await runReview({
        data: {
          paymentId,
          action,
          note:
            notes[paymentId]?.trim() || null,
        },
      });

      toast.success(
        action === "approve"
          ? "Payment verified — downloads unlocked"
          : "Payment rejected",
      );

      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to review payment.",
      );
    } finally {
      setBusy(null);
    }
  };

  // --------------------------------------------------
  // UPDATE ORDER STATUS
  // --------------------------------------------------

  const setStatus = async (
    orderId: string,
    status: string,
  ) => {
    setBusy(orderId);

    try {
      await runStatus({
        data: {
          orderId,
          status:
            status as (typeof ORDER_STATUSES)[number],
          note: null,
        },
      });

      toast.success("Order updated");

      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update order.",
      );
    } finally {
      setBusy(null);
    }
  };

  // --------------------------------------------------
  // OPEN PAYMENT PROOF
  // --------------------------------------------------

  const openProof = async (
    paymentId: string,
  ) => {
    try {
      const res = await runProof({
        data: {
          paymentId,
        },
      });

      if (res.url) {
        window.open(
          res.url,
          "_blank",
          "noopener,noreferrer",
        );
      } else {
        toast.info(
          "No screenshot attached.",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to open screenshot.",
      );
    }
  };

  // --------------------------------------------------
  // PAYMENT DATA
  // --------------------------------------------------

  const pending = (
    payments.data ?? []
  ).filter((p) =>
    ["submitted", "pending"].includes(
      p.status,
    ),
  );

  const paymentByOrder = new Map(
    (payments.data ?? []).map(
      (p) => [p.order_id, p] as const,
    ),
  );

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const term = search
    .trim()
    .toLowerCase();

  const orderRows = (
    orders.data ?? []
  ).filter((o) => {
    const orderNumber =
      o.order_number?.toLowerCase() ?? "";

    const customerName =
      o.customer_name?.toLowerCase() ?? "";

    const customerPhone =
      o.customer_phone?.toLowerCase() ?? "";

    return (
      !term ||
      orderNumber.includes(term) ||
      customerName.includes(term) ||
      customerPhone.includes(term)
    );
  });

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Orders & payments
      </h1>

      <p className="mt-2 text-muted-foreground">
        Verify Mobile Money transfers, then fulfil
        the order.
      </p>

      <Tabs
        defaultValue="verify"
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="verify">
            To verify ({pending.length})
          </TabsTrigger>

          <TabsTrigger value="orders">
            All orders
          </TabsTrigger>
        </TabsList>

        {/* ==================================================
            PAYMENT VERIFICATION
        ================================================== */}

        <TabsContent
          value="verify"
          className="mt-4"
        >
          {payments.isLoading ? (
            <LoadingState />
          ) : payments.isError ? (
            <ErrorState
              message={
                payments.error instanceof Error
                  ? payments.error.message
                  : "Failed to load payments."
              }
            />
          ) : pending.length === 0 ? (
            <p className="surface-panel p-5 text-sm text-muted-foreground">
              Nothing waiting for verification.
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="surface-panel p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold">
                        {p.orders?.order_number}
                      </p>

                      <p className="break-words text-sm text-muted-foreground">
                        {p.orders?.customer_name} ·{" "}
                        {p.orders?.customer_phone}
                      </p>

                      <p className="mt-1 text-sm">
                        Ref:{" "}
                        <span className="font-medium">
                          {p.reference ?? "—"}
                        </span>{" "}
                        · From:{" "}
                        <span className="font-medium">
                          {p.sender_number ?? "—"}
                        </span>
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {dateTime(
                          p.created_at,
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-bold text-primary">
                        {money(p.amount)}
                      </p>

                      <StatusBadge
                        status={p.status}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={
                        notes[p.id] ?? ""
                      }
                      onChange={(e) =>
                        setNotes((n) => ({
                          ...n,
                          [p.id]:
                            e.target.value,
                        }))
                      }
                      placeholder="Note for the customer (optional)"
                      className="max-w-sm"
                    />

                    {p.proof_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void openProof(
                            p.id,
                          )
                        }
                      >
                        <Eye
                          className="mr-2 size-4"
                          aria-hidden
                        />
                        Screenshot
                      </Button>
                    )}

                    <Button
                      size="sm"
                      disabled={
                        busy === p.id
                      }
                      onClick={() =>
                        void review(
                          p.id,
                          "approve",
                        )
                      }
                    >
                      {busy === p.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check
                          className="mr-2 size-4"
                          aria-hidden
                        />
                      )}

                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        busy === p.id
                      }
                      onClick={() =>
                        void review(
                          p.id,
                          "reject",
                        )
                      }
                    >
                      <X
                        className="mr-2 size-4"
                        aria-hidden
                      />

                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ==================================================
            ALL ORDERS
        ================================================== */}

        <TabsContent
          value="orders"
          className="mt-4"
        >
          <Input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search order number, customer or phone"
            className="mb-4 max-w-sm"
          />

          {orders.isLoading ? (
            <LoadingState />
          ) : orders.isError ? (
            <ErrorState
              message={
                orders.error instanceof Error
                  ? orders.error.message
                  : "Failed to load orders."
              }
            />
          ) : orderRows.length === 0 ? (
            <p className="surface-panel p-5 text-sm text-muted-foreground">
              No orders found.
            </p>
          ) : (
            <ul className="space-y-3">
              {orderRows.map((o) => (
                <li
                  key={o.id}
                  className="surface-panel p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold">
                        {o.order_number}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {o.customer_name} ·{" "}
                        {o.customer_phone} ·{" "}
                        {o.customer_email}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {(o.order_items ?? [])
                          .map(
                            (i) =>
                              `${i.quantity} × ${i.product_name}`,
                          )
                          .join(", ")}
                      </p>

                      {o.customer_note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Note:{" "}
                          {o.customer_note}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {dateTime(
                          o.created_at,
                        )}
                      </p>
                    </div>

                    <div className="w-full items-stretch gap-2 sm:flex sm:w-auto sm:flex-col sm:items-end">
                      <span className="font-display text-lg font-bold text-primary">
                        {money(o.total)}
                      </span>

                      <StatusBadge
                        status={
                          o.payment_status
                        }
                        label={`Payment: ${o.payment_status}`}
                      />

                      {paymentByOrder.get(
                        o.id,
                      )?.proof_path ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void openProof(
                              paymentByOrder.get(
                                o.id,
                              )!.id,
                            )
                          }
                        >
                          <Eye
                            className="mr-2 size-4"
                            aria-hidden
                          />

                          View screenshot
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No screenshot
                        </span>
                      )}

                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          void setStatus(
                            o.id,
                            v,
                          )
                        }
                      >
                        <SelectTrigger
                          className="mt-2 w-full sm:mt-0 sm:w-48"
                          aria-label="Order status"
                        >
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {ORDER_STATUSES.map(
                            (s) => (
                              <SelectItem
                                key={s}
                                value={s}
                              >
                                {
                                  ORDER_STATUS_LABELS[
                                    s
                                  ]
                                }

                                {!ORDER_STATUS_LABELS[
                                  s
                                ] && s}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        className="mt-2 w-full sm:mt-0 sm:w-auto"
                        size="sm"
                        onClick={() => {
                          setDeliveryOrder(
                            o,
                          );
                          setSelectedInventoryId(
                            "",
                          );
                          setShowDeliveryPassword(
                            false,
                          );
                        }}
                      >
                        <PackageCheck className="mr-2 size-4" />

                        Deliver Product
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================================================
          DELIVERY MODAL
      ================================================== */}

      {deliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-4 shadow-xl sm:max-h-[90vh] sm:p-6">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Deliver Digital Product
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Select an available inventory
                  item for this order.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={
                  closeDeliveryModal
                }
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* ORDER INFO */}

            <div className="mt-6 grid gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Order
                </p>

                <p className="mt-1 font-semibold">
                  {
                    deliveryOrder.order_number
                  }
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Customer
                  </p>

                  <p className="mt-1 font-medium">
                    {
                      deliveryOrder.customer_name
                    }
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Customer Email
                  </p>

                  <p className="mt-1 break-all font-medium">
                    {
                      deliveryOrder.customer_email
                    }
                  </p>
                </div>
              </div>

              {/* ORDERED PRODUCT */}

              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Ordered Product
                </p>

                <div className="mt-2 space-y-1">
                  {(
                    deliveryOrder.order_items ??
                    []
                  ).map((item: any) => (
                    <p
                      key={item.id}
                      className="text-sm"
                    >
                      {item.quantity} ×{" "}
                      {item.product_name}
                    </p>
                  ))}
                </div>
              </div>

              {/* ==================================================
                  IF PRODUCT HAS NOT BEEN RESERVED
              ================================================== */}

              {!reservedDelivery.data && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Available Digital Inventory
                  </p>

                  {inventory.isLoading ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      Loading available
                      inventory...
                    </div>
                  ) : inventory.isError ? (
                    <div className="rounded-lg border p-4 text-sm text-destructive">
                      {inventory.error instanceof
                      Error
                        ? inventory.error.message
                        : "Failed to load inventory."}
                    </div>
                  ) : visibleInventory.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      {showAllInventory ? (
                        "No available digital inventory."
                      ) : (
                        <>
                          No available inventory matches
                          this order&apos;s products.{" "}
                          <button
                            type="button"
                            className="underline"
                            onClick={() =>
                              setShowAllInventory(true)
                            }
                          >
                            Show all available inventory
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {visibleInventory.map(
                        (item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setSelectedInventoryId(
                                item.id,
                              )
                            }
                            className={`w-full rounded-lg border p-4 text-left transition ${
                              selectedInventoryId ===
                              item.id
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold">
                                  {
                                    item.product_name
                                  }
                                </p>

                                <p className="text-sm text-muted-foreground">
                                  {
                                    item.product_type
                                  }
                                </p>
                              </div>

                              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                                Available
                              </span>
                            </div>

                            <div className="mt-3 grid gap-1 text-sm">
                              {item.account_email && (
                                <p className="break-all">
                                  Email:{" "}
                                  {
                                    item.account_email
                                  }
                                </p>
                              )}

                              {item.account_username && (
                                <p>
                                  Username:{" "}
                                  {
                                    item.account_username
                                  }
                                </p>
                              )}
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================
                  DELIVERY REVIEW
              ================================================== */}

              {reservedDelivery.isLoading && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Loading delivery reservation...
                </div>
              )}

              {reservedDelivery.isError && (
                <div className="rounded-lg border p-4 text-sm text-destructive">
                  {reservedDelivery.error instanceof
                  Error
                    ? reservedDelivery.error.message
                    : "Failed to load delivery reservation."}
                </div>
              )}

              {reservedDelivery.data
                ?.digital_inventory && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        Delivery Review
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Review the account before
                        sending it to the customer.
                      </p>
                    </div>

                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium">
                      Reserved
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {/* CUSTOMER EMAIL */}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Customer Email
                      </p>

                      <p className="mt-1 break-all text-sm">
                        {
                          reservedDelivery
                            .data.customer_email
                        }
                      </p>
                    </div>

                    {/* PRODUCT */}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Product
                      </p>

                      <p className="mt-1 text-sm">
                        {
                          reservedDelivery
                            .data.product_name
                        }
                      </p>
                    </div>

                    {/* ACCOUNT EMAIL */}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Account Email
                      </p>

                      <p className="mt-1 break-all text-sm">
                        {
                          reservedDelivery.data
                            .digital_inventory
                            .account_email ||
                          "—"
                        }
                      </p>
                    </div>

                    {/* USERNAME */}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Username
                      </p>

                      <p className="mt-1 break-all text-sm">
                        {
                          reservedDelivery.data
                            .digital_inventory
                            .account_username ||
                          "—"
                        }
                      </p>
                    </div>

                    {/* PASSWORD */}

                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Password
                        </p>

                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() =>
                            setShowDeliveryPassword(
                              (current) =>
                                !current,
                            )
                          }
                        >
                          {showDeliveryPassword
                            ? "Hide"
                            : "Show"}
                        </button>
                      </div>

                      <p className="mt-1 break-all font-mono text-sm">
                        {showDeliveryPassword
                          ? reservedDelivery
                              .data
                              .digital_inventory
                              .account_password ||
                            "—"
                          : reservedDelivery
                              .data
                              .digital_inventory
                              .account_password
                            ? "••••••••••••"
                            : "—"}
                      </p>
                    </div>

                    {/* RECOVERY */}

                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Recovery Information
                      </p>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                        {
                          reservedDelivery
                            .data
                            .digital_inventory
                            .recovery_info ||
                          "—"
                        }
                      </p>
                    </div>

                    {/* NOTES */}

                    {reservedDelivery.data
                      .digital_inventory
                      .notes && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Notes
                        </p>

                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                          {
                            reservedDelivery
                              .data
                              .digital_inventory
                              .notes
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {/* EMAIL DESTINATION */}

                  <div className="mt-5 rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      Email destination
                    </p>

                    <p className="mt-1 break-all text-sm font-medium">
                      {
                        reservedDelivery
                          .data.customer_email
                      }
                    </p>
                  </div>

                  {/* STEP 4 */}

                 <Button
  className="mt-4 w-full"
  disabled={
    deliveryEmailBusy ||
    reservedDelivery.data?.delivery_status !== "pending"
  }
  onClick={() => void sendDeliveryEmail()}
>
  {deliveryEmailBusy ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Sending Email...
    </>
  ) : (
    "Send Email"
  )}
</Button>
                </div>
              )}

              {/* ==================================================
                  MODAL BUTTONS
              ================================================== */}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={
                    closeDeliveryModal
                  }
                >
                  Close
                </Button>

                {!reservedDelivery.data && (
                  <Button
                    disabled={
                      !selectedInventoryId ||
                      deliveryBusy
                    }
                    onClick={() =>
                      void reserveInventory()
                    }
                  >
                    {deliveryBusy && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}

                    {deliveryBusy
                      ? "Reserving..."
                      : "Reserve Product"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
