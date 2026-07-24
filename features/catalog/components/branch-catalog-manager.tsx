"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Tags, Package, LayoutList, Edit2, Check, X as XIcon } from "lucide-react";
import { useItems, useAddOns, useCategories } from "../api/catalog-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import type { CatalogServiceSummary, GeoOverrideResponse } from "@/lib/types";

export function BranchCatalogManager({ branchId }: { branchId: string }) {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ["geo-overrides", branchId],
    queryFn: () => apiRequest<GeoOverrideResponse[]>({ path: "/admin/geo-overrides" }),
  });
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const isLoading = categoriesLoading || overridesLoading;

  if (isLoading) return <div className="text-sm text-text-muted p-4">Loading catalog...</div>;

  const currentCategoryId = activeCategoryId || (categories.length > 0 ? categories[0].id : null);
  const activeCategory = categories.find(c => c.id === currentCategoryId);
  const filteredServices = activeCategory?.services || [];

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <div className="flex w-full overflow-x-auto scrollbar-hide mb-6">
          <div className="inline-flex items-center p-1.5 bg-surface-muted/50 rounded-full border border-[var(--border-soft)]">
            {categories.map(category => {
              const isActive = currentCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`relative px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ease-out whitespace-nowrap border ${isActive
                    ? "bg-surface text-foreground shadow-sm border-[var(--border-soft)]"
                    : "text-text-secondary hover:text-foreground hover:bg-surface/50 border-transparent"
                    }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filteredServices.length === 0 ? (
        <div className="text-sm text-text-muted italic">No services found in this category.</div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map(service => (
            <ServiceBranchNode key={service.id} service={service} branchId={branchId} overrides={overrides} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceBranchNode({ service, branchId, overrides }: { service: CatalogServiceSummary, branchId: string, overrides: GeoOverrideResponse[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // We fetch items and addons but ONLY if expanded to save requests
  const { data: items = [], isLoading: itemsLoading } = useItems(service.id, branchId);
  const { data: addons = [], isLoading: addonsLoading } = useAddOns(service.id, branchId);

  return (
    <div className="border border-[var(--border-soft)] rounded-3xl bg-surface overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-muted transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-text-muted">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <LayoutList className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-foreground">{service.name}</div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-[var(--border-soft)] bg-background">
          <div className="grid xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-text-muted" />
                Items
              </h4>
              {itemsLoading ? (
                <div className="text-sm text-text-muted">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-text-muted italic">No items</div>
              ) : (
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item.id} className="text-sm flex justify-between items-center bg-surface px-4 py-2 rounded-full border border-[var(--border-soft)]">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <OverridePriceEditor
                        targetId={item.id}
                        targetType="ITEM"
                        branchId={branchId}
                        initialPrice={Number(item.price)}
                        overrides={overrides}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Tags className="h-4 w-4 text-text-muted" />
                Add-ons
              </h4>
              {addonsLoading ? (
                <div className="text-sm text-text-muted">Loading add-ons...</div>
              ) : addons.length === 0 ? (
                <div className="text-sm text-text-muted italic">No add-ons</div>
              ) : (
                <ul className="space-y-2">
                  {addons.map(addon => (
                    <li key={addon.id} className="text-sm flex justify-between items-center bg-surface px-4 py-2 rounded-full border border-[var(--border-soft)]">
                      <span className="font-medium text-foreground">{addon.name}</span>
                      <OverridePriceEditor
                        targetId={addon.id}
                        targetType="ADDON"
                        branchId={branchId}
                        initialPrice={Number(addon.price)}
                        overrides={overrides}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverridePriceEditor({ targetId, targetType, branchId, initialPrice, overrides }: { targetId: string, targetType: "ITEM" | "ADDON", branchId: string, initialPrice: number, overrides: GeoOverrideResponse[] }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Look for existing override
  const existingOverride = overrides.find(o =>
    o.branchId === branchId &&
    (o.targetType === targetType || o.targetType === "ADD_ON") &&
    (o.itemId === targetId || o.targetId === targetId || o.addOnId === targetId || o.serviceId === targetId)
  );

  // Use overridden price if available. (Note: the preview API might already return the overridden price in item.price, but we double check against geo-overrides to know it's explicitly overridden)
  const displayPrice = existingOverride ? Number(existingOverride.overriddenPrice) : initialPrice;
  const [price, setPrice] = useState(String(displayPrice));

  const mutateOverride = useMutation({
    mutationFn: async (numPrice: number) => {
      if (existingOverride) {
        return apiRequest({
          path: `/admin/geo-overrides/${existingOverride.id}`,
          method: "PATCH",
          body: { overriddenPrice: numPrice }
        });
      } else {
        return apiRequest({
          path: "/admin/geo-overrides",
          method: "POST",
          body: {
            targetType,
            targetId,
            branchId,
            overriddenPrice: numPrice,
            overriddenIsEnabled: null
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geo-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    const numPrice = Number(price);
    if (isNaN(numPrice)) return;
    mutateOverride.mutate(numPrice);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span
          className={`font-mono px-2 py-0.5 rounded text-xs ${existingOverride ? "bg-primary/10 text-primary font-semibold" : "bg-surface-muted text-text-muted"}`}
          title={existingOverride ? "Price is overridden for this branch" : "Global base price"}
        >
          ₹{String(displayPrice)}
        </span>
        <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-surface-muted rounded text-text-muted hover:text-foreground transition-all">
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
        className="w-16 px-1 py-0.5 text-xs font-mono border border-[var(--border-soft)] rounded bg-surface focus:outline-none focus:border-primary disabled:opacity-50"
        autoFocus
        disabled={mutateOverride.isPending}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setIsEditing(false);
            setPrice(String(displayPrice));
          }
        }}
      />
      <button onClick={handleSave} disabled={mutateOverride.isPending} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => { setIsEditing(false); setPrice(String(displayPrice)); }} disabled={mutateOverride.isPending} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50">
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
