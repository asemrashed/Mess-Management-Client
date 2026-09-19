"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const UNITS = ["kg", "lt", "piece"] as const;

type GroceryItemDraft = {
  product: string;
  quantity: string;
  unit: (typeof UNITS)[number];
  price: string;
};

type GroceryItem = {
  id: string;
  product: string;
  quantity: string | number;
  unit: string;
  price: string | number;
};

type GroceryPurchase = {
  id: string;
  title: string;
  amount: string | number;
  purchaseDate: string;
  status: string;
  createdById?: string;
  createdBy?: { id?: string; name?: string };
  items?: GroceryItem[];
};

function emptyItem(): GroceryItemDraft {
  return { product: "", quantity: "", unit: "kg", price: "" };
}

function money(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function itemsFromPurchase(p: GroceryPurchase): GroceryItemDraft[] {
  if (!p.items?.length) return [emptyItem()];
  return p.items.map((item) => ({
    product: item.product,
    quantity: String(item.quantity),
    unit: (UNITS.includes(item.unit as any) ? item.unit : "kg") as GroceryItemDraft["unit"],
    price: String(item.price),
  }));
}

export default function GroceriesPage() {
  const { can } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const myId = (session as any)?.apiUser?.id as string | undefined;

  const [items, setItems] = useState<GroceryItemDraft[]>([emptyItem()]);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GroceryPurchase | null>(null);
  const [editItems, setEditItems] = useState<GroceryItemDraft[]>([emptyItem()]);
  const [editDate, setEditDate] = useState("");
  const [confirm, setConfirm] = useState<
    | { kind: "create" }
    | { kind: "save"; id: string }
    | { kind: "delete"; id: string }
    | { kind: "decide"; id: string; status: "APPROVED" | "REJECTED" }
    | null
  >(null);

  const { data } = useQuery({
    queryKey: ["groceries", params.messUsername, page],
    queryFn: () =>
      api.get<{ purchases: GroceryPurchase[]; page: number; totalPages: number; total: number }>(
        `/mess/${params.messUsername}/groceries?page=${page}&pageSize=10`
      ),
    refetchInterval: 20000,
  });

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [items]);
  const editTotal = useMemo(
    () => editItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [editItems]
  );

  function updateItem(index: number, patch: Partial<GroceryItemDraft>, target: "create" | "edit" = "create") {
    const setter = target === "edit" ? setEditItems : setItems;
    setter((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const payloadFrom = (list: GroceryItemDraft[], date: string) => ({
    purchaseDate: date,
    items: list.map((item) => ({
      product: item.product.trim(),
      quantity: Number(item.quantity),
      unit: item.unit,
      price: Number(item.price),
    })),
  });

  const create = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/groceries`, payloadFrom(items, purchaseDate)),
    onSuccess: () => {
      setItems([emptyItem()]);
      setConfirm(null);
      setPage(1);
      qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/mess/${params.messUsername}/groceries/${id}`, payloadFrom(editItems, editDate)),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/groceries/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.patch(`/mess/${params.messUsername}/groceries/${id}/decision`, { status }),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
    },
  });

  const canApprove = can("grocery");

  function canEditRow(p: GroceryPurchase) {
    if (canApprove) return true;
    return (p.createdById === myId || p.createdBy?.id === myId) && p.status === "PENDING";
  }

  function startEdit(p: GroceryPurchase) {
    setEditing(p);
    setEditItems(itemsFromPurchase(p));
    setEditDate(p.purchaseDate.slice(0, 10));
  }

  function itemFields(
    list: GroceryItemDraft[],
    target: "create" | "edit",
    setList: (fn: (c: GroceryItemDraft[]) => GroceryItemDraft[]) => void
  ) {
    return (
      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_7.5rem_5.5rem_6.5rem_2rem] gap-2 text-xs font-medium text-gray-500 px-0.5">
          <span>Product</span>
          <span>Amount</span>
          <span>Unit</span>
          <span>Price (৳)</span>
          <span />
        </div>
        {list.map((item, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_7.5rem_5.5rem_6.5rem_2rem] gap-2 items-end">
            <div>
              <label className="label sm:hidden">Product</label>
              <input
                className="input"
                placeholder="Rice, oil…"
                value={item.product}
                onChange={(e) => updateItem(index, { product: e.target.value }, target)}
                required
              />
            </div>
            <div>
              <label className="label sm:hidden">Amount</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value }, target)}
                required
              />
            </div>
            <div>
              <label className="label sm:hidden">Unit</label>
              <select
                className="input"
                value={item.unit}
                onChange={(e) => updateItem(index, { unit: e.target.value as GroceryItemDraft["unit"] }, target)}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label sm:hidden">Price (৳)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={item.price}
                onChange={(e) => updateItem(index, { price: e.target.value }, target)}
                required
              />
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-red-600 text-lg leading-none h-10 disabled:opacity-30"
              disabled={list.length === 1}
              onClick={() => setList((current) => current.filter((_, i) => i !== index))}
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary text-xs" onClick={() => setList((current) => [...current, emptyItem()])}>
          + Add item
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Groceries</h1>
      <p className="text-sm text-gray-500">
        Members submit purchases. A manager or admin reviews and approves them before they count.
      </p>

      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setConfirm({ kind: "create" });
        }}
      >
        <h2 className="font-medium text-sm">Submit a purchase</h2>
        <div>
          <label className="label">Purchase date</label>
          <input
            className="input max-w-[12rem]"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>
        {itemFields(items, "create", setItems)}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-lg font-semibold">৳{money(total)}</span>
        </div>
        {create.isError && (
          <p className="text-sm text-red-600">{(create.error as Error)?.message || "Could not submit purchase"}</p>
        )}
        <button className="btn-primary w-full" disabled={create.isPending || total <= 0} type="submit">
          {create.isPending ? "Submitting…" : "Submit Purchase"}
        </button>
      </form>

      <div className="card">
        <h2 className="font-medium mb-3">Grocery history</h2>
        <ul className="divide-y text-sm">
          {data?.purchases?.map((p) => (
            <li key={p.id} className="py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-gray-500 text-xs">
                    ৳{money(p.amount)} · {new Date(p.purchaseDate).toDateString()} · by {p.createdBy?.name}
                  </p>
                  {!!p.items?.length && editing?.id !== p.id && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                      {p.items.map((item) => (
                        <li key={item.id}>
                          {item.product} · {Number(item.quantity)} {item.unit} · ৳{money(item.price)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className={`badge ${STATUS_COLOR[p.status]} shrink-0`}>{p.status}</span>
              </div>

              {editing && editing.id === p.id ? (
                <div className="space-y-3 rounded-lg border p-3 bg-gray-50">
                  <div>
                    <label className="label">Purchase date</label>
                    <input
                      className="input max-w-[12rem]"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                  </div>
                  {itemFields(editItems, "edit", setEditItems)}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total ৳{money(editTotal)}</span>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={editTotal <= 0}
                        onClick={() => setConfirm({ kind: "save", id: p.id })}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  {update.isError && (
                    <p className="text-sm text-red-600">{(update.error as Error)?.message || "Could not save"}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {canApprove && p.status === "PENDING" && (
                    <>
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => setConfirm({ kind: "decide", id: p.id, status: "APPROVED" })}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-danger text-xs"
                        onClick={() => setConfirm({ kind: "decide", id: p.id, status: "REJECTED" })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {canEditRow(p) && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: p.id })}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
          {!data?.purchases?.length && <p className="text-sm text-gray-400 py-2">No purchases yet.</p>}
        </ul>
        <Pagination
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 1}
          total={data?.total}
          onPage={setPage}
        />
      </div>

      <ConfirmModal
        open={confirm?.kind === "create"}
        title="Submit this purchase?"
        message={
          canApprove
            ? "This will be recorded as approved because you can manage groceries."
            : "A manager will need to approve this purchase before it counts."
        }
        confirmLabel="Submit"
        pending={create.isPending}
        onConfirm={() => create.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save grocery changes?"
        message="The purchase details will be updated."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => confirm?.kind === "save" && update.mutate({ id: confirm.id })}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this purchase?"
        message="This cannot be undone."
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => confirm?.kind === "delete" && remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "decide"}
        title={confirm?.kind === "decide" && confirm.status === "APPROVED" ? "Approve this purchase?" : "Reject this purchase?"}
        message={
          confirm?.kind === "decide" && confirm.status === "APPROVED"
            ? "It will be included in this month's grocery costs."
            : "The member will be notified that it was rejected."
        }
        confirmLabel={confirm?.kind === "decide" && confirm.status === "APPROVED" ? "Approve" : "Reject"}
        danger={confirm?.kind === "decide" && confirm.status === "REJECTED"}
        pending={decide.isPending}
        onConfirm={() => confirm?.kind === "decide" && decide.mutate({ id: confirm.id, status: confirm.status })}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
