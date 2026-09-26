"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Tags,
  LayoutList,
  Edit2,
  Check,
  X as XIcon,
  Trash2,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  Building2,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBranchCatalog,
  useSaveBranchCatalog,
  usePickFromBase,
  useImportAllBaseToBranch,
  useRemoveBranchEntity,
  useCategories,
} from "../api/catalog-api";
import { useBranches } from "@/features/branches/api/branch-api";
import type {
  BranchCatalogResolvedCategory,
  BranchCatalogResolvedService,
  BranchCatalogResolvedItem,
  BranchCatalogResolvedAddOn,
  CategorySummary,
  PublishState,
  BranchAdminResponse,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
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

function formatPromiseTime(minutes?: number | null): string {
  if (!minutes || isNaN(minutes)) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} hr ${remaining} min` : `${hours} hr${hours > 1 ? "s" : ""}`;
}

export function BranchServicesManager({ branchId, branchName }: { branchId: string; branchName?: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useBranchCatalog(branchId);
  const { data: baseCategoriesFromApi = [] } = useCategories();
  const { data: branches = [] } = useBranches();
  const saveCatalog = useSaveBranchCatalog();
  const pickFromBase = usePickFromBase();
  const importAll = useImportAllBaseToBranch();
  const removeEntity = useRemoveBranchEntity();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isPickBaseOpen, setIsPickBaseOpen] = useState(false);

  // Edit modals state
  const [editingService, setEditingService] = useState<BranchCatalogResolvedService | null>(null);
  const [editingCategory, setEditingCategory] = useState<BranchCatalogResolvedCategory | null>(null);

  const rawBaseCatalog = (data as any)?.baseCatalog as any[] | undefined;

  // Normalize base catalog combining useCategories() and data.baseCatalog with variants -> items and addOns
  const normalizedBaseCatalog: CategorySummary[] = useMemo(() => {
    const map = new Map<string, CategorySummary>();

    // 1. Add categories from useCategories()
    for (const cat of baseCategoriesFromApi || []) {
      map.set(cat.id, { ...cat });
    }

    // 2. Add/merge categories from data.baseCatalog
    for (const cat of rawBaseCatalog || []) {
      if (!map.has(cat.id)) {
        map.set(cat.id, { ...cat });
      } else {
        const existing = map.get(cat.id)!;
        if ((!existing.services || existing.services.length === 0) && cat.services) {
          existing.services = cat.services;
        }
      }
    }

    return Array.from(map.values()).map((cat) => {
      const rawServices = cat.services || [];
      const services = rawServices.map((svc: any) => {
        const rawItems = (svc.items && svc.items.length > 0)
          ? svc.items
          : (svc.variants || []);
        const rawAddOns = svc.addOns || [];

        return {
          ...svc,
          items: rawItems.map((item: any) => ({
            id: item.id,
            serviceId: svc.id,
            code: item.code || "",
            slug: item.slug || "",
            name: item.name,
            price: Number(item.price ?? item.basePrice ?? 0),
            basePrice: Number(item.basePrice ?? item.price ?? 0),
            pricingType: item.pricingType || "FIXED",
            unitLabel: item.unitLabel ?? null,
            publishState: item.publishState || "ACTIVE",
            sortOrder: item.sortOrder ?? 0,
          })),
          addOns: rawAddOns.map((addon: any) => ({
            id: addon.id,
            serviceId: svc.id,
            code: addon.code || "",
            slug: addon.slug || "",
            name: addon.name,
            price: Number(addon.price ?? addon.basePrice ?? 0),
            basePrice: Number(addon.price ?? addon.basePrice ?? 0),
            pricingType: addon.pricingType || "ADD_ON",
            unitLabel: addon.unitLabel ?? null,
            publishState: addon.publishState || "ACTIVE",
            sortOrder: addon.sortOrder ?? 0,
          })),
        };
      });

      return {
        ...cat,
        services,
      };
    });
  }, [baseCategoriesFromApi, rawBaseCatalog]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-text-muted">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
        Loading branch services catalog...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-sm text-red-600">
        Failed to load catalog for this branch: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const { categories, stats, baseCatalog, config } = data;
  const currentCategoryId = activeCategoryId || (categories.length > 0 ? categories[0].id : null);
  const activeCategory = categories.find((c) => c.id === currentCategoryId);

  // Handlers
  const handleImportAll = async () => {
    try {
      await importAll.mutateAsync(branchId);
      toast.success("All base categories, services, and items imported to this branch!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import base catalog");
    }
  };

  const handleRemoveEntity = async (
    targetType: "CATEGORY" | "SERVICE" | "ITEM" | "ADDON",
    targetId: string,
    name: string,
  ) => {
    try {
      await removeEntity.mutateAsync({ branchId, targetType, targetId });
      toast.success(`Removed "${name}" from this branch. Base catalog is unchanged.`);
      if (targetType === "CATEGORY" && activeCategoryId === targetId) {
        setActiveCategoryId(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  const handleSaveServiceOverride = async (updated: {
    serviceId: string;
    name?: string;
    shortDescription?: string;
    arrivalSlaMinutes?: number;
    durationEstimateMinutes?: number;
    publishState?: PublishState;
  }) => {
    try {
      const currentOverrides = config.overrides || {};
      const serviceOverrides = { ...(currentOverrides.services || {}) };

      serviceOverrides[updated.serviceId] = {
        name: updated.name || undefined,
        shortDescription: updated.shortDescription || undefined,
        arrivalSlaMinutes: updated.arrivalSlaMinutes,
        durationEstimateMinutes: updated.durationEstimateMinutes,
        publishState: updated.publishState,
      };

      await saveCatalog.mutateAsync({
        branchId,
        config: {
          ...config,
          overrides: {
            ...currentOverrides,
            services: serviceOverrides,
          },
        },
      });

      toast.success("Branch service details updated successfully!");
      setEditingService(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update service");
    }
  };

  const handleSaveCategoryOverride = async (updated: {
    categoryId: string;
    name?: string;
    description?: string;
    publishState?: PublishState;
  }) => {
    try {
      const currentOverrides = config.overrides || {};
      const categoryOverrides = { ...(currentOverrides.categories || {}) };

      categoryOverrides[updated.categoryId] = {
        name: updated.name || undefined,
        description: updated.description || undefined,
        publishState: updated.publishState,
      };

      await saveCatalog.mutateAsync({
        branchId,
        config: {
          ...config,
          overrides: {
            ...currentOverrides,
            categories: categoryOverrides,
          },
        },
      });

      toast.success("Branch category details updated successfully!");
      setEditingCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  return (
    <div className="space-y-6">
      {/* Branch Stats & Overview Banner */}
      <div className="rounded-2xl border border-[var(--border-soft)] bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {branchName ? `${branchName} Catalog` : "Branch Offerings"}
              </h2>
              <Badge tone={config.isCustomized ? "info" : "muted"} className="text-xs">
                {config.isCustomized ? "Customized Branch" : "Using Default Base"}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Customized offerings, arrival promise times, and pricing for this branch. Adding or removing items here does not affect the Base Catalog.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleImportAll}
              disabled={importAll.isPending}
              className="text-xs flex items-center gap-1.5 h-9"
            >
              <Download className="h-3.5 w-3.5" />
              {importAll.isPending ? "Importing..." : "Import All from Base"}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsPickBaseOpen(true)}
              className="text-xs flex items-center gap-1.5 h-9 shadow-sm"
            >
              Pick from Base Catalog
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-soft)]">
          <div className="bg-surface-muted/40 rounded-xl p-3 border border-[var(--border-soft)]">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Active Categories
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {stats.activeCategoriesInBranch}{" "}
              <span className="text-xs font-normal text-text-muted">/ {stats.totalBaseCategories} Base</span>
            </div>
          </div>

          <div className="bg-surface-muted/40 rounded-xl p-3 border border-[var(--border-soft)]">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Active Services
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {stats.activeServicesInBranch}{" "}
              <span className="text-xs font-normal text-text-muted">/ {stats.totalBaseServices} Base</span>
            </div>
          </div>

          <div className="bg-surface-muted/40 rounded-xl p-3 border border-[var(--border-soft)]">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Active Items
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {stats.activeItemsInBranch}{" "}
              <span className="text-xs font-normal text-text-muted">/ {stats.totalBaseItems} Base</span>
            </div>
          </div>

          <div className="bg-surface-muted/40 rounded-xl p-3 border border-[var(--border-soft)]">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Base Add-Ons
            </span>
            <div className="text-lg font-bold text-foreground mt-0.5">
              {stats.totalBaseAddOns ?? 0}{" "}
              <span className="text-xs font-normal text-text-muted">Base options</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-text-muted pt-1 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          Director changes here are branch-isolated. Global Base Catalog remains untouched.
        </p>
      </div>

      {/* Category Pills Navigation */}
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-surface p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Categories Assigned to this Branch</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            This branch currently has no active categories. You can pick categories and services from the Base Catalog or import all base offerings in one click.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportAll}
              disabled={importAll.isPending}
            >
              Import All from Base
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPickBaseOpen(true)}
            >
              Pick from Base
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex w-full overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center p-1.5 bg-surface-muted/60 rounded-full border border-[var(--border-soft)] gap-1">
              {categories.map((category) => {
                const isActive = currentCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`relative px-5 py-2 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap border flex items-center gap-1.5 ${isActive
                      ? "bg-surface text-foreground shadow-sm border-[var(--border-soft)] font-semibold"
                      : "text-text-secondary hover:text-foreground hover:bg-surface/50 border-transparent"
                      }`}
                  >
                    <span>{category.name}</span>
                    {category.publishState !== "ACTIVE" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Inactive in this branch" />
                    )}
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-muted text-text-muted">
                      {category.services.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Header & Actions */}
          {activeCategory && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-surface p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{activeCategory.name}</h3>
                  {activeCategory.name !== activeCategory.baseName && (
                    <span className="text-xs text-text-muted">(Base: {activeCategory.baseName})</span>
                  )}
                  <Badge tone={activeCategory.publishState === "ACTIVE" ? "success" : "muted"} className="text-xs">
                    {activeCategory.publishState}
                  </Badge>
                </div>
                {activeCategory.description && (
                  <p className="text-xs text-text-muted line-clamp-1">{activeCategory.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingCategory(activeCategory)}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit Category
                </Button>

                <DeleteBranchConfirmDialog
                  title={`Remove "${activeCategory.name}" from Branch?`}
                  description="This will remove this category and all its services from this branch only. The Base Catalog remains 100% untouched."
                  onConfirm={() => handleRemoveEntity("CATEGORY", activeCategory.id, activeCategory.name)}
                >
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove from Branch
                  </Button>
                </DeleteBranchConfirmDialog>
              </div>
            </div>
          )}

          {/* Services under Active Category */}
          {activeCategory && activeCategory.services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] p-8 text-center text-sm text-text-muted">
              No services active in this category for this branch. Click &quot;Pick from Base Catalog&quot; to add services.
            </div>
          ) : (
            <div className="space-y-4">
              {activeCategory?.services.map((service) => (
                <ServiceBranchCard
                  key={service.id}
                  service={service}
                  branchId={branchId}
                  config={config}
                  onEditService={() => setEditingService(service)}
                  onRemoveService={() => handleRemoveEntity("SERVICE", service.id, service.name)}
                  onRemoveItem={(item) => handleRemoveEntity("ITEM", item.id, item.name)}
                  onRemoveAddOn={(addon) => handleRemoveEntity("ADDON", addon.id, addon.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pick from Base Modal */}
      {isPickBaseOpen && (
        <PickFromBaseModal
          isOpen={isPickBaseOpen}
          onClose={() => setIsPickBaseOpen(false)}
          baseCatalog={normalizedBaseCatalog}
          branchConfig={config}
          branches={branches}
          currentBranchId={branchId}
          currentBranchName={branchName}
          onPick={async (selection, targetBranchIds) => {
            try {
              await Promise.all(
                targetBranchIds.map((bId) =>
                  pickFromBase.mutateAsync({ branchId: bId, selection })
                )
              );
              queryClient.invalidateQueries({ queryKey: ["branch-catalog"] });
              queryClient.invalidateQueries({ queryKey: ["services"] });
              toast.success(
                targetBranchIds.length === 1
                  ? "Selected offerings successfully added to branch!"
                  : `Selected offerings successfully added to ${targetBranchIds.length} branches!`
              );
              setIsPickBaseOpen(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to add offerings to branch(es)");
            }
          }}
          isSubmitting={pickFromBase.isPending}
        />
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          isOpen={Boolean(editingService)}
          onClose={() => setEditingService(null)}
          onSave={handleSaveServiceOverride}
          isSubmitting={saveCatalog.isPending}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          isOpen={Boolean(editingCategory)}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveCategoryOverride}
          isSubmitting={saveCatalog.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service Card with Items and Add-ons
// ---------------------------------------------------------------------------

function ServiceBranchCard({
  service,
  branchId,
  config,
  onEditService,
  onRemoveService,
  onRemoveItem,
  onRemoveAddOn,
}: {
  service: BranchCatalogResolvedService;
  branchId: string;
  config: any;
  onEditService: () => void;
  onRemoveService: () => void;
  onRemoveItem: (item: BranchCatalogResolvedItem) => void;
  onRemoveAddOn: (addon: BranchCatalogResolvedAddOn) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const saveCatalog = useSaveBranchCatalog();

  const handlePriceUpdate = async (targetType: "ITEM" | "ADDON", targetId: string, newPrice: number) => {
    try {
      const currentOverrides = config.overrides || {};
      if (targetType === "ITEM") {
        const itemOverrides = { ...(currentOverrides.items || {}) };
        itemOverrides[targetId] = {
          ...(itemOverrides[targetId] || {}),
          price: newPrice,
        };
        await saveCatalog.mutateAsync({
          branchId,
          config: {
            ...config,
            overrides: {
              ...currentOverrides,
              items: itemOverrides,
            },
          },
        });
      } else {
        const addonOverrides = { ...(currentOverrides.addons || {}) };
        addonOverrides[targetId] = {
          ...(addonOverrides[targetId] || {}),
          price: newPrice,
        };
        await saveCatalog.mutateAsync({
          branchId,
          config: {
            ...config,
            overrides: {
              ...currentOverrides,
              addons: addonOverrides,
            },
          },
        });
      }
      toast.success("Branch price updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update price");
    }
  };

  const handlePublishStateToggle = async (
    targetType: "ITEM" | "ADDON",
    targetId: string,
    currentState: PublishState,
  ) => {
    const nextState: PublishState = currentState === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const currentOverrides = config.overrides || {};
      if (targetType === "ITEM") {
        const itemOverrides = { ...(currentOverrides.items || {}) };
        itemOverrides[targetId] = {
          ...(itemOverrides[targetId] || {}),
          publishState: nextState,
        };
        await saveCatalog.mutateAsync({
          branchId,
          config: {
            ...config,
            overrides: {
              ...currentOverrides,
              items: itemOverrides,
            },
          },
        });
      } else {
        const addonOverrides = { ...(currentOverrides.addons || {}) };
        addonOverrides[targetId] = {
          ...(addonOverrides[targetId] || {}),
          publishState: nextState,
        };
        await saveCatalog.mutateAsync({
          branchId,
          config: {
            ...config,
            overrides: {
              ...currentOverrides,
              addons: addonOverrides,
            },
          },
        });
      }
      toast.success(`Set to ${nextState} for this branch!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  return (
    <div className="border border-[var(--border-soft)] rounded-2xl bg-surface overflow-hidden shadow-sm transition-all">
      <div className="w-full flex items-center justify-between p-3.5 bg-surface hover:bg-surface-muted/40 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 text-left flex-1"
        >
          <span className="text-text-muted">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <LayoutList className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{service.name}</span>
              {service.name !== service.baseName && (
                <span className="text-xs text-text-muted font-normal">(Base: {service.baseName})</span>
              )}
              <Badge tone={service.publishState === "ACTIVE" ? "success" : "muted"} className="text-[10px]">
                {service.publishState}
              </Badge>
              {service.arrivalSlaMinutes && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  title="Estimated arrival promise time for customer orders in this branch"
                >
                  <Clock className="h-3 w-3" /> {formatPromiseTime(service.arrivalSlaMinutes)} Arrival Promise
                </span>
              )}
            </div>
            {service.shortDescription && (
              <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{service.shortDescription}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditService}
            className="h-8 px-2.5 text-xs text-text-secondary hover:text-foreground"
            title="Edit service details for this branch"
          >
            <Edit2 className="h-3 w-3 mr-1" /> Edit Promise Time & Details
          </Button>

          <DeleteBranchConfirmDialog
            title={`Remove "${service.name}" from Branch?`}
            description="This will remove this service from this branch's offerings. The Base Catalog remains unaffected."
            onConfirm={onRemoveService}
          >
            <button
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Remove service from this branch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DeleteBranchConfirmDialog>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-[var(--border-soft)] bg-background/50 space-y-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Items Column */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Items ({service.items.length})
                </h4>
              </div>

              {service.items.length === 0 ? (
                <p className="text-xs text-text-muted italic py-2">No items enabled for this branch.</p>
              ) : (
                <div className="space-y-2">
                  {service.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-[var(--border-soft)] hover:border-border transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <button
                          onClick={() => handlePublishStateToggle("ITEM", item.id, item.publishState)}
                          className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${item.publishState === "ACTIVE"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-300 hover:bg-gray-400"
                            }`}
                          title={`Click to toggle status (${item.publishState})`}
                        />
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        {item.unitLabel && (
                          <span className="text-[10px] text-text-muted shrink-0">({item.unitLabel})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <InlinePriceEditor
                          basePrice={item.basePrice}
                          currentPrice={item.price}
                          onSave={(p) => handlePriceUpdate("ITEM", item.id, p)}
                        />

                        <DeleteBranchConfirmDialog
                          title={`Remove "${item.name}" from Branch?`}
                          description="This item will no longer appear in this branch. The Base Catalog item is unaffected."
                          onConfirm={() => onRemoveItem(item)}
                        >
                          <button
                            className="p-1 text-text-muted hover:text-red-500 transition-colors rounded"
                            title="Remove from branch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </DeleteBranchConfirmDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons Column */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Tags className="h-3.5 w-3.5" /> Add-ons ({service.addOns.length})
                </h4>
              </div>

              {service.addOns.length === 0 ? (
                <p className="text-xs text-text-muted italic py-2">No add-ons enabled for this branch.</p>
              ) : (
                <div className="space-y-2">
                  {service.addOns.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-[var(--border-soft)] hover:border-border transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <button
                          onClick={() => handlePublishStateToggle("ADDON", addon.id, addon.publishState)}
                          className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${addon.publishState === "ACTIVE"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-300 hover:bg-gray-400"
                            }`}
                          title={`Click to toggle status (${addon.publishState})`}
                        />
                        <span className="font-medium text-foreground truncate">{addon.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <InlinePriceEditor
                          basePrice={addon.basePrice}
                          currentPrice={addon.price}
                          onSave={(p) => handlePriceUpdate("ADDON", addon.id, p)}
                        />

                        <DeleteBranchConfirmDialog
                          title={`Remove "${addon.name}" from Branch?`}
                          description="This add-on will no longer appear in this branch. Base catalog remains untouched."
                          onConfirm={() => onRemoveAddOn(addon)}
                        >
                          <button
                            className="p-1 text-text-muted hover:text-red-500 transition-colors rounded"
                            title="Remove from branch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </DeleteBranchConfirmDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Price Editor
// ---------------------------------------------------------------------------

function InlinePriceEditor({
  basePrice,
  currentPrice,
  onSave,
}: {
  basePrice: number;
  currentPrice: number;
  onSave: (val: number) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [priceStr, setPriceStr] = useState(String(currentPrice));
  const [isPending, setIsPending] = useState(false);

  const isOverridden = currentPrice !== basePrice;

  const handleCommit = async () => {
    const num = Number(priceStr);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    setIsPending(true);
    try {
      await onSave(num);
      setIsEditing(false);
    } finally {
      setIsPending(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`font-mono px-2 py-0.5 rounded text-xs font-semibold ${isOverridden
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-surface-muted text-foreground"
            }`}
          title={isOverridden ? `Overridden (Base: ₹${basePrice})` : `Base Price: ₹${basePrice}`}
        >
          ₹{currentPrice}
        </span>
        {isOverridden && (
          <span className="text-[10px] text-text-muted line-through">₹{basePrice}</span>
        )}
        <button
          type="button"
          onClick={() => {
            setPriceStr(String(currentPrice));
            setIsEditing(true);
          }}
          className="p-1 text-text-muted hover:text-foreground rounded transition-colors"
          title="Edit price for this branch"
        >
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
        value={priceStr}
        onChange={(e) => setPriceStr(e.target.value)}
        className="w-16 px-1.5 py-0.5 text-xs font-mono border border-primary rounded bg-surface focus:outline-none"
        autoFocus
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommit();
          if (e.key === "Escape") {
            setIsEditing(false);
            setPriceStr(String(currentPrice));
          }
        }}
      />
      <button
        onClick={handleCommit}
        disabled={isPending}
        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
        title="Save price"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => {
          setIsEditing(false);
          setPriceStr(String(currentPrice));
        }}
        disabled={isPending}
        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
        title="Cancel"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pick from Base Catalog Modal
// ---------------------------------------------------------------------------

function PickFromBaseModal({
  isOpen,
  onClose,
  baseCatalog,
  branchConfig,
  branches,
  currentBranchId,
  currentBranchName,
  onPick,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  baseCatalog: CategorySummary[];
  branchConfig: any;
  branches: BranchAdminResponse[];
  currentBranchId: string;
  currentBranchName?: string;
  onPick: (
    selection: {
      categoryIds?: string[];
      serviceIds?: string[];
      itemIds?: string[];
      addOnIds?: string[];
    },
    targetBranchIds: string[],
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyUnadded, setOnlyUnadded] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedSvcs, setSelectedSvcs] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  // Collapsible tree state: start with categories expanded, services collapsed by default
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(baseCatalog.map((c) => c.id))
  );
  const [expandedSvcs, setExpandedSvcs] = useState<Set<string>>(new Set());

  // Target branches mode: "current" | "all" | "custom"
  const [targetMode, setTargetMode] = useState<"current" | "all" | "custom">("current");
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(
    () => new Set([currentBranchId])
  );

  const effectiveTargetBranchIds = useMemo(() => {
    if (targetMode === "current") return [currentBranchId];
    if (targetMode === "all") return branches.map((b) => b.id);
    return Array.from(selectedBranchIds);
  }, [targetMode, currentBranchId, branches, selectedBranchIds]);

  const toggleBranchSelection = (bId: string) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(bId)) {
        if (next.size > 1) next.delete(bId);
      } else {
        next.add(bId);
      }
      return next;
    });
  };

  // Existing branch sets for current branch reference
  const existingCatSet = useMemo(() => new Set(branchConfig?.categoryIds || []), [branchConfig]);
  const existingSvcSet = useMemo(() => new Set(branchConfig?.serviceIds || []), [branchConfig]);
  const existingItemSet = useMemo(() => new Set(branchConfig?.itemIds || []), [branchConfig]);
  const existingAddOnSet = useMemo(() => new Set(branchConfig?.addOnIds || []), [branchConfig]);

  const toggleExpandCat = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleExpandSvc = (svcId: string) => {
    setExpandedSvcs((prev) => {
      const next = new Set(prev);
      if (next.has(svcId)) next.delete(svcId);
      else next.add(svcId);
      return next;
    });
  };

  const expandAll = () => {
    const allCatIds = new Set(baseCatalog.map((c) => c.id));
    const allSvcIds = new Set<string>();
    for (const c of baseCatalog) {
      for (const s of c.services || []) {
        allSvcIds.add(s.id);
      }
    }
    setExpandedCats(allCatIds);
    setExpandedSvcs(allSvcIds);
  };

  const collapseAll = () => {
    setExpandedCats(new Set());
    setExpandedSvcs(new Set());
  };

  // Filter catalog by search term and "only unadded" toggle
  const filteredCatalog = useMemo(() => {
    let result = baseCatalog;

    if (onlyUnadded) {
      result = result
        .map((cat) => {
          const unaddedServices = (cat.services || [])
            .map((svc) => {
              const rawItems = svc.items || (svc as any).variants || [];
              const rawAddOns = svc.addOns || [];
              const items = rawItems.filter((i: any) => !existingItemSet.has(i.id));
              const addOns = rawAddOns.filter((a: any) => !existingAddOnSet.has(a.id));
              const isSvcUnadded = !existingSvcSet.has(svc.id);
              if (isSvcUnadded || items.length > 0 || addOns.length > 0) {
                return { ...svc, items, addOns };
              }
              return null;
            })
            .filter(Boolean) as any[];

          const isCatUnadded = !existingCatSet.has(cat.id);
          if (isCatUnadded || unaddedServices.length > 0) {
            return { ...cat, services: unaddedServices };
          }
          return null;
        })
        .filter(Boolean) as CategorySummary[];
    }

    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();

    return result
      .map((c) => {
        const catMatches = c.name.toLowerCase().includes(term) || (c.code || "").toLowerCase().includes(term);
        const matchedServices = (c.services || [])
          .map((s) => {
            const items = s.items || (s as any).variants || [];
            const addOns = s.addOns || [];
            const svcMatches = s.name.toLowerCase().includes(term) || (s.code || "").toLowerCase().includes(term);
            const matchedItems = items.filter((i: any) => i.name.toLowerCase().includes(term));
            const matchedAddOns = addOns.filter((a: any) => a.name.toLowerCase().includes(term));

            if (catMatches || svcMatches || matchedItems.length > 0 || matchedAddOns.length > 0) {
              return {
                ...s,
                items: catMatches || svcMatches ? items : matchedItems,
                addOns: catMatches || svcMatches ? addOns : matchedAddOns,
              };
            }
            return null;
          })
          .filter(Boolean) as any[];

        if (catMatches || matchedServices.length > 0) {
          return {
            ...c,
            services: catMatches && matchedServices.length === 0 ? c.services : matchedServices,
          };
        }
        return null;
      })
      .filter(Boolean) as CategorySummary[];
  }, [baseCatalog, searchTerm, onlyUnadded, existingCatSet, existingSvcSet, existingItemSet, existingAddOnSet]);

  const toggleCategory = (cat: CategorySummary) => {
    const nextCats = new Set(selectedCats);
    const nextSvcs = new Set(selectedSvcs);
    const nextItems = new Set(selectedItems);
    const nextAddOns = new Set(selectedAddOns);

    if (nextCats.has(cat.id)) {
      nextCats.delete(cat.id);
      for (const s of cat.services || []) {
        nextSvcs.delete(s.id);
        const items = s.items || (s as any).variants || [];
        for (const i of items) nextItems.delete(i.id);
        for (const a of s.addOns || []) nextAddOns.delete(a.id);
      }
    } else {
      nextCats.add(cat.id);
      for (const s of cat.services || []) {
        nextSvcs.add(s.id);
        const items = s.items || (s as any).variants || [];
        for (const i of items) nextItems.add(i.id);
        for (const a of s.addOns || []) nextAddOns.add(a.id);
      }
    }

    setSelectedCats(nextCats);
    setSelectedSvcs(nextSvcs);
    setSelectedItems(nextItems);
    setSelectedAddOns(nextAddOns);
  };

  const toggleService = (catId: string, svc: any) => {
    const nextSvcs = new Set(selectedSvcs);
    const nextCats = new Set(selectedCats);
    const nextItems = new Set(selectedItems);
    const nextAddOns = new Set(selectedAddOns);

    const items = svc.items || svc.variants || [];
    const addOns = svc.addOns || [];

    if (nextSvcs.has(svc.id)) {
      nextSvcs.delete(svc.id);
      for (const i of items) nextItems.delete(i.id);
      for (const a of addOns) nextAddOns.delete(a.id);
    } else {
      nextSvcs.add(svc.id);
      nextCats.add(catId);
      for (const i of items) nextItems.add(i.id);
      for (const a of addOns) nextAddOns.add(a.id);
    }

    setSelectedCats(nextCats);
    setSelectedSvcs(nextSvcs);
    setSelectedItems(nextItems);
    setSelectedAddOns(nextAddOns);
  };

  const toggleItem = (catId: string, svcId: string, itemId: string) => {
    const nextItems = new Set(selectedItems);
    const nextCats = new Set(selectedCats);
    const nextSvcs = new Set(selectedSvcs);

    if (nextItems.has(itemId)) {
      nextItems.delete(itemId);
    } else {
      nextItems.add(itemId);
      nextCats.add(catId);
      nextSvcs.add(svcId);
    }

    setSelectedCats(nextCats);
    setSelectedSvcs(nextSvcs);
    setSelectedItems(nextItems);
  };

  const toggleAddOn = (catId: string, svcId: string, addOnId: string) => {
    const nextAddOns = new Set(selectedAddOns);
    const nextCats = new Set(selectedCats);
    const nextSvcs = new Set(selectedSvcs);

    if (nextAddOns.has(addOnId)) {
      nextAddOns.delete(addOnId);
    } else {
      nextAddOns.add(addOnId);
      nextCats.add(catId);
      nextSvcs.add(svcId);
    }

    setSelectedCats(nextCats);
    setSelectedSvcs(nextSvcs);
    setSelectedAddOns(nextAddOns);
  };

  const handleSelectAll = () => {
    const nextCats = new Set<string>();
    const nextSvcs = new Set<string>();
    const nextItems = new Set<string>();
    const nextAddOns = new Set<string>();

    for (const c of baseCatalog) {
      nextCats.add(c.id);
      for (const s of c.services || []) {
        nextSvcs.add(s.id);
        const items = s.items || (s as any).variants || [];
        for (const i of items) nextItems.add(i.id);
        for (const a of s.addOns || []) nextAddOns.add(a.id);
      }
    }

    setSelectedCats(nextCats);
    setSelectedSvcs(nextSvcs);
    setSelectedItems(nextItems);
    setSelectedAddOns(nextAddOns);
  };

  const handleClear = () => {
    setSelectedCats(new Set());
    setSelectedSvcs(new Set());
    setSelectedItems(new Set());
    setSelectedAddOns(new Set());
  };

  const totalSelected = selectedCats.size + selectedSvcs.size + selectedItems.size + selectedAddOns.size;

  const catalogStats = useMemo(() => {
    let services = 0;
    let items = 0;
    let addOns = 0;
    for (const c of baseCatalog) {
      services += c.services?.length || 0;
      for (const s of c.services || []) {
        items += (s.items || (s as any).variants || []).length;
        addOns += (s.addOns || []).length;
      }
    }
    return { categories: baseCatalog.length, services, items, addOns };
  }, [baseCatalog]);

  const targetSummaryShort = useMemo(() => {
    if (targetMode === "current") return currentBranchName || "Current Branch";
    if (targetMode === "all") return "All Branches";
    return `${effectiveTargetBranchIds.length} Branch${effectiveTargetBranchIds.length === 1 ? "" : "es"}`;
  }, [targetMode, currentBranchName, effectiveTargetBranchIds.length]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Pick from Base Catalog"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Top Summary & Search Toolbar */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search categories, services, items, add-ons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-foreground"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant={onlyUnadded ? "primary" : "secondary"}
                size="sm"
                onClick={() => setOnlyUnadded(!onlyUnadded)}
                className="text-xs h-8 gap-1"
                title="Toggle showing only unadded offerings"
              >
                <Filter className="w-3.5 h-3.5" />
                {onlyUnadded ? "Unadded Only" : "All Offerings"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={expandedSvcs.size > 0 ? collapseAll : expandAll}
                className="text-xs h-8"
              >
                {expandedSvcs.size > 0 ? "Collapse All" : "Expand All"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-8"
              >
                Select All
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs h-8 text-text-muted hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
            <span>
              Base Catalog: <strong className="text-foreground">{catalogStats.categories}</strong> categories ·{" "}
              <strong className="text-foreground">{catalogStats.services}</strong> services ·{" "}
              <strong className="text-foreground">{catalogStats.items}</strong> items ·{" "}
              <strong className="text-foreground">{catalogStats.addOns}</strong> add-ons
            </span>
            {filteredCatalog.length !== baseCatalog.length && (
              <span className="text-primary font-medium">Filtered: {filteredCatalog.length} categories shown</span>
            )}
          </div>
        </div>

        {/* Tree List */}
        <div className="max-h-[46vh] overflow-y-auto pr-1 space-y-3 rounded-xl">
          {filteredCatalog.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted bg-surface-muted/30 rounded-xl border border-[var(--border-soft)]">
              No categories, services, or items matched your criteria.
            </div>
          ) : (
            filteredCatalog.map((cat) => {
              const isCatExisting = existingCatSet.has(cat.id);
              const isCatSelected = selectedCats.has(cat.id);
              const isCatExpanded = expandedCats.has(cat.id);

              const catServices = cat.services || [];
              const catItemCount = catServices.reduce(
                (acc, s) => acc + (s.items || (s as any).variants || []).length,
                0
              );
              const catAddOnCount = catServices.reduce(
                (acc, s) => acc + (s.addOns || []).length,
                0
              );

              return (
                <div
                  key={cat.id}
                  className="border border-[var(--border-soft)] rounded-xl bg-surface overflow-hidden transition-shadow shadow-sm"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 bg-surface-muted/50 border-b border-[var(--border-soft)] select-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandCat(cat.id)}
                        className="p-1 rounded-md text-text-muted hover:text-foreground hover:bg-surface transition-colors"
                        title={isCatExpanded ? "Collapse category" : "Expand category"}
                      >
                        {isCatExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={isCatSelected}
                          onChange={() => toggleCategory(cat)}
                          className="rounded text-primary focus:ring-primary h-4 w-4 border-gray-300"
                        />
                        <span className="font-semibold text-sm text-foreground truncate">{cat.name}</span>
                        {cat.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-[var(--border-soft)] text-text-muted hidden sm:inline">
                            {cat.code}
                          </span>
                        )}
                        {isCatExisting && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-medium">
                            In Branch
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs text-text-muted">
                      <span>
                        {catServices.length} svc · {catItemCount} items
                        {catAddOnCount > 0 ? ` · ${catAddOnCount} addons` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Services under Category */}
                  {isCatExpanded && (
                    <div className="p-3 space-y-3">
                      {catServices.length === 0 ? (
                        <p className="text-xs text-text-muted italic ml-4">No services in this category.</p>
                      ) : (
                        catServices.map((svc) => {
                          const isSvcExisting = existingSvcSet.has(svc.id);
                          const isSvcSelected = selectedSvcs.has(svc.id);
                          const isSvcExpanded = expandedSvcs.has(svc.id);

                          const items = svc.items || (svc as any).variants || [];
                          const addOns = svc.addOns || [];

                          return (
                            <div
                              key={svc.id}
                              className="ml-2 sm:ml-4 pl-3 border-l-2 border-primary/20 space-y-2 py-0.5"
                            >
                              {/* Service Row */}
                              <div className="flex items-center justify-between select-none">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSvc(svc.id)}
                                    className="p-0.5 rounded text-text-muted hover:text-foreground transition-colors"
                                    title={isSvcExpanded ? "Collapse service details" : "Expand service details"}
                                  >
                                    {isSvcExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </button>

                                  <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSvcSelected}
                                      onChange={() => toggleService(cat.id, svc)}
                                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5 border-gray-300"
                                    />
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {svc.name}
                                    </span>
                                    {isSvcExisting && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-medium">
                                        In Branch
                                      </span>
                                    )}
                                  </label>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-text-muted shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSvc(svc.id)}
                                    className="hover:text-primary transition underline decoration-dotted"
                                  >
                                    {items.length} item{items.length === 1 ? "" : "s"}
                                    {addOns.length > 0 ? ` · ${addOns.length} addon${addOns.length === 1 ? "" : "s"}` : ""}
                                  </button>
                                </div>
                              </div>

                              {/* Items & Add-ons under Service */}
                              {isSvcExpanded && (
                                <div className="ml-5 space-y-2 pt-1 pb-1">
                                  {/* Items / Variants */}
                                  {items.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                        Items ({items.length})
                                      </span>
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {items.map((item: any) => {
                                          const isItemExisting = existingItemSet.has(item.id);
                                          const isItemSelected = selectedItems.has(item.id);

                                          return (
                                            <label
                                              key={item.id}
                                              className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer select-none flex items-center gap-1.5 transition-all ${isItemSelected
                                                ? "bg-primary text-white border-primary shadow-sm"
                                                : isItemExisting
                                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                                  : "bg-surface-muted text-foreground border-[var(--border-soft)] hover:border-primary/50"
                                                }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isItemSelected}
                                                onChange={() => toggleItem(cat.id, svc.id, item.id)}
                                                className="hidden"
                                              />
                                              {isItemSelected ? (
                                                <CheckSquare className="w-3 h-3 text-white shrink-0" />
                                              ) : (
                                                <Square className="w-3 h-3 text-text-muted shrink-0" />
                                              )}
                                              <span className="font-medium">{item.name}</span>
                                              <span className="opacity-80 font-mono text-[10px]">
                                                ₹{String(item.price ?? item.basePrice ?? 0)}
                                                {item.unitLabel ? `/${item.unitLabel}` : ""}
                                              </span>
                                              {isItemExisting && !isItemSelected && (
                                                <span className="text-[9px] opacity-75 font-normal">
                                                  (In Branch)
                                                </span>
                                              )}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Add-Ons */}
                                  {addOns.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                        Add-Ons ({addOns.length})
                                      </span>
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {addOns.map((addon: any) => {
                                          const isAddOnExisting = existingAddOnSet.has(addon.id);
                                          const isAddOnSelected = selectedAddOns.has(addon.id);

                                          return (
                                            <label
                                              key={addon.id}
                                              className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer select-none flex items-center gap-1.5 transition-all ${isAddOnSelected
                                                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                : isAddOnExisting
                                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                                  : "bg-surface-muted text-foreground border-[var(--border-soft)] hover:border-amber-500/50"
                                                }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isAddOnSelected}
                                                onChange={() => toggleAddOn(cat.id, svc.id, addon.id)}
                                                className="hidden"
                                              />
                                              {isAddOnSelected ? (
                                                <CheckSquare className="w-3 h-3 text-white shrink-0" />
                                              ) : (
                                                <Square className="w-3 h-3 text-text-muted shrink-0" />
                                              )}
                                              <span className="font-medium">{addon.name}</span>
                                              <span className="opacity-80 font-mono text-[10px]">
                                                +₹{String(addon.price ?? 0)}
                                              </span>
                                              {isAddOnExisting && !isAddOnSelected && (
                                                <span className="text-[9px] opacity-75 font-normal">
                                                  (In Branch)
                                                </span>
                                              )}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
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
            })
          )}
        </div>

        {/* Target Branches Selector Box */}
        <div className="p-3.5 rounded-xl border border-[var(--border-soft)] bg-surface-muted/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Apply Selected Offerings To:
              </span>
            </div>
            <span className="text-[11px] text-text-muted font-medium">
              Target: <strong className="text-foreground">{targetSummaryShort}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTargetMode("current")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${targetMode === "current"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface text-text-secondary border-[var(--border-soft)] hover:border-primary/50"
                }`}
            >
              Current Branch ({currentBranchName || "This Branch"})
            </button>

            {branches.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setTargetMode("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${targetMode === "all"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface text-text-secondary border-[var(--border-soft)] hover:border-primary/50"
                    }`}
                >
                  All Branches ({branches.length})
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode("custom")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${targetMode === "custom"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface text-text-secondary border-[var(--border-soft)] hover:border-primary/50"
                    }`}
                >
                  Specific Branches ({effectiveTargetBranchIds.length})
                </button>
              </>
            )}
          </div>

          {/* If Specific Branches chosen, render checkboxes */}
          {targetMode === "custom" && branches.length > 0 && (
            <div className="pt-2 border-t border-[var(--border-soft)] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Select target branches:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBranchIds(new Set(branches.map((b) => b.id)))}
                    className="text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBranchIds(new Set([currentBranchId]))}
                    className="text-text-muted hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {branches.map((b) => {
                  const isChecked = selectedBranchIds.has(b.id);
                  const isCurrent = b.id === currentBranchId;

                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${isChecked
                        ? "bg-primary/10 border-primary text-foreground font-medium"
                        : "bg-surface border-[var(--border-soft)] text-text-secondary hover:border-text-muted"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBranchSelection(b.id)}
                        className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{b.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-surface border text-text-muted shrink-0">
                          Current
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-soft)]">
          <div className="space-y-0.5 text-xs text-text-muted">
            <p>
              <strong className="text-foreground">{totalSelected}</strong> offering
              {totalSelected === 1 ? "" : "s"} selected (
              {selectedCats.size} categories, {selectedSvcs.size} services, {selectedItems.size} items
              {selectedAddOns.size > 0 ? `, ${selectedAddOns.size} add-ons` : ""})
            </p>
            <p className="text-[11px] text-text-secondary">
              Will be added to: <strong className="text-foreground">{targetSummaryShort}</strong>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={totalSelected === 0 || effectiveTargetBranchIds.length === 0 || isSubmitting}
              onClick={() =>
                onPick(
                  {
                    categoryIds: Array.from(selectedCats),
                    serviceIds: Array.from(selectedSvcs),
                    itemIds: Array.from(selectedItems),
                    addOnIds: Array.from(selectedAddOns),
                  },
                  effectiveTargetBranchIds
                )
              }
            >
              {isSubmitting
                ? "Adding..."
                : `Add Selected (${totalSelected}) to ${targetSummaryShort}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Service Modal
// ---------------------------------------------------------------------------

function EditServiceModal({
  service,
  isOpen,
  onClose,
  onSave,
  isSubmitting,
}: {
  service: BranchCatalogResolvedService;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: {
    serviceId: string;
    name?: string;
    shortDescription?: string;
    arrivalSlaMinutes?: number;
    durationEstimateMinutes?: number;
    publishState?: PublishState;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(service.name);
  const [shortDescription, setShortDescription] = useState(service.shortDescription || "");
  const [arrivalSlaMinutes, setArrivalSlaMinutes] = useState(String(service.arrivalSlaMinutes || 120));
  const [durationEstimateMinutes, setDurationEstimateMinutes] = useState(
    String(service.durationEstimateMinutes || ""),
  );
  const [publishState, setPublishState] = useState<PublishState>(service.publishState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({
      serviceId: service.id,
      name: name.trim() !== service.baseName ? name.trim() : undefined,
      shortDescription: shortDescription.trim() || undefined,
      arrivalSlaMinutes: arrivalSlaMinutes ? parseInt(arrivalSlaMinutes, 10) : undefined,
      durationEstimateMinutes: durationEstimateMinutes ? parseInt(durationEstimateMinutes, 10) : undefined,
      publishState,
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Edit Service: ${service.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-medium text-foreground mb-1">
            Display Name in Branch <span className="text-text-muted">(Base: {service.baseName})</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
            placeholder={service.baseName}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-medium text-foreground">Estimated Customer Arrival Promise</label>
            {arrivalSlaMinutes && !isNaN(parseInt(arrivalSlaMinutes, 10)) && (
              <span className="text-[11px] font-semibold text-primary">
                ≈ {formatPromiseTime(parseInt(arrivalSlaMinutes, 10))}
              </span>
            )}
          </div>
          <input
            type="number"
            value={arrivalSlaMinutes}
            onChange={(e) => setArrivalSlaMinutes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
            placeholder="e.g. 120 (for 2 hours)"
          />
          <p className="text-[11px] text-text-muted mt-1">
            Expected arrival / pickup promise time communicated to customers in this branch (enter in minutes, e.g. 120 = 2 hours).
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-medium text-foreground">Service Duration Estimate</label>
            {durationEstimateMinutes && !isNaN(parseInt(durationEstimateMinutes, 10)) && (
              <span className="text-[11px] font-semibold text-primary">
                ≈ {formatPromiseTime(parseInt(durationEstimateMinutes, 10))}
              </span>
            )}
          </div>
          <input
            type="number"
            value={durationEstimateMinutes}
            onChange={(e) => setDurationEstimateMinutes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
            placeholder="e.g. 60 (for 1 hour)"
          />
          <p className="text-[11px] text-text-muted mt-1">
            Estimated turnaround / working time to complete this service.
          </p>
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1">Short Description</label>
          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1">Publish State in Branch</label>
          <select
            value={publishState}
            onChange={(e) => setPublishState(e.target.value as PublishState)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
          >
            <option value="ACTIVE">ACTIVE (Visible in branch)</option>
            <option value="INACTIVE">INACTIVE (Hidden in branch)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Branch Overrides"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Category Modal
// ---------------------------------------------------------------------------

function EditCategoryModal({
  category,
  isOpen,
  onClose,
  onSave,
  isSubmitting,
}: {
  category: BranchCatalogResolvedCategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: {
    categoryId: string;
    name?: string;
    description?: string;
    publishState?: PublishState;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [publishState, setPublishState] = useState<PublishState>(category.publishState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({
      categoryId: category.id,
      name: name.trim() !== category.baseName ? name.trim() : undefined,
      description: description.trim() || undefined,
      publishState,
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Edit Category: ${category.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-medium text-foreground mb-1">
            Display Name in Branch <span className="text-text-muted">(Base: {category.baseName})</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
            placeholder={category.baseName}
          />
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1">Publish State in Branch</label>
          <select
            value={publishState}
            onChange={(e) => setPublishState(e.target.value as PublishState)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary text-xs"
          >
            <option value="ACTIVE">ACTIVE (Visible in branch)</option>
            <option value="INACTIVE">INACTIVE (Hidden in branch)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Alert Dialog
// ---------------------------------------------------------------------------

function DeleteBranchConfirmDialog({
  title,
  description,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <span className="flex items-center gap-2 text-foreground font-semibold text-base">
              <AlertCircle className="h-5 w-5 text-red-600" />
              {title}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Remove from Branch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
