"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  useBranchCatalog,
  useSaveBranchCatalog,
  usePickFromBase,
  useImportAllBaseToBranch,
  useRemoveBranchEntity,
} from "../api/catalog-api";
import type {
  BranchCatalogResolvedCategory,
  BranchCatalogResolvedService,
  BranchCatalogResolvedItem,
  BranchCatalogResolvedAddOn,
  CategorySummary,
  PublishState,
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
  const { data, isLoading, error } = useBranchCatalog(branchId);
  const saveCatalog = useSaveBranchCatalog();
  const pickFromBase = usePickFromBase();
  const importAll = useImportAllBaseToBranch();
  const removeEntity = useRemoveBranchEntity();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isPickBaseOpen, setIsPickBaseOpen] = useState(false);

  // Edit modals state
  const [editingService, setEditingService] = useState<BranchCatalogResolvedService | null>(null);
  const [editingCategory, setEditingCategory] = useState<BranchCatalogResolvedCategory | null>(null);

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

          <div className="bg-surface-muted/40 rounded-xl p-3 border border-[var(--border-soft)] flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-text-muted leading-tight">
              Director changes here are branch-isolated.
            </span>
          </div>
        </div>
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
          baseCatalog={baseCatalog}
          branchConfig={config}
          onPick={async (selection) => {
            try {
              await pickFromBase.mutateAsync({ branchId, selection });
              toast.success("Selected offerings successfully added to this branch!");
              setIsPickBaseOpen(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to add offerings");
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
  onPick,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  baseCatalog: CategorySummary[];
  branchConfig: any;
  onPick: (selection: {
    categoryIds?: string[];
    serviceIds?: string[];
    itemIds?: string[];
    addOnIds?: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedSvcs, setSelectedSvcs] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  // Existing branch sets
  const existingCatSet = useMemo(() => new Set(branchConfig?.categoryIds || []), [branchConfig]);
  const existingSvcSet = useMemo(() => new Set(branchConfig?.serviceIds || []), [branchConfig]);
  const existingItemSet = useMemo(() => new Set(branchConfig?.itemIds || []), [branchConfig]);
  const existingAddOnSet = useMemo(() => new Set(branchConfig?.addOnIds || []), [branchConfig]);

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return baseCatalog;
    const term = searchTerm.toLowerCase();
    return baseCatalog.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.services?.some(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.items?.some((i) => i.name.toLowerCase().includes(term)),
        ),
    );
  }, [baseCatalog, searchTerm]);

  const toggleCategory = (cat: CategorySummary) => {
    const nextCats = new Set(selectedCats);
    const nextSvcs = new Set(selectedSvcs);
    const nextItems = new Set(selectedItems);
    const nextAddOns = new Set(selectedAddOns);

    if (nextCats.has(cat.id)) {
      nextCats.delete(cat.id);
      for (const s of cat.services || []) {
        nextSvcs.delete(s.id);
        for (const i of s.items || []) nextItems.delete(i.id);
        for (const a of s.addOns || []) nextAddOns.delete(a.id);
      }
    } else {
      nextCats.add(cat.id);
      for (const s of cat.services || []) {
        nextSvcs.add(s.id);
        for (const i of s.items || []) nextItems.add(i.id);
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

    if (nextSvcs.has(svc.id)) {
      nextSvcs.delete(svc.id);
      for (const i of svc.items || []) nextItems.delete(i.id);
      for (const a of svc.addOns || []) nextAddOns.delete(a.id);
    } else {
      nextSvcs.add(svc.id);
      nextCats.add(catId);
      for (const i of svc.items || []) nextItems.add(i.id);
      for (const a of svc.addOns || []) nextAddOns.add(a.id);
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

  const handleSelectAll = () => {
    const nextCats = new Set<string>();
    const nextSvcs = new Set<string>();
    const nextItems = new Set<string>();
    const nextAddOns = new Set<string>();

    for (const c of baseCatalog) {
      nextCats.add(c.id);
      for (const s of c.services || []) {
        nextSvcs.add(s.id);
        for (const i of s.items || []) nextItems.add(i.id);
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

  const totalSelected = selectedCats.size + selectedSvcs.size + selectedItems.size;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Pick from Base Catalog"
    >
      <div className="space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search base categories, services, items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-soft)] bg-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll} className="text-xs h-8">
              Select All
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-xs h-8">
              Clear
            </Button>
          </div>
        </div>

        {/* Tree List */}
        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
          {filteredCatalog.map((cat) => {
            const isCatExisting = existingCatSet.has(cat.id);
            const isCatSelected = selectedCats.has(cat.id);

            return (
              <div key={cat.id} className="border border-[var(--border-soft)] rounded-xl bg-surface overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-surface-muted/30 border-b border-[var(--border-soft)]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCatSelected}
                      onChange={() => toggleCategory(cat)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="font-semibold text-sm text-foreground">{cat.name}</span>
                    {isCatExisting && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                        In Branch
                      </span>
                    )}
                  </label>
                  <span className="text-xs text-text-muted">{cat.services?.length || 0} services</span>
                </div>

                <div className="p-3 space-y-3">
                  {cat.services?.map((svc) => {
                    const isSvcExisting = existingSvcSet.has(svc.id);
                    const isSvcSelected = selectedSvcs.has(svc.id);

                    return (
                      <div key={svc.id} className="ml-4 pl-3 border-l-2 border-primary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSvcSelected}
                              onChange={() => toggleService(cat.id, svc)}
                              className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="text-xs font-semibold text-foreground">{svc.name}</span>
                            {isSvcExisting && (
                              <span className="text-[9px] px-1 rounded bg-green-50 text-green-700">In Branch</span>
                            )}
                          </label>
                          <span className="text-[11px] text-text-muted">{svc.items?.length || 0} items</span>
                        </div>

                        {/* Items under service */}
                        <div className="ml-5 flex flex-wrap gap-2 pt-1">
                          {svc.items?.map((item) => {
                            const isItemExisting = existingItemSet.has(item.id);
                            const isItemSelected = selectedItems.has(item.id);

                            return (
                              <label
                                key={item.id}
                                className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer select-none flex items-center gap-1.5 transition-colors ${isItemSelected
                                  ? "bg-primary text-white border-primary"
                                  : isItemExisting
                                    ? "bg-green-50 text-green-800 border-green-200"
                                    : "bg-surface-muted text-text-secondary border-[var(--border-soft)] hover:border-text-muted"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isItemSelected}
                                  onChange={() => toggleItem(cat.id, svc.id, item.id)}
                                  className="hidden"
                                />
                                {item.name}
                                <span className="font-mono opacity-80">₹{String(item.price)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
          <span className="text-xs text-text-muted font-medium">
            {totalSelected} new element{totalSelected === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={totalSelected === 0 || isSubmitting}
              onClick={() =>
                onPick({
                  categoryIds: Array.from(selectedCats),
                  serviceIds: Array.from(selectedSvcs),
                  itemIds: Array.from(selectedItems),
                  addOnIds: Array.from(selectedAddOns),
                })
              }
            >
              {isSubmitting ? "Adding..." : `Add Selected to Branch (${totalSelected})`}
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
