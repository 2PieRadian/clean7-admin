"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

import {
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  Eye,
  Play,
  Pause,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SortableList, reorderArray } from "@/components/ui/dnd-sortable";
import { apiRequest } from "@/lib/browser-api";
import { uploadBannerImage } from "@/lib/upload-utils";
import type { CategorySummary, CatalogServiceSummary } from "@/lib/types";

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  title?: string;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HomeCarouselSetting {
  timerSeconds: number;
  slides: CarouselSlide[];
}

const DEFAULT_SETTINGS: HomeCarouselSetting = {
  timerSeconds: 4,
  slides: [],
};

export const APP_SCREEN_PRESETS = [
  { label: "Book a Service (/booking)", value: "/booking" },
  { label: "All Services Tab (/(tabs)/services)", value: "/(tabs)/services" },
  { label: "My Orders (/(tabs)/orders)", value: "/(tabs)/orders" },
  { label: "Need Help & Support (/need-help)", value: "/need-help" },
  { label: "FAQs (/faqs)", value: "/faqs" },
];

export function getCategoryRoute(category: CategorySummary): string {
  const slug = (category.slug || "").toLowerCase();
  if (slug === "laundry" || slug.includes("laundry")) {
    return "/service-laundry";
  }
  if (slug === "door-to-door-car-wash" || slug.includes("car-wash") || slug.includes("vehicle")) {
    return "/service-car-wash";
  }
  if (slug === "pest-control" || slug.includes("pest")) {
    return "/service-pest-control";
  }
  if (slug === "home-cleaning" || slug.includes("cleaning")) {
    return "/service-cleaning";
  }
  return `/service-cleaning?categorySlug=${encodeURIComponent(category.slug)}&title=${encodeURIComponent(category.name)}`;
}

export function getServiceRoute(service: CatalogServiceSummary, category?: CategorySummary | null): string {
  const catSlug = (category?.slug || "").toLowerCase();
  const serviceSlug = service.slug;

  if (catSlug === "laundry" || catSlug.includes("laundry")) {
    return `/service-laundry?category=${encodeURIComponent(serviceSlug)}`;
  }
  if (catSlug === "door-to-door-car-wash" || catSlug.includes("car-wash")) {
    return `/service-car-wash-details?serviceId=${encodeURIComponent(service.id)}&title=${encodeURIComponent(service.name)}&categorySlug=${encodeURIComponent(category?.slug || "door-to-door-car-wash")}`;
  }
  if (catSlug === "pest-control" || catSlug.includes("pest")) {
    return `/service-pest-details?type=${encodeURIComponent(serviceSlug)}&title=${encodeURIComponent(service.name)}&categorySlug=${encodeURIComponent(category?.slug || "pest-control")}`;
  }
  if (catSlug === "home-cleaning" || catSlug.includes("cleaning")) {
    return `/service-cleaning-details?serviceId=${encodeURIComponent(service.id)}&serviceSlug=${encodeURIComponent(serviceSlug)}&title=${encodeURIComponent(service.name)}&categorySlug=${encodeURIComponent(category?.slug || "home-cleaning")}`;
  }
  return `/service-cleaning-details?serviceId=${encodeURIComponent(service.id)}&serviceSlug=${encodeURIComponent(serviceSlug)}&title=${encodeURIComponent(service.name)}&categorySlug=${encodeURIComponent(category?.slug || "")}`;
}

export function getDestinationBadgeInfo(
  linkUrl: string | undefined,
  services: CatalogServiceSummary[],
  categories: CategorySummary[]
): { label: string; badge: string } {
  if (!linkUrl || !linkUrl.trim()) {
    return { label: "No action on click", badge: "None" };
  }

  const trimmed = linkUrl.trim();

  // Check matching service
  for (const svc of services) {
    const cat = categories.find((c) => c.id === svc.categoryId);
    const expected = getServiceRoute(svc, cat);
    if (
      trimmed === expected ||
      (trimmed.includes(svc.id) && trimmed.includes("serviceId=")) ||
      (trimmed.includes(`category=${svc.slug}`) && trimmed.startsWith("/service-laundry")) ||
      (trimmed.includes(`type=${svc.slug}`) && trimmed.startsWith("/service-pest-details"))
    ) {
      return {
        label: `${svc.name}${cat ? ` (${cat.name})` : ""}`,
        badge: "Service",
      };
    }
  }

  // Check matching category
  for (const cat of categories) {
    const expected = getCategoryRoute(cat);
    if (trimmed === expected || (trimmed.startsWith("/service-") && trimmed.includes(cat.slug))) {
      return {
        label: `${cat.name} Category`,
        badge: "Category",
      };
    }
  }

  // Check general app screens
  const screen = APP_SCREEN_PRESETS.find((s) => s.value === trimmed);
  if (screen) {
    return {
      label: screen.label.replace(/\s*\(.*\)/, ""),
      badge: "Screen",
    };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      label: trimmed,
      badge: "Web Link",
    };
  }

  return {
    label: trimmed,
    badge: "Custom Route",
  };
}

export default function BannersPage() {
  const [settings, setSettings] = useState<HomeCarouselSetting>(DEFAULT_SETTINGS);
  const [timerInput, setTimerInput] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Backend Catalog Data State
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [services, setServices] = useState<CatalogServiceSummary[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideImageUrl, setSlideImageUrl] = useState("");
  const [slideLinkUrl, setSlideLinkUrl] = useState("");
  const [slideIsActive, setSlideIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Live preview state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch settings from catalogue-service
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let rawSetting: any = null;
      try {
        rawSetting = await apiRequest<any>({
          path: "/admin/settings/home_carousel",
          method: "GET",
        });
      } catch (adminErr) {
        console.warn("Retrying with public catalog settings endpoint:", adminErr);
        rawSetting = await apiRequest<any>({
          path: "/catalog/settings/home_carousel",
          method: "GET",
          requireAuth: false,
        });
      }

      // Handle null, { value: ... }, or { data: { value: ... } }
      const val = rawSetting?.value ?? rawSetting?.data?.value ?? null;
      if (val) {
        const loaded: HomeCarouselSetting = {
          timerSeconds: typeof val.timerSeconds === "number" ? Math.max(1, val.timerSeconds) : 4,
          slides: Array.isArray(val.slides) ? val.slides : [],
        };
        setSettings(loaded);
        setTimerInput(loaded.timerSeconds);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setTimerInput(DEFAULT_SETTINGS.timerSeconds);
      }
    } catch (err: any) {
      console.error("Failed to load carousel settings:", err);
      setError(err?.message || "Failed to load banner carousel settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch services and categories from backend
  const loadCatalogData = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      let cats: CategorySummary[] = [];
      let svcs: CatalogServiceSummary[] = [];

      try {
        cats = await apiRequest<CategorySummary[]>({
          path: "/admin/categories",
          method: "GET",
        });
      } catch (adminCatErr) {
        console.warn("Failed fetching /admin/categories, trying public catalog:", adminCatErr);
        try {
          cats = await apiRequest<CategorySummary[]>({
            path: "/catalog/categories",
            method: "GET",
            requireAuth: false,
          });
        } catch {
          cats = [];
        }
      }

      try {
        svcs = await apiRequest<CatalogServiceSummary[]>({
          path: "/admin/services",
          method: "GET",
        });
      } catch (adminSvcErr) {
        console.warn("Failed fetching /admin/services, trying public catalog:", adminSvcErr);
        try {
          svcs = await apiRequest<CatalogServiceSummary[]>({
            path: "/catalog/services",
            method: "GET",
            requireAuth: false,
          });
        } catch {
          svcs = [];
        }
      }

      const allServices = Array.isArray(svcs) ? [...svcs] : [];
      if (Array.isArray(cats)) {
        for (const cat of cats) {
          if (Array.isArray(cat.services)) {
            for (const s of cat.services) {
              if (!allServices.some((existing) => existing.id === s.id)) {
                allServices.push({ ...s, categoryId: s.categoryId || cat.id });
              }
            }
          }
        }
      }

      setCategories(Array.isArray(cats) ? cats : []);
      setServices(allServices);
    } catch (err) {
      console.error("Failed to load catalog data for banner destinations:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadCatalogData();
  }, [loadSettings, loadCatalogData]);

  // Group services by category for clean dropdown navigation
  const servicesGroupedByCategory = useMemo(() => {
    if (!categories.length && !services.length) return [];

    const categoryMap = new Map<string, { category: CategorySummary; services: CatalogServiceSummary[] }>();

    for (const cat of categories) {
      categoryMap.set(cat.id, { category: cat, services: [] });
    }

    const unassigned: CatalogServiceSummary[] = [];

    for (const svc of services) {
      if (svc.categoryId && categoryMap.has(svc.categoryId)) {
        const group = categoryMap.get(svc.categoryId)!;
        if (!group.services.some((s) => s.id === svc.id)) {
          group.services.push(svc);
        }
      } else {
        const matchedCat = categories.find((c) =>
          c.services?.some((s) => s.id === svc.id || s.slug === svc.slug)
        );
        if (matchedCat && categoryMap.has(matchedCat.id)) {
          const group = categoryMap.get(matchedCat.id)!;
          if (!group.services.some((s) => s.id === svc.id)) {
            group.services.push(svc);
          }
        } else {
          if (!unassigned.some((s) => s.id === svc.id)) {
            unassigned.push(svc);
          }
        }
      }
    }

    // Also include services from category.services if any
    for (const cat of categories) {
      if (Array.isArray(cat.services)) {
        const group = categoryMap.get(cat.id);
        if (group) {
          for (const s of cat.services) {
            if (!group.services.some((existing) => existing.id === s.id)) {
              group.services.push({ ...s, categoryId: cat.id });
            }
          }
        }
      }
    }

    const result = Array.from(categoryMap.values()).filter((g) => g.services.length > 0);
    if (unassigned.length > 0) {
      result.push({
        category: {
          id: "other",
          name: "Other Services",
          slug: "other",
          code: "OTHER",
          sortOrder: 999,
          publishState: "ACTIVE",
        },
        services: unassigned,
      });
    }

    return result;
  }, [categories, services]);

  const isCurrentLinkInOptions = useMemo(() => {
    if (!slideLinkUrl) return true;
    if (APP_SCREEN_PRESETS.some((s) => s.value === slideLinkUrl)) return true;
    if (categories.some((c) => getCategoryRoute(c) === slideLinkUrl)) return true;
    if (
      services.some((s) => {
        const cat = categories.find((c) => c.id === s.categoryId);
        return getServiceRoute(s, cat) === slideLinkUrl;
      })
    ) {
      return true;
    }
    return false;
  }, [slideLinkUrl, categories, services]);

  // Save settings helper
  const saveCarouselSettings = async (updated: HomeCarouselSetting) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest({
        path: "/admin/settings/home_carousel",
        method: "PUT",
        body: { value: updated },
      });

      setSettings(updated);
      setSuccessMessage("Carousel settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to save carousel settings:", err);
      setError(err.message || "Failed to save carousel settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview auto-slide ticker
  const activeSlides = settings.slides.filter((s) => s.isActive);
  useEffect(() => {
    if (!isAutoPlaying || activeSlides.length <= 1) return;

    const intervalMs = Math.max(1, settings.timerSeconds) * 1000;
    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % activeSlides.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoPlaying, settings.timerSeconds, activeSlides.length]);

  // Handle reorder from drag-and-drop
  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    const reordered = reorderArray(settings.slides, sourceIndex, targetIndex).map(
      (slide, idx) => ({ ...slide, sortOrder: idx })
    );

    const updated = {
      ...settings,
      slides: reordered,
    };
    setSettings(updated);
    void saveCarouselSettings(updated);
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updatedSlides = settings.slides.map((slide) =>
      slide.id === id ? { ...slide, isActive: !slide.isActive } : slide
    );
    const updated = { ...settings, slides: updatedSlides };
    setSettings(updated);
    void saveCarouselSettings(updated);
  };

  // Delete slide
  const handleDeleteSlide = (id: string) => {
    if (!confirm("Are you sure you want to remove this banner slide?")) return;

    const updatedSlides = settings.slides
      .filter((slide) => slide.id !== id)
      .map((s, idx) => ({ ...s, sortOrder: idx }));

    const updated = { ...settings, slides: updatedSlides };
    setSettings(updated);
    void saveCarouselSettings(updated);
  };

  // Open modal for Create or Edit
  const openCreateModal = () => {
    setEditingSlide(null);
    setSlideTitle("");
    setSlideImageUrl("");
    setSlideLinkUrl("");
    setSlideIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (slide: CarouselSlide) => {
    setEditingSlide(slide);
    setSlideTitle(slide.title || "");
    setSlideImageUrl(slide.imageUrl);
    setSlideLinkUrl(slide.linkUrl || "");
    setSlideIsActive(slide.isActive);
    setIsModalOpen(true);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadBannerImage(file, (progress) => {
        setUploadProgress(progress);
      });
      setSlideImageUrl(url);
    } catch (err: any) {
      alert(err.message || "Failed to upload banner image");
    } finally {
      setIsUploading(false);
    }
  };

  // Save slide in modal
  const handleSaveSlide = () => {
    if (!slideImageUrl.trim()) {
      alert("Please upload an image or provide an image URL.");
      return;
    }

    let updatedSlides: CarouselSlide[];

    if (editingSlide) {
      updatedSlides = settings.slides.map((slide) =>
        slide.id === editingSlide.id
          ? {
            ...slide,
            title: slideTitle.trim() || undefined,
            imageUrl: slideImageUrl.trim(),
            linkUrl: slideLinkUrl.trim() || undefined,
            isActive: slideIsActive,
          }
          : slide
      );
    } else {
      const newSlide: CarouselSlide = {
        id: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: slideTitle.trim() || undefined,
        imageUrl: slideImageUrl.trim(),
        linkUrl: slideLinkUrl.trim() || undefined,
        isActive: slideIsActive,
        sortOrder: settings.slides.length,
      };
      updatedSlides = [...settings.slides, newSlide];
    }

    const updated = { ...settings, slides: updatedSlides };
    setSettings(updated);
    setIsModalOpen(false);
    void saveCarouselSettings(updated);
  };

  // Handle saving timer
  const handleSaveTimer = () => {
    const validTimer = Math.max(1, Math.min(30, timerInput || 4));
    const updated = { ...settings, timerSeconds: validTimer };
    setTimerInput(validTimer);
    void saveCarouselSettings(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Home Banners Carousel"
          description="Manage promotional sliding banners and transition speed on the mobile app home screen."
        />
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Banner Slide
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void loadSettings()}>
            Retry
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Timer Settings & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Control Card */}
        <Card className="p-5 md:p-6 space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Auto-Slide Timer</h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Set how long each banner remains visible on screen before automatically sliding to the next image.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Transition Interval (Seconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={30}
                value={timerInput}
                onChange={(e) => setTimerInput(parseInt(e.target.value, 10) || 0)}
                className="w-28 rounded-xl border border-[var(--border-soft)] bg-surface px-3.5 py-2 text-base font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-text-secondary">seconds</span>
              <Button
                onClick={handleSaveTimer}
                disabled={isSaving || timerInput === settings.timerSeconds}
                variant="secondary"
                className="ml-auto"
              >
                {isSaving ? "Saving..." : "Update Timer"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Recommended: 4 to 6 seconds for optimal readability.
            </p>
          </div>
        </Card>

        {/* Live Simulation Preview */}
        <Card className="p-5 md:p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Live App Preview</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">
                {activeSlides.length > 0 ? `Slide ${previewIndex + 1} of ${activeSlides.length}` : "No active slides"}
              </span>
              {activeSlides.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying((prev) => !prev)}
                  className="p-1.5 rounded-lg border border-[var(--border-soft)] text-text-secondary hover:text-foreground hover:bg-surface-muted transition"
                  title={isAutoPlaying ? "Pause preview" : "Resume preview"}
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {activeSlides.length === 0 ? (
            <div className="h-44 sm:h-52 rounded-2xl border-2 border-dashed border-[var(--border-soft)] flex flex-col items-center justify-center text-text-muted gap-2">
              <Eye className="w-8 h-8 opacity-40" />
              <p className="text-sm">Add active banner slides below to see live preview.</p>
            </div>
          ) : (
            <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] shadow-md">
              {activeSlides[previewIndex] && (
                <img
                  src={activeSlides[previewIndex].imageUrl}
                  alt={activeSlides[previewIndex].title || "Banner slide"}
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
              )}

              {/* Title overlay if set */}
              {activeSlides[previewIndex]?.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-8">
                  <p className="text-white text-sm sm:text-base font-bold drop-shadow-sm truncate">
                    {activeSlides[previewIndex].title}
                  </p>
                </div>
              )}

              {/* Indicator dots */}
              <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
                {activeSlides.map((_, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 rounded-full ${idx === previewIndex
                      ? "w-5 h-1.5 bg-[#C9A24B]"
                      : "w-1.5 h-1.5 bg-white/60 dark:bg-white/40"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Slide Management Section */}
      <Card className="p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Carousel Slides</h2>
            <p className="text-sm text-text-secondary">
              Drag using the left handle to reorder slides. Changes save automatically.
            </p>
          </div>
          <div className="text-xs text-text-muted font-medium">
            Total: {settings.slides.length} slides ({activeSlides.length} active)
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-secondary">
            Loading carousel slides...
          </div>
        ) : settings.slides.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-muted mx-auto flex items-center justify-center text-text-muted">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No banner slides configured</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Add banner slides to showcase seasonal discounts, special laundry packages, or quick service links on the app.
            </p>
            <Button onClick={openCreateModal} variant="secondary" className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Slide
            </Button>
          </div>
        ) : (
          <SortableList
            items={settings.slides}
            keyExtractor={(item) => item.id}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {(slide, index, handleProps, isDragging) => (
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl border border-[var(--border-soft)] bg-surface transition-shadow ${isDragging ? "shadow-xl ring-2 ring-primary/40" : "hover:border-primary/30 shadow-sm"
                  }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Smooth Drag Handle (Rule 20) */}
                  <div
                    {...handleProps}
                    title="Drag to reorder slide"
                    className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-muted transition shrink-0"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] shrink-0">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title || `Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Slide Info */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-muted uppercase">#{index + 1}</span>
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {slide.title || "(Untitled Banner)"}
                      </h4>
                    </div>
                    {slide.linkUrl ? (() => {
                      const dest = getDestinationBadgeInfo(slide.linkUrl, services, categories);
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
                          <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {dest.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-[var(--border-soft)] shrink-0 font-medium">
                            {dest.badge}
                          </span>
                          <span className="text-[11px] text-text-muted truncate hidden sm:inline">
                            ({slide.linkUrl})
                          </span>
                        </div>
                      );
                    })() : (
                      <p className="text-xs text-text-muted italic">No link action</p>
                    )}
                  </div>
                </div>

                {/* Right side: Active toggle & actions */}
                <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-soft)]">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(slide.id)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition ${slide.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                      : "bg-surface-muted text-text-muted border border-[var(--border-soft)]"
                      }`}
                  >
                    {slide.isActive ? "Active" : "Inactive"}
                  </button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditModal(slide)}
                    title="Edit slide"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </SortableList>
        )}
      </Card>

      {/* Add / Edit Slide Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSlide ? "Edit Banner Slide" : "Add Banner Slide"}
      >
        <div className="space-y-4">
          {/* Image Upload / Preview */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Banner Image <span className="text-red-500">*</span>
            </label>

            {slideImageUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-[var(--border-soft)] bg-black/5 group">
                <img
                  src={slideImageUrl}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setSlideImageUrl("")}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[var(--border-soft)] rounded-xl p-6 text-center space-y-3 bg-surface hover:border-primary/50 transition">
                <Upload className="w-8 h-8 mx-auto text-text-muted" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Upload banner image
                  </p>
                  <p className="text-xs text-text-muted">
                    Recommended ratio: ~16:9 or 2:1 (e.g. 1200 x 600px). WebP, PNG, or JPEG.
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition shadow-sm">
                    {isUploading ? `Uploading (${uploadProgress}%)...` : "Select File"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Direct URL option */}
            <div className="pt-1">
              <input
                type="url"
                placeholder="Or paste direct image URL (https://...)"
                value={slideImageUrl}
                onChange={(e) => setSlideImageUrl(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Banner Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Title / Headline (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 20% Off Dry Cleaning This Weekend"
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-soft)] bg-surface px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Destination Link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">
                Destination Action (Optional)
              </label>
              {isLoadingCatalog && (
                <span className="text-xs text-text-muted animate-pulse">
                  Loading services...
                </span>
              )}
            </div>

            <select
              value={slideLinkUrl}
              onChange={(e) => setSlideLinkUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-soft)] bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none mb-1.5"
            >
              <option value="">None (No action on click)</option>

              {/* Backend Services grouped by Category */}
              {servicesGroupedByCategory.length > 0 ? (
                servicesGroupedByCategory.map((group) => (
                  <optgroup key={group.category.id} label={`Services — ${group.category.name}`}>
                    {group.services.map((svc) => {
                      const route = getServiceRoute(svc, group.category);
                      return (
                        <option key={svc.id} value={route}>
                          {svc.name}
                        </option>
                      );
                    })}
                  </optgroup>
                ))
              ) : services.length > 0 ? (
                <optgroup label="Services (All)">
                  {services.map((svc) => {
                    const cat = categories.find((c) => c.id === svc.categoryId);
                    const route = getServiceRoute(svc, cat);
                    return (
                      <option key={svc.id} value={route}>
                        {svc.name} {cat ? `(${cat.name})` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ) : null}

              {/* Backend Categories */}
              {categories.length > 0 && (
                <optgroup label="Category Pages">
                  {categories.map((cat) => {
                    const route = getCategoryRoute(cat);
                    return (
                      <option key={cat.id} value={route}>
                        {cat.name} Category Page
                      </option>
                    );
                  })}
                </optgroup>
              )}

              {/* App Screens */}
              <optgroup label="General App Screens">
                {APP_SCREEN_PRESETS.map((screen) => (
                  <option key={screen.value} value={screen.value}>
                    {screen.label}
                  </option>
                ))}
              </optgroup>

              {/* Custom option if not recognized */}
              {!isCurrentLinkInOptions && slideLinkUrl && (
                <optgroup label="Custom URL">
                  <option value={slideLinkUrl}>Custom: {slideLinkUrl}</option>
                </optgroup>
              )}
            </select>

            <input
              type="text"
              placeholder="Or enter custom route or web URL (e.g. /service-laundry or https://...)"
              value={slideLinkUrl}
              onChange={(e) => setSlideLinkUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-soft)] bg-surface px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Select any service, category, or app screen above, or manually type a custom in-app path or website URL.
            </p>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Active Slide</p>
              <p className="text-xs text-text-muted">Display this banner in the app carousel</p>
            </div>
            <input
              type="checkbox"
              checked={slideIsActive}
              onChange={(e) => setSlideIsActive(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-soft)]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlide} disabled={isUploading}>
              {editingSlide ? "Save Changes" : "Add Slide"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
