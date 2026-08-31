"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Tags, Package, LayoutList, Edit2, Check, X as XIcon, Trash } from "lucide-react";
import { useCategories, useUpdateItem, useUpdateAddOn, useDeleteCategory, useDeleteItem, useDeleteAddOn } from "../api/catalog-api";
import { CategoryForm } from "./category-tab";
import { ServiceForm } from "./service-tab";
import { ItemForm } from "./item-tab";
import { AddOnForm } from "./addon-tab";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DeleteServiceAction } from "./delete-service-action";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function DeleteAction({ name, onConfirm }: { name: string, onConfirm: () => Promise<unknown> | void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2">
          <Trash className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item and its nested components.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InlinePriceEditor({ id, initialPrice, type }: { id: string, initialPrice: number, type: "item" | "addon" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState(String(initialPrice));

  const updateItem = useUpdateItem();
  const updateAddOn = useUpdateAddOn();

  const handleSave = async () => {
    const numPrice = Number(price);
    if (isNaN(numPrice)) return;

    try {
      if (type === "item") {
        await updateItem.mutateAsync({ id, basePrice: numPrice, changeSummary: "Inline price update" });
      } else {
        await updateAddOn.mutateAsync({ id, price: numPrice, changeSummary: "Inline price update" });
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update price", err);
    }
  };

  const isPending = updateItem.isPending || updateAddOn.isPending;

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-text-muted font-mono bg-surface-muted px-2 py-0.5 rounded-full text-xs">₹{String(initialPrice)}</span>
        <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-surface-muted rounded-full text-text-muted hover:text-foreground transition-all">
          <Edit2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-muted font-mono">₹</span>
      <input
        type="number"
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="w-16 px-2 py-0.5 text-xs font-mono border border-[var(--border-soft)] rounded-full bg-surface focus:outline-none focus:border-primary disabled:opacity-50"
        autoFocus
        disabled={isPending}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
      />
      <button onClick={handleSave} disabled={isPending} className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => setIsEditing(false)} disabled={isPending} className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50">
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type ActiveForm =
  | { type: "none" }
  | { type: "category"; category?: any }
  | { type: "service"; service?: any; defaultCategoryId?: string }
  | { type: "item"; defaultServiceId?: string }
  | { type: "addon"; defaultServiceId?: string };

export function CatalogManager() {
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const deleteItem = useDeleteItem();
  const deleteAddOn = useDeleteAddOn();

  const [activeForm, setActiveForm] = useState<ActiveForm>({ type: "none" });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedSvcs, setExpandedSvcs] = useState<Record<string, boolean>>({});

  const toggleCat = (id: string) => setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSvc = (id: string) => setExpandedSvcs((prev) => ({ ...prev, [id]: !prev[id] }));

  const closeModal = () => setActiveForm({ type: "none" });

  const renderModalContent = () => {
    switch (activeForm.type) {
      case "category":
        return <CategoryForm initialCategory={activeForm.category} onSuccess={closeModal} />;
      case "service":
        return <ServiceForm defaultCategoryId={activeForm.defaultCategoryId} initialService={activeForm.service} onSuccess={closeModal} />;
      case "item":
        return <ItemForm defaultServiceId={activeForm.defaultServiceId} onSuccess={closeModal} />;
      case "addon":
        return <AddOnForm defaultServiceId={activeForm.defaultServiceId} onSuccess={closeModal} />;
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (activeForm.type) {
      case "category": return activeForm.category ? `Edit Category: ${activeForm.category.name}` : "Create Category";
      case "service": return activeForm.service ? `Edit Service: ${activeForm.service.name}` : "Add Service";
      case "item": return "Add Item";
      case "addon": return "Add Add-on";
      default: return "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-semibold text-2xl text-foreground flex items-center gap-2">
          <LayoutList className="h-6 w-6 text-primary" />
          Manage Catalog
        </h2>
        <div className="flex items-center gap-3">
          <Button onClick={() => setActiveForm({ type: "category" })}>
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
          <Button variant="secondary" onClick={() => setActiveForm({ type: "service" })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--border-soft)] bg-surface p-6 shadow-sm">
        {catLoading ? (
          <p className="text-sm text-text-muted py-4">Loading catalog...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No categories found.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const catServices = cat.services || [];
              const isExpanded = expandedCats[cat.id];
              return (
                <div key={cat.id} className="border border-[var(--border-soft)] rounded-3xl overflow-hidden bg-surface transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between bg-surface-muted/50 px-4 py-3 border-b border-[var(--border-soft)]">
                    <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-3 flex-1 text-left font-semibold text-[15px]">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-text-muted shrink-0" /> : <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{cat.name}</span>
                        {cat.appImageUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200" title="App photo uploaded">
                            App Photo
                          </span>
                        )}
                        {cat.webImageUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" title="Website photo uploaded">
                            Web Photo
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveForm({ type: "category", category: cat })}
                        className="text-xs font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted px-2.5 py-1 rounded-full transition-colors border border-[var(--border-soft)] flex items-center gap-1"
                        title="Edit Category & Photos"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => setActiveForm({ type: "service", defaultCategoryId: cat.id })}
                        className="text-xs font-medium text-primary hover:text-primary/80 hover:underline flex items-center gap-1 bg-primary/5 px-3 py-1 rounded-full transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add Service
                      </button>
                      <DeleteAction name={cat.name} onConfirm={() => deleteCategory.mutateAsync(cat.id).catch(e => alert(e.message))} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {catServices.length === 0 ? (
                        <p className="text-sm text-text-muted px-8 py-2">No services in this category.</p>
                      ) : (
                        catServices.map((svc) => {
                          const svcItems = svc.items || [];
                          const svcAddons = svc.addOns || [];
                          const isSvcExpanded = expandedSvcs[svc.id];
                          return (
                            <div key={svc.id} className="ml-6 border-l-2 border-primary/20 pl-4 py-1">
                              <div className="flex items-center justify-between py-2 group">
                                <button onClick={() => toggleSvc(svc.id)} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                                  {isSvcExpanded ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                                  {svc.name}
                                </button>
                                <div className="flex items-center gap-3">
                                  <Badge variant="fulfillment" value={svc.serviceMode} />
                                  <button
                                    onClick={() => setActiveForm({ type: "service", service: svc, defaultCategoryId: cat.id })}
                                    className="text-xs font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted px-2 py-1 rounded-full transition-colors border border-[var(--border-soft)] flex items-center gap-1"
                                    title="Edit Service"
                                  >
                                    <Edit2 className="h-3 w-3" /> Edit
                                  </button>
                                  <DeleteServiceAction serviceId={svc.id} serviceName={svc.name} />
                                </div>
                              </div>

                              {isSvcExpanded && (
                                <div className="ml-6 mt-2 space-y-5 pb-3">
                                  <div className="bg-surface-muted/30 p-4 rounded-3xl border border-[var(--border-soft)]/50">
                                    <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
                                      <span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Items</span>
                                      <button onClick={() => setActiveForm({ type: "item", defaultServiceId: svc.id })} className="text-primary hover:underline flex items-center gap-1 normal-case font-medium">
                                        <Plus className="h-3 w-3" /> Add Item
                                      </button>
                                    </div>
                                    <ul className="space-y-2">
                                      {svcItems.length === 0 && <li className="text-sm text-text-muted/70 italic">No items found</li>}
                                      {svcItems.map(item => (
                                        <li key={item.id} className="text-sm flex justify-between items-center bg-surface px-4 py-2 rounded-full border border-[var(--border-soft)]">
                                          <span className="font-medium text-foreground">{item.name}</span>
                                          <div className="flex items-center gap-2">
                                            <InlinePriceEditor id={item.id} initialPrice={Number(item.price)} type="item" />
                                            <DeleteAction name={item.name} onConfirm={() => deleteItem.mutateAsync(item.id).catch(e => alert(e.message))} />
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="bg-surface-muted/30 p-4 rounded-3xl border border-[var(--border-soft)]/50">
                                    <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
                                      <span className="flex items-center gap-2"><Tags className="h-3.5 w-3.5" /> Add-ons</span>
                                      <button onClick={() => setActiveForm({ type: "addon", defaultServiceId: svc.id })} className="text-primary hover:underline flex items-center gap-1 normal-case font-medium">
                                        <Plus className="h-3 w-3" /> Add Add-on
                                      </button>
                                    </div>
                                    <ul className="space-y-2">
                                      {svcAddons.length === 0 && <li className="text-sm text-text-muted/70 italic">No add-ons found</li>}
                                      {svcAddons.map(addon => (
                                        <li key={addon.id} className="text-sm flex justify-between items-center bg-surface px-4 py-2 rounded-full border border-[var(--border-soft)]">
                                          <span className="font-medium text-foreground">{addon.name}</span>
                                          <div className="flex items-center gap-2">
                                            <InlinePriceEditor id={addon.id} initialPrice={Number(addon.price)} type="addon" />
                                            <DeleteAction name={addon.name} onConfirm={() => deleteAddOn.mutateAsync(addon.id).catch(e => alert(e.message))} />
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={activeForm.type !== "none"}
        onClose={closeModal}
        title={getModalTitle()}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
