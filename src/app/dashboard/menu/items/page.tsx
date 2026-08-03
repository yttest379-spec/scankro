"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatPrice, paiseToRupees } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

type Category = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  spicyLevel: number;
  prepMinutes: number | null;
  isAvailable: boolean;
  isPopular: boolean;
  categoryId: string;
  category: { id: string; name: string };
};

const emptyForm = {
  name: "",
  description: "",
  priceRupees: "",
  categoryId: "",
  imageUrl: "",
  isVeg: true,
  spicyLevel: 0,
  prepMinutes: "",
  isPopular: false,
  isAvailable: true,
};

export default function ItemsPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [count, setCount] = useState(0);
  const [plan, setPlan] = useState("free");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");

  async function load() {
    const [itemsRes, catsRes] = await Promise.all([
      fetch(`/api/items?branch=${branch || ""}`),
      fetch(`/api/categories?branch=${branch || ""}`),
    ]);
    const itemsData = await itemsRes.json();
    const catsData = await catsRes.json();
    setItems(itemsData.items || []);
    setCount(itemsData.count || 0);
    setPlan(itemsData.plan || "free");
    setCategories(catsData.categories || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function uploadImage(file: File) {
    const prep = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, folder: "menu" }),
    });
    const { uploadUrl, publicUrl, mode } = await prep.json();
    if (mode === "local") {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      return data.publicUrl as string;
    }
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    return publicUrl as string;
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Pick a category");
      return;
    }
    const payload = {
      name: form.name,
      description: form.description || null,
      priceRupees: Number(form.priceRupees),
      categoryId: form.categoryId,
      imageUrl: form.imageUrl || null,
      isVeg: form.isVeg,
      spicyLevel: Number(form.spicyLevel),
      prepMinutes: form.prepMinutes ? Number(form.prepMinutes) : null,
      isPopular: form.isPopular,
      isAvailable: form.isAvailable,
      branchId: branch,
    };

    const res = await fetch(editingId ? `/api/items/${editingId}` : "/api/items", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to save");
      return;
    }
    toast.success(editingId ? "Updated" : "Item created");
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  }

  async function toggleAvailable(item: Item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
    );
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      priceRupees: String(paiseToRupees(item.price)),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl || "",
      isVeg: item.isVeg,
      spicyLevel: item.spicyLevel,
      prepMinutes: item.prepMinutes?.toString() || "",
      isPopular: item.isPopular,
      isAvailable: item.isAvailable,
    });
    setShowForm(true);
  }

  const filtered = items.filter(
    (i) =>
      !filter ||
      i.name.toLowerCase().includes(filter.toLowerCase()) ||
      i.category.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Menu items</h1>
          <p className="text-sm text-stone-500">
            {count} items · {plan} plan
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-40"
          />
          <Button
            onClick={() => {
              setEditingId(null);
              setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
              setShowForm(true);
            }}
            disabled={categories.length === 0}
          >
            Add item
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          Create a category first, then add dishes.
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <form onSubmit={saveItem} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input
                  required
                  type="number"
                  min={0}
                  step="1"
                  value={form.priceRupees}
                  onChange={(e) => setForm({ ...form, priceRupees: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Spicy (0–3)</Label>
                <Select
                  value={String(form.spicyLevel)}
                  onChange={(e) => setForm({ ...form, spicyLevel: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prep time (min)</Label>
                <Input
                  type="number"
                  value={form.prepMinutes}
                  onChange={(e) => setForm({ ...form, prepMinutes: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadImage(file);
                      setForm((f) => ({ ...f, imageUrl: url }));
                      toast.success("Image uploaded");
                    } catch {
                      toast.error("Upload failed");
                    }
                  }}
                />
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="mt-2 h-20 rounded-lg object-cover" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isVeg}
                  onCheckedChange={(v) => setForm({ ...form, isVeg: v })}
                />
                <Label>Vegetarian</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isPopular}
                  onCheckedChange={(v) => setForm({ ...form, isPopular: v })}
                />
                <Label>Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                />
                <Label>Available</Label>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">
                No img
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.name}</p>
                <Badge variant={item.isVeg ? "success" : "destructive"}>
                  {item.isVeg ? "Veg" : "Non-veg"}
                </Badge>
                {item.isPopular && <Badge variant="warning">Popular</Badge>}
                {!item.isAvailable && <Badge variant="muted">Out of stock</Badge>}
              </div>
              <p className="text-sm text-stone-500">
                {item.category.name} · {formatPrice(item.price)}
                {item.spicyLevel > 0 && ` · 🌶×${item.spicyLevel}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={item.isAvailable} onCheckedChange={() => toggleAvailable(item)} />
                <span className="text-xs text-stone-500">Available</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && categories.length > 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
            No menu items yet. Add your first dish.
          </div>
        )}
      </div>
    </div>
  );
}
