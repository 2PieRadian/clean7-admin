"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Tags,
  Package,
  LayoutList,
  Edit2,
  Check,
  Trash,
  RotateCcw,
  Loader2,
  SlidersHorizontal,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCategories,
  useDeleteCategory,
  useDeleteItem,
  useDeleteAddOn,
  useSetting,
  useUpdateSetting,
} from "../api/catalog-api";
import type {
  CategorySummary,
  CatalogServiceSummary,
  CatalogItemResponse,
  CatalogAddOnResponse,
} from "@/lib/types";
import { CategoryForm } from "./category-tab";
import { ServiceForm } from "./service-tab";
import { ItemForm } from "./item-tab";
import { AddOnForm } from "./addon-tab";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DeleteServiceAction } from "./delete-service-action";
import { SortableList, reorderArray } from "@/components/ui/dnd-sortable";

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

function DeleteAction({ name, onConfirm }: { name: string; onConfirm: () => Promise<unknown> | void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
          title={`Delete ${name}`}
        >
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

type ActiveForm =
  | { type: "none" }
  | { type: "category"; category?: CategorySummary }
  | { type: "service"; service?: CatalogServiceSummary; defaultCategoryId?: string }
  | { type: "item"; item?: CatalogItemResponse; defaultServiceId?: string }
  | { type: "addon"; addon?: CatalogAddOnResponse; defaultServiceId?: string };

function GlobalSettingsCard() {
  const { data: iconSizeSetting, isLoading } = useSetting("HOME_SERVICE_ICON_SIZE");
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();

  const [localSize, setLocalSize] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (isLoading) return null;

  const currentSize =
    localSize ??
    (iconSizeSetting?.value !== undefined && iconSizeSetting?.value !== null && iconSizeSetting.value !== ""
      ? Number(iconSizeSetting.value)
      : 40);

  const handleSave = async (val: number) => {
    try {
      await updateSetting.mutateAsync({ key: "HOME_SERVICE_ICON_SIZE", value: val });
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      await updateSetting.mutateAsync({ key: "HOME_SERVICE_ICON_SIZE", value: 40 });
      setLocalSize(40);

      const services = await apiRequest<CatalogServiceSummary[]>({ path: "/admin/services" });
      if (Array.isArray(services) && services.length > 0) {
        await Promise.all(
          services.map((svc) =>
            apiRequest({
              path: `/admin/services/${svc.id}`,
              method: "PATCH",
              body: { iconSize: null },
            })
          )
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["services"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });

      setResetMessage("All services reset to size 40 (Same as Global)!");
      setTimeout(() => setResetMessage(null), 4000);
    } catch (e) {
      console.error("Reset failed:", e);
      setResetMessage("Failed to reset services. Check console.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-soft)] bg-surface p-4 sm:p-6 shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Global Preferences</h3>
      <div className="space-y-4 p-3 sm:p-4 bg-surface-muted/30 rounded-xl border border-[var(--border-soft)] max-w-md">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs sm:text-sm font-semibold text-foreground">Default App Icon Size</label>
          <span className="text-xs px-2 py-0.5 rounded bg-surface border border-[var(--border-soft)] font-mono font-medium">
            {currentSize}px
          </span>
        </div>
        <p className="text-[11px] text-text-muted mb-2">
          Default size is 40px. Used for all services on the app home screen unless overridden individually.
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            className="flex-1 accent-primary"
            value={currentSize}
            onChange={(e) => setLocalSize(parseInt(e.target.value))}
            onMouseUp={() => handleSave(currentSize)}
            onTouchEnd={() => handleSave(currentSize)}
          />
          <span className="w-8 text-xs sm:text-sm text-right font-medium">{currentSize}</span>
        </div>

        <div className="pt-3 border-t border-[var(--border-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <p className="text-xs font-medium text-foreground">Reset All Services</p>
            <p className="text-[11px] text-text-muted">
              Reset all services to default size 40 (Same as Global)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetAll}
            disabled={isResetting}
            className="w-full sm:w-auto h-8 text-xs shrink-0 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
            {isResetting ? "Resetting..." : "Reset All to 40"}
          </Button>
        </div>
        {resetMessage && (
          <p className="text-xs text-primary font-medium">{resetMessage}</p>
        )}
      </div>
    </div>
  );
}

export function CatalogManager() {
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const deleteItem = useDeleteItem();
  const deleteAddOn = useDeleteAddOn();
  const queryClient = useQueryClient();

  const [activeForm, setActiveForm] = useState<ActiveForm>({ type: "none" });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedSvcs, setExpandedSvcs] = useState<Record<string, boolean>>({});

  // Local reordered state
  const [localCategories, setLocalCategories] = useState<CategorySummary[] | null>(null);
  const [localServices, setLocalServices] = useState<Record<string, CatalogServiceSummary[]>>({});
  const [localItems, setLocalItems] = useState<Record<string, CatalogItemResponse[]>>({});
  const [localAddOns, setLocalAddOns] = useState<Record<string, CatalogAddOnResponse[]>>({});

  // Loading states for saving orders
  const [isSavingCatOrder, setIsSavingCatOrder] = useState(false);
  const [savingSvcOrders, setSavingSvcOrders] = useState<Record<string, boolean>>({});
  const [savingItemOrders, setSavingItemOrders] = useState<Record<string, boolean>>({});
  const [savingAddOnOrders, setSavingAddOnOrders] = useState<Record<string, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Derive current display categories
  const currentCategories = localCategories ?? categories;

  const isCatOrderDirty = useMemo(() => {
    if (!localCategories) return false;
    if (localCategories.length !== categories.length) return false;
    return localCategories.some((cat, i) => cat.id !== categories[i]?.id);
  }, [localCategories, categories]);

  // Category reorder handler
  const handleReorderCategories = (sourceIndex: number, targetIndex: number) => {
    const updated = reorderArray(currentCategories, sourceIndex, targetIndex);
    setLocalCategories(updated);
  };

  const saveCategoryOrder = async () => {
    if (!localCategories) return;
    setIsSavingCatOrder(true);
    try {
      await Promise.all(
        localCategories.map((cat, idx) =>
          apiRequest({
            path: `/admin/categories/${cat.id}`,
            method: "PATCH",
            body: { sortOrder: idx, changeSummary: "Reordered categories" },
          })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setLocalCategories(null);
      toast.success("Category order saved successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save category order";
      toast.error(message);
    } finally {
      setIsSavingCatOrder(false);
    }
  };

  const resetCategoryOrder = () => {
    setLocalCategories(null);
  };

  // Service reorder handlers
  const getCatServices = (cat: CategorySummary): CatalogServiceSummary[] => {
    return localServices[cat.id] ?? cat.services ?? [];
  };

  const isSvcOrderDirty = (cat: CategorySummary): boolean => {
    const local = localServices[cat.id];
    const original = cat.services ?? [];
    if (!local || local.length !== original.length) return false;
    return local.some((svc, i) => svc.id !== original[i]?.id);
  };

  const handleReorderServices = (catId: string, sourceIndex: number, targetIndex: number) => {
    const cat = currentCategories.find((c) => c.id === catId);
    const list = localServices[catId] ?? cat?.services ?? [];
    const updated = reorderArray(list, sourceIndex, targetIndex);
    setLocalServices((prev) => ({ ...prev, [catId]: updated }));
  };

  const saveServiceOrder = async (catId: string) => {
    const list = localServices[catId];
    if (!list) return;
    setSavingSvcOrders((prev) => ({ ...prev, [catId]: true }));
    try {
      await Promise.all(
        list.map((svc, idx) =>
          apiRequest({
            path: `/admin/services/${svc.id}`,
            method: "PATCH",
            body: { sortOrder: idx, changeSummary: "Reordered services" },
          })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setLocalServices((prev) => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
      toast.success("Service order saved successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save service order";
      toast.error(message);
    } finally {
      setSavingSvcOrders((prev) => ({ ...prev, [catId]: false }));
    }
  };

  const resetServiceOrder = (catId: string) => {
    setLocalServices((prev) => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });
  };

  // Item reorder handlers
  const getSvcItems = (svc: CatalogServiceSummary): CatalogItemResponse[] => {
    return localItems[svc.id] ?? svc.items ?? [];
  };

  const isItemOrderDirty = (svc: CatalogServiceSummary): boolean => {
    const local = localItems[svc.id];
    const original = svc.items ?? [];
    if (!local || local.length !== original.length) return false;
    return local.some((item, i) => item.id !== original[i]?.id);
  };

  const handleReorderItems = (svcId: string, sourceIndex: number, targetIndex: number) => {
    let originalItems: CatalogItemResponse[] = [];
    for (const c of currentCategories) {
      const s = (localServices[c.id] ?? c.services ?? []).find((candidate) => candidate.id === svcId);
      if (s) {
        originalItems = s.items ?? [];
        break;
      }
    }
    const list = localItems[svcId] ?? originalItems;
    const updated = reorderArray(list, sourceIndex, targetIndex);
    setLocalItems((prev) => ({ ...prev, [svcId]: updated }));
  };

  const saveItemOrder = async (svcId: string) => {
    const list = localItems[svcId];
    if (!list) return;
    setSavingItemOrders((prev) => ({ ...prev, [svcId]: true }));
    try {
      await Promise.all(
        list.map((item, idx) =>
          apiRequest({
            path: `/admin/items/${item.id}`,
            method: "PATCH",
            body: { sortOrder: idx, changeSummary: "Reordered items" },
          })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      setLocalItems((prev) => {
        const next = { ...prev };
        delete next[svcId];
        return next;
      });
      toast.success("Item order saved successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save item order";
      toast.error(message);
    } finally {
      setSavingItemOrders((prev) => ({ ...prev, [svcId]: false }));
    }
  };

  const resetItemOrder = (svcId: string) => {
    setLocalItems((prev) => {
      const next = { ...prev };
      delete next[svcId];
      return next;
    });
  };

  // Add-on reorder handlers
  const getSvcAddOns = (svc: CatalogServiceSummary): CatalogAddOnResponse[] => {
    return localAddOns[svc.id] ?? svc.addOns ?? [];
  };

  const isAddOnOrderDirty = (svc: CatalogServiceSummary): boolean => {
    const local = localAddOns[svc.id];
    const original = svc.addOns ?? [];
    if (!local || local.length !== original.length) return false;
    return local.some((addon, i) => addon.id !== original[i]?.id);
  };

  const handleReorderAddOns = (svcId: string, sourceIndex: number, targetIndex: number) => {
    let originalAddOns: CatalogAddOnResponse[] = [];
    for (const c of currentCategories) {
      const s = (localServices[c.id] ?? c.services ?? []).find((candidate) => candidate.id === svcId);
      if (s) {
        originalAddOns = s.addOns ?? [];
        break;
      }
    }
    const list = localAddOns[svcId] ?? originalAddOns;
    const updated = reorderArray(list, sourceIndex, targetIndex);
    setLocalAddOns((prev) => ({ ...prev, [svcId]: updated }));
  };

  const saveAddOnOrder = async (svcId: string) => {
    const list = localAddOns[svcId];
    if (!list) return;
    setSavingAddOnOrders((prev) => ({ ...prev, [svcId]: true }));
    try {
      await Promise.all(
        list.map((addon, idx) =>
          apiRequest({
            path: `/admin/addons/${addon.id}`,
            method: "PATCH",
            body: { sortOrder: idx, changeSummary: "Reordered add-ons" },
          })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["addons"] });
      setLocalAddOns((prev) => {
        const next = { ...prev };
        delete next[svcId];
        return next;
      });
      toast.success("Add-on order saved successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save add-on order";
      toast.error(message);
    } finally {
      setSavingAddOnOrders((prev) => ({ ...prev, [svcId]: false }));
    }
  };

  const resetAddOnOrder = (svcId: string) => {
    setLocalAddOns((prev) => {
      const next = { ...prev };
      delete next[svcId];
      return next;
    });
  };

  // Check if ANY ordering is unsaved
  const hasAnyUnsavedOrder =
    isCatOrderDirty ||
    Object.keys(localServices).some((catId) => {
      const cat = categories.find((c) => c.id === catId);
      return cat && isSvcOrderDirty(cat);
    }) ||
    Object.keys(localItems).length > 0 ||
    Object.keys(localAddOns).length > 0;

  const saveAllOrders = async () => {
    setIsSavingAll(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (localCategories && isCatOrderDirty) {
        promises.push(
          ...localCategories.map((cat, idx) =>
            apiRequest({
              path: `/admin/categories/${cat.id}`,
              method: "PATCH",
              body: { sortOrder: idx, changeSummary: "Reordered categories" },
            })
          )
        );
      }

      for (const services of Object.values(localServices)) {
        promises.push(
          ...services.map((svc, idx) =>
            apiRequest({
              path: `/admin/services/${svc.id}`,
              method: "PATCH",
              body: { sortOrder: idx, changeSummary: "Reordered services" },
            })
          )
        );
      }

      for (const items of Object.values(localItems)) {
        promises.push(
          ...items.map((item, idx) =>
            apiRequest({
              path: `/admin/items/${item.id}`,
              method: "PATCH",
              body: { sortOrder: idx, changeSummary: "Reordered items" },
            })
          )
        );
      }

      for (const addons of Object.values(localAddOns)) {
        promises.push(
          ...addons.map((addon, idx) =>
            apiRequest({
              path: `/admin/addons/${addon.id}`,
              method: "PATCH",
              body: { sortOrder: idx, changeSummary: "Reordered add-ons" },
            })
          )
        );
      }

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["addons"] });

      setLocalCategories(null);
      setLocalServices({});
      setLocalItems({});
      setLocalAddOns({});
      toast.success("All catalog order changes saved successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save all orders";
      toast.error(message);
    } finally {
      setIsSavingAll(false);
    }
  };

  const resetAllOrders = () => {
    setLocalCategories(null);
    setLocalServices({});
    setLocalItems({});
    setLocalAddOns({});
    toast.info("All order changes discarded");
  };

  const toggleCat = (id: string) => setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSvc = (id: string) => setExpandedSvcs((prev) => ({ ...prev, [id]: !prev[id] }));

  const closeModal = () => setActiveForm({ type: "none" });

  const renderModalContent = () => {
    switch (activeForm.type) {
      case "category":
        return <CategoryForm initialCategory={activeForm.category} onSuccess={closeModal} onCancel={closeModal} />;
      case "service":
        return <ServiceForm defaultCategoryId={activeForm.defaultCategoryId} initialService={activeForm.service} onSuccess={closeModal} onCancel={closeModal} />;
      case "item":
        return (
          <ItemForm
            key={activeForm.item?.id || `new-item-${activeForm.defaultServiceId}`}
            defaultServiceId={activeForm.defaultServiceId}
            initialItem={activeForm.item}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        );
      case "addon":
        return (
          <AddOnForm
            key={activeForm.addon?.id || `new-addon-${activeForm.defaultServiceId}`}
            defaultServiceId={activeForm.defaultServiceId}
            initialAddOn={activeForm.addon}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        );
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (activeForm.type) {
      case "category": return activeForm.category ? `Edit Category: ${activeForm.category.name}` : "Create Category";
      case "service": return activeForm.service ? `Edit Service: ${activeForm.service.name}` : "Add Service";
      case "item": return activeForm.item ? `Edit Item: ${activeForm.item.name}` : "Add Item";
      case "addon": return activeForm.addon ? `Edit Add-on: ${activeForm.addon.name}` : "Add Add-on";
      default: return "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-semibold text-xl sm:text-2xl text-foreground flex items-center gap-2">
            <LayoutList className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span>Manage Catalog</span>
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Drag items smoothly using the grip handles to customize order across the customer app and website.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Category Order Status Pill */}
          {isCatOrderDirty && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-medium animate-in fade-in">
              <span className="truncate">Category order modified</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={saveCategoryOrder}
                  disabled={isSavingCatOrder}
                >
                  {isSavingCatOrder ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                  Save Order
                </Button>
                <button
                  onClick={resetCategoryOrder}
                  className="p-1 hover:text-foreground text-text-muted transition-colors rounded-full"
                  title="Discard category order"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <Button onClick={() => setActiveForm({ type: "category" })} className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Category
          </Button>
          <Button variant="secondary" onClick={() => setActiveForm({ type: "service" })} className="flex-1 sm:flex-initial justify-center text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Service
          </Button>
        </div>
      </div>

      <GlobalSettingsCard />

      {/* Catalog Categories Container */}
      <div className="space-y-4 rounded-2xl sm:rounded-3xl border border-[var(--border-soft)] bg-surface p-3 sm:p-5 md:p-6 shadow-sm">
        {catLoading ? (
          <p className="text-sm text-text-muted py-4">Loading catalog...</p>
        ) : currentCategories.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No categories found.</p>
        ) : (
          <SortableList
            items={currentCategories}
            keyExtractor={(cat) => cat.id}
            onReorder={handleReorderCategories}
            className="space-y-3"
          >
            {(cat, _catIdx, handleProps) => {
              const catServices = getCatServices(cat);
              const isExpanded = expandedCats[cat.id];
              const svcOrderDirty = isSvcOrderDirty(cat);

              return (
                <div className="border border-[var(--border-soft)] rounded-2xl sm:rounded-3xl overflow-hidden bg-surface transition-shadow hover:shadow-sm">
                  {/* Category Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-surface-muted/50 p-3 sm:px-4 sm:py-3 border-b border-[var(--border-soft)]">
                    <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                      {/* Smooth Drag Handle for Category */}
                      <div
                        {...handleProps}
                        title="Drag to reorder category"
                        className="touch-none cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-text-muted hover:text-foreground shrink-0 rounded-lg hover:bg-surface transition-colors mt-0.5 sm:mt-0"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <button
                        onClick={() => toggleCat(cat.id)}
                        className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0 text-left font-semibold text-sm sm:text-[15px]"
                      >
                        <span className="mt-0.5 sm:mt-0 shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-text-muted" />
                          )}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                          <span className="break-words font-semibold leading-snug">{cat.name}</span>
                          {cat.appImageUrl && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                              title="App photo uploaded"
                            >
                              App Photo
                            </span>
                          )}
                          {cat.webImageUrl && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                              title="Website photo uploaded"
                            >
                              Web Photo
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end pl-7 md:pl-0 pt-1 md:pt-0 border-t md:border-t-0 border-[var(--border-soft)]/50">
                      {/* Service Order Modified Pill in Category Header */}
                      {svcOrderDirty && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-medium mr-1">
                          <span className="text-[11px]">Services reordered</span>
                          <button
                            onClick={() => saveServiceOrder(cat.id)}
                            disabled={savingSvcOrders[cat.id]}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            {savingSvcOrders[cat.id] ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Check className="h-2.5 w-2.5" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={() => resetServiceOrder(cat.id)}
                            className="text-text-muted hover:text-foreground p-0.5"
                            title="Discard service order"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setActiveForm({ type: "category", category: cat })}
                        className="text-xs font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted px-2.5 py-1 rounded-full transition-colors border border-[var(--border-soft)] flex items-center gap-1"
                        title="Edit Category & Photos"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => setActiveForm({ type: "service", defaultCategoryId: cat.id })}
                        className="text-xs font-medium text-primary hover:text-primary/80 hover:underline flex items-center gap-1 bg-primary/5 px-2.5 sm:px-3 py-1 rounded-full transition-colors"
                      >
                        <Plus className="h-3 w-3" /> <span className="hidden xs:inline">Add</span> Service
                      </button>
                      <DeleteAction
                        name={cat.name}
                        onConfirm={() => deleteCategory.mutateAsync(cat.id).catch((e) => alert(e.message))}
                      />
                    </div>
                  </div>

                  {/* Category Expanded Content: Services */}
                  {isExpanded && (
                    <div className="p-2.5 sm:p-3 space-y-2">
                      {catServices.length === 0 ? (
                        <p className="text-xs sm:text-sm text-text-muted px-4 sm:px-8 py-2">No services in this category.</p>
                      ) : (
                        <SortableList
                          items={catServices}
                          keyExtractor={(svc) => svc.id}
                          onReorder={(src, tgt) => handleReorderServices(cat.id, src, tgt)}
                          className="space-y-2"
                        >
                          {(svc, _svcIdx, svcHandleProps) => {
                            const svcItems = getSvcItems(svc);
                            const svcAddons = getSvcAddOns(svc);
                            const isSvcExpanded = expandedSvcs[svc.id];
                            const itemOrderDirty = isItemOrderDirty(svc);
                            const addOnOrderDirty = isAddOnOrderDirty(svc);

                            return (
                              <div className="ml-1 sm:ml-4 border-l-2 border-primary/25 pl-2 sm:pl-3.5 py-1">
                                {/* Service Row Header: 2-tier on mobile, single row on desktop */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 py-2 sm:py-1.5 border-b sm:border-b-0 border-[var(--border-soft)]/40">
                                  <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                    {/* Smooth Drag Handle for Service */}
                                    <div
                                      {...svcHandleProps}
                                      title="Drag to reorder service"
                                      className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-text-muted hover:text-foreground shrink-0 rounded hover:bg-surface-muted transition-colors mt-0.5 sm:mt-0"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>

                                    <button
                                      onClick={() => toggleSvc(svc.id)}
                                      className="flex items-start sm:items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold sm:font-medium text-foreground hover:text-primary transition-colors min-w-0 flex-1 text-left"
                                    >
                                      <span className="mt-0.5 sm:mt-0 shrink-0">
                                        {isSvcExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-text-muted" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-text-muted" />
                                        )}
                                      </span>
                                      <span className="break-words font-medium leading-snug">{svc.name}</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 shrink-0 pl-6 sm:pl-0">
                                    <Badge variant="fulfillment" value={svc.serviceMode} className="text-[10px] sm:text-xs font-normal" />
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          setActiveForm({
                                            type: "service",
                                            service: svc,
                                            defaultCategoryId: cat.id,
                                          })
                                        }
                                        className="text-xs font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted px-2.5 py-1 rounded-full transition-colors border border-[var(--border-soft)] flex items-center gap-1"
                                        title="Edit Service"
                                      >
                                        <Edit2 className="h-3 w-3" /> Edit
                                      </button>
                                      <DeleteServiceAction serviceId={svc.id} serviceName={svc.name} />
                                    </div>
                                  </div>
                                </div>

                                {/* Service Expanded Content: Items & Addons */}
                                {isSvcExpanded && (
                                  <div className="ml-0 sm:ml-3 mt-2 space-y-4 pb-2">
                                    {/* ITEMS SECTION */}
                                    <div className="bg-surface-muted/30 p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-soft)]/50">
                                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-text-muted mb-2.5 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                          <Package className="h-3.5 w-3.5" /> Items
                                        </span>
                                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                          {/* Item Order Modified Status Pill */}
                                          {itemOrderDirty && (
                                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] normal-case font-medium">
                                              <span>Reordered</span>
                                              <button
                                                onClick={() => saveItemOrder(svc.id)}
                                                disabled={savingItemOrders[svc.id]}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                              >
                                                {savingItemOrders[svc.id] ? (
                                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                ) : (
                                                  <Check className="h-2.5 w-2.5" />
                                                )}
                                                Save
                                              </button>
                                              <button
                                                onClick={() => resetItemOrder(svc.id)}
                                                className="text-text-muted hover:text-foreground p-0.5"
                                                title="Discard item order"
                                              >
                                                <RotateCcw className="h-2.5 w-2.5" />
                                              </button>
                                            </div>
                                          )}

                                          <button
                                            onClick={() =>
                                              setActiveForm({ type: "item", defaultServiceId: svc.id })
                                            }
                                            className="text-primary hover:underline flex items-center gap-1 normal-case font-medium text-xs"
                                          >
                                            <Plus className="h-3 w-3" /> Add Item
                                          </button>
                                        </div>
                                      </div>

                                      {svcItems.length === 0 ? (
                                        <p className="text-xs sm:text-sm text-text-muted/70 italic py-1">No items found</p>
                                      ) : (
                                        <SortableList
                                          items={svcItems}
                                          keyExtractor={(item) => item.id}
                                          onReorder={(src, tgt) => handleReorderItems(svc.id, src, tgt)}
                                          className="space-y-2"
                                        >
                                          {(item, _itemIdx, itemHandleProps) => (
                                            <div className="text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-0 bg-surface p-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full border border-[var(--border-soft)] hover:border-[var(--border-soft)]/80 transition-colors">
                                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                                {/* Smooth Drag Handle for Item */}
                                                <div
                                                  {...itemHandleProps}
                                                  title="Drag to reorder item"
                                                  className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-text-muted hover:text-foreground shrink-0 rounded hover:bg-surface-muted transition-colors mt-0.5 sm:mt-0"
                                                >
                                                  <GripVertical className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                                  <span className="font-medium text-foreground text-xs sm:text-sm break-words leading-snug">{item.name}</span>
                                                  {item.unitLabel && (
                                                    <span className="text-[10px] sm:text-xs text-text-muted font-mono bg-surface-muted px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                                                      /{item.unitLabel}
                                                    </span>
                                                  )}
                                                  {item.publishState && item.publishState !== "ACTIVE" && (
                                                    <Badge value={item.publishState} className="text-[10px] px-1.5 py-0 shrink-0" />
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end gap-2 pl-6 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border-soft)]/40">
                                                {/* Clean Price Display */}
                                                <span className="text-text-muted font-mono bg-surface-muted px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                                  ₹{String(item.price)}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                  {/* Single Primary Edit Button */}
                                                  <button
                                                    onClick={() =>
                                                      setActiveForm({
                                                        type: "item",
                                                        defaultServiceId: svc.id,
                                                        item: { ...item, serviceId: svc.id },
                                                      })
                                                    }
                                                    className="p-1.5 sm:p-1 text-text-muted hover:text-foreground hover:bg-surface-muted rounded-full transition-colors"
                                                    title="Edit item"
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                  </button>

                                                  <DeleteAction
                                                    name={item.name}
                                                    onConfirm={() =>
                                                      deleteItem.mutateAsync(item.id).catch((e) => alert(e.message))
                                                    }
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </SortableList>
                                      )}
                                    </div>

                                    {/* ADD-ONS SECTION */}
                                    <div className="bg-surface-muted/30 p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-soft)]/50">
                                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-text-muted mb-2.5 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                          <Tags className="h-3.5 w-3.5" /> Add-ons
                                        </span>
                                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                          {/* Add-on Order Modified Status Pill */}
                                          {addOnOrderDirty && (
                                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] normal-case font-medium">
                                              <span>Reordered</span>
                                              <button
                                                onClick={() => saveAddOnOrder(svc.id)}
                                                disabled={savingAddOnOrders[svc.id]}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                              >
                                                {savingAddOnOrders[svc.id] ? (
                                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                ) : (
                                                  <Check className="h-2.5 w-2.5" />
                                                )}
                                                Save
                                              </button>
                                              <button
                                                onClick={() => resetAddOnOrder(svc.id)}
                                                className="text-text-muted hover:text-foreground p-0.5"
                                                title="Discard add-on order"
                                              >
                                                <RotateCcw className="h-2.5 w-2.5" />
                                              </button>
                                            </div>
                                          )}

                                          <button
                                            onClick={() =>
                                              setActiveForm({ type: "addon", defaultServiceId: svc.id })
                                            }
                                            className="text-primary hover:underline flex items-center gap-1 normal-case font-medium text-xs"
                                          >
                                            <Plus className="h-3 w-3" /> Add Add-on
                                          </button>
                                        </div>
                                      </div>

                                      {svcAddons.length === 0 ? (
                                        <p className="text-xs sm:text-sm text-text-muted/70 italic py-1">No add-ons found</p>
                                      ) : (
                                        <SortableList
                                          items={svcAddons}
                                          keyExtractor={(addon) => addon.id}
                                          onReorder={(src, tgt) => handleReorderAddOns(svc.id, src, tgt)}
                                          className="space-y-2"
                                        >
                                          {(addon, _addonIdx, addonHandleProps) => (
                                            <div className="text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-0 bg-surface p-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full border border-[var(--border-soft)] hover:border-[var(--border-soft)]/80 transition-colors">
                                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                                {/* Smooth Drag Handle for Add-on */}
                                                <div
                                                  {...addonHandleProps}
                                                  title="Drag to reorder add-on"
                                                  className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-text-muted hover:text-foreground shrink-0 rounded hover:bg-surface-muted transition-colors mt-0.5 sm:mt-0"
                                                >
                                                  <GripVertical className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                                  <span className="font-medium text-foreground text-xs sm:text-sm break-words leading-snug">{addon.name}</span>
                                                  {addon.unitLabel && (
                                                    <span className="text-[10px] sm:text-xs text-text-muted font-mono bg-surface-muted px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                                                      /{addon.unitLabel}
                                                    </span>
                                                  )}
                                                  {addon.publishState && addon.publishState !== "ACTIVE" && (
                                                    <Badge value={addon.publishState} className="text-[10px] px-1.5 py-0 shrink-0" />
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end gap-2 pl-6 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border-soft)]/40">
                                                {/* Clean Price Display */}
                                                <span className="text-text-muted font-mono bg-surface-muted px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                                  ₹{String(addon.price)}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                  {/* Single Primary Edit Button */}
                                                  <button
                                                    onClick={() =>
                                                      setActiveForm({
                                                        type: "addon",
                                                        defaultServiceId: svc.id,
                                                        addon: { ...addon, serviceId: svc.id },
                                                      })
                                                    }
                                                    className="p-1.5 sm:p-1 text-text-muted hover:text-foreground hover:bg-surface-muted rounded-full transition-colors"
                                                    title="Edit add-on"
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                  </button>

                                                  <DeleteAction
                                                    name={addon.name}
                                                    onConfirm={() =>
                                                      deleteAddOn.mutateAsync(addon.id).catch((e) => alert(e.message))
                                                    }
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </SortableList>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        </SortableList>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          </SortableList>
        )}
      </div>

      {/* Floating Bottom Bar when ANY ordering is unsaved */}
      {hasAnyUnsavedOrder && (
        <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xl z-50 bg-foreground text-background dark:bg-surface dark:text-foreground p-3 sm:px-5 sm:py-3 rounded-2xl sm:rounded-full shadow-2xl border border-[var(--border-soft)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium justify-center sm:justify-start">
            <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
            <span>Unsaved catalog ordering changes</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              onClick={saveAllOrders}
              disabled={isSavingAll}
              className="flex-1 sm:flex-initial h-8 text-xs sm:text-sm shadow-md"
            >
              {isSavingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save All Changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetAllOrders}
              disabled={isSavingAll}
              className="h-8 text-xs sm:text-sm hover:bg-surface-muted text-text-muted hover:text-foreground"
            >
              Discard All
            </Button>
          </div>
        </div>
      )}

      {/* Item/Category/Service/Addon Edit Modal */}
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
