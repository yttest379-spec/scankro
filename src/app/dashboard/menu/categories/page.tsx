"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; sortOrder: number; _count?: { items: number } };

function SortableRow({
  cat,
  onRename,
  onDelete,
}: {
  cat: Category;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: cat.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [name, setName] = useState(cat.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3"
    >
      <button className="cursor-grab touch-none text-stone-400" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== cat.name) onRename(cat.id, name);
        }}
        className="flex-1"
      />
      <span className="text-xs text-stone-400">{cat._count?.items ?? 0} items</span>
      <Button variant="ghost" size="icon" onClick={() => onDelete(cat.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    const res = await fetch(`/api/categories?branch=${branch || ""}`);
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, branchId: branch }),
    });
    if (!res.ok) {
      toast.error("Failed to add category");
      return;
    }
    setNewName("");
    toast.success("Category added");
    load();
  }

  async function onRename(id: string, name: string) {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    toast.success("Saved");
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    load();
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const next = arrayMove(categories, oldIndex, newIndex);
    setCategories(next);
    await fetch("/api/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((c) => c.id), branchId: branch }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-stone-500">Drag to reorder how they appear on the menu</p>
      </div>

      <form onSubmit={addCategory} className="flex gap-2">
        <Input
          placeholder="e.g. Starters, Pizza, Drinks"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
          No categories yet. Add Starters, Mains, Desserts…
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((cat) => (
                <SortableRow key={cat.id} cat={cat} onRename={onRename} onDelete={onDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
