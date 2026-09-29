"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  Phone,
  PhoneOff,
  Mail,
  User,
  Shield,
  MapPin,
  Trash2,
  Edit3,
  AlertTriangle,
  UserCheck,
  UserX,
  Users,
  Bike,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextArea, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
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
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import { useProfiles, useUpdateProfile, useDeleteUser } from "../api/profile-api";
import { useBranches } from "@/features/branches/api/branch-api";
import type { OperatorProfileResponse, ProfileResponse, UserRole, OrderResponse } from "@/lib/types";

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: "All Roles", value: "ALL" },
  { label: "Customers", value: "USER" },
  { label: "Operators", value: "OPERATOR" },
  { label: "Riders", value: "RIDER" },
  { label: "Branch Admins", value: "BRANCH_ADMIN" },
  { label: "Directors", value: "DIRECTOR" },
];

function getRoleTone(role: UserRole): "muted" | "info" | "warning" | "danger" | "success" {
  switch (role) {
    case "USER":
      return "info";
    case "OPERATOR":
      return "warning";
    case "RIDER":
      return "muted";
    case "BRANCH_ADMIN":
      return "success";
    case "DIRECTOR":
      return "danger";
    default:
      return "muted";
  }
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserManager() {
  const { user: currentUser } = useAuth();
  const isDirector = currentUser?.role === "DIRECTOR";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<ProfileResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ProfileResponse | null>(null);

  // Filter available role options for non-directors (branch admins see Customers, Operators, and Riders)
  const availableRoles = useMemo(() => {
    if (!isDirector) {
      return [
        { label: "All Branch Users", value: "ALL" },
        { label: "Customers", value: "USER" },
        { label: "Operators", value: "OPERATOR" },
        { label: "Riders", value: "RIDER" },
      ];
    }
    return ROLE_OPTIONS;
  }, [isDirector]);

  // Profile API hooks (user-service)
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    isFetching: isFetchingProfiles,
    refetch: refetchProfiles,
  } = useProfiles({
    search: isDirector ? search.trim() || undefined : undefined,
    role: isDirector && roleFilter !== "ALL" ? roleFilter : undefined,
  });

  // Operators API hook for non-directors (branch-admin scoped to their branch by operator-service)
  const {
    data: branchOperators,
    isLoading: isLoadingOperators,
    isFetching: isFetchingOperators,
    refetch: refetchOperators,
  } = useQuery<OperatorProfileResponse[]>({
    queryKey: ["admin-operators"],
    queryFn: () => apiRequest<OperatorProfileResponse[]>({ path: "/admin/operators" }),
    enabled: !isDirector,
  });

  // Orders API hook for non-directors (branch-admin scoped to their branch by order-service)
  const {
    data: branchOrders,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useQuery<OrderResponse[]>({
    queryKey: ["admin-branch-orders"],
    queryFn: async () => {
      const res = await apiRequest<OrderResponse[] | { orders: OrderResponse[] }>({
        path: "/admin/orders",
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as any).orders)) return (res as any).orders;
      return [];
    },
    enabled: !isDirector,
  });

  const { data: branches, refetch: refetchBranches } = useBranches();
  const currentBranchName = branches?.[0]?.name;

  const isLoading = isLoadingProfiles || (!isDirector && (isLoadingOperators || isLoadingOrders));
  const isFetching = isFetchingProfiles || (!isDirector && (isFetchingOperators || isFetchingOrders));

  const updateProfile = useUpdateProfile();
  const deleteUser = useDeleteUser();

  const branchStaffMap = useMemo(() => {
    if (isDirector || !branchOperators) return new Map<string, OperatorProfileResponse>();
    return new Map(branchOperators.map((o) => [o.authUserId, o]));
  }, [isDirector, branchOperators]);

  // When director: show all profiles across platform
  // When branch admin: show ONLY staff (operators, riders) from this branch, and ONLY users (customers) who placed orders in this branch
  const displayedProfiles = useMemo(() => {
    if (isDirector) {
      return profiles || [];
    }

    const staffList = branchOperators || [];
    const profilesByAuthId = new Map((profiles || []).map((p) => [p.authUserId, p]));
    const staffAuthIds = new Set(staffList.map((op) => op.authUserId));

    // 1. Staff Profiles (Operators & Riders) from this branch
    const staffProfiles: ProfileResponse[] = staffList.map((op) => {
      const p = profilesByAuthId.get(op.authUserId);
      if (p) {
        return {
          ...p,
          role: op.role as UserRole,
          fullName: p.fullName || op.displayName,
          phoneNumber: p.phoneNumber || op.phoneNumber,
        };
      }
      return {
        id: op.authUserId,
        authUserId: op.authUserId,
        email: op.email || "No email",
        role: op.role as UserRole,
        fullName: op.displayName,
        phoneNumber: op.phoneNumber,
        avatarUrl: op.profilePhotoUrl || null,
        emergencyContactName: op.emergencyContactName || null,
        emergencyContactPhone: op.emergencyContactPhone || null,
        internalNotes: null,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
        addresses: [],
      };
    });

    // 2. Customer Profiles associated with this branch only (from branch orders)
    const customerProfilesMap = new Map<string, ProfileResponse>();
    const orders = branchOrders || [];

    for (const order of orders) {
      const authId = order.customerAuthUserId;
      if (!authId || authId === "walk-in-guest" || staffAuthIds.has(authId)) {
        continue;
      }

      if (customerProfilesMap.has(authId)) {
        continue;
      }

      const p = profilesByAuthId.get(authId);
      const contact = order.contactSnapshot;
      const addrSnapshot = order.serviceAddressSnapshot;

      if (p) {
        customerProfilesMap.set(authId, {
          ...p,
          role: "USER" as UserRole,
          fullName: p.fullName || contact?.fullName || "Customer",
          phoneNumber: p.phoneNumber || contact?.phoneNumber || null,
          email: p.email || contact?.email || "No email",
        });
      } else {
        customerProfilesMap.set(authId, {
          id: authId,
          authUserId: authId,
          email: contact?.email || "No email",
          role: "USER" as UserRole,
          fullName: contact?.fullName || "Customer",
          phoneNumber: contact?.phoneNumber || null,
          avatarUrl: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          internalNotes: null,
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          addresses: addrSnapshot
            ? [
                {
                  id: addrSnapshot.id || `${authId}-addr`,
                  label: addrSnapshot.label || "Service Address",
                  line1: addrSnapshot.line1,
                  line2: addrSnapshot.line2 || null,
                  city: addrSnapshot.city,
                  state: addrSnapshot.state,
                  postalCode: addrSnapshot.postalCode,
                  country: addrSnapshot.country,
                  latitude: addrSnapshot.latitude ?? null,
                  longitude: addrSnapshot.longitude ?? null,
                  isDefault: true,
                },
              ]
            : [],
        });
      }
    }

    const customerProfiles = Array.from(customerProfilesMap.values());
    const combined: ProfileResponse[] = [...staffProfiles, ...customerProfiles];

    let filtered = combined;

    if (roleFilter !== "ALL") {
      filtered = filtered.filter((p) => p.role === roleFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.fullName && p.fullName.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.phoneNumber && p.phoneNumber.toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [isDirector, profiles, branchOperators, branchOrders, roleFilter, search]);

  // Metrics
  const metrics = useMemo(() => {
    if (!isDirector) {
      const staff = branchOperators || [];
      const branchStaffCount = staff.length;
      const operatorsCount = staff.filter((o) => o.role === "OPERATOR").length;
      const ridersCount = staff.filter((o) => o.role === "RIDER").length;

      const staffAuthIds = new Set(staff.map((s) => s.authUserId));
      const customerIds = new Set<string>();
      for (const order of branchOrders || []) {
        const id = order.customerAuthUserId;
        if (id && id !== "walk-in-guest" && !staffAuthIds.has(id)) {
          customerIds.add(id);
        }
      }
      const customersCount = customerIds.size;

      return {
        total: branchStaffCount + customersCount,
        customers: customersCount,
        staff: branchStaffCount,
        operators: operatorsCount,
        riders: ridersCount,
      };
    }
    const all = profiles || [];
    const customersCount = all.filter((p) => p.role === "USER").length;
    const staffCount = all.filter((p) => p.role !== "USER").length;
    return {
      total: all.length,
      customers: customersCount,
      staff: staffCount,
      operators: all.filter((p) => p.role === "OPERATOR").length,
      riders: all.filter((p) => p.role === "RIDER").length,
    };
  }, [profiles, isDirector, branchOperators, branchOrders]);

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>("");
  const [isPhoneUnlinked, setIsPhoneUnlinked] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("USER");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");

  const handleOpenEdit = (profile: ProfileResponse) => {
    setSelectedUser(profile);
    setEditFullName(profile.fullName || "");
    setEditPhoneNumber(profile.phoneNumber || "");
    setIsPhoneUnlinked(!profile.phoneNumber);
    setEditRole(profile.role);
    setEditAvatarUrl(profile.avatarUrl || "");
    setEditEmergencyName(profile.emergencyContactName || "");
    setEditEmergencyPhone(profile.emergencyContactPhone || "");
    setEditInternalNotes(profile.internalNotes || "");
    setIsEditModalOpen(true);
  };

  const handleUnlinkPhone = () => {
    setEditPhoneNumber("");
    setIsPhoneUnlinked(true);
    toast.info("Phone number cleared. Click 'Save changes' to unlink this phone number.");
  };

  const handleRestorePhone = () => {
    if (selectedUser?.phoneNumber) {
      setEditPhoneNumber(selectedUser.phoneNumber);
      setIsPhoneUnlinked(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await updateProfile.mutateAsync({
        authUserId: selectedUser.authUserId,
        payload: {
          fullName: editFullName.trim(),
          phoneNumber: isPhoneUnlinked || !editPhoneNumber.trim() ? null : editPhoneNumber.trim(),
          role: isDirector ? editRole : undefined,
          avatarUrl: editAvatarUrl.trim() || null,
          emergencyContactName: editEmergencyName.trim() || null,
          emergencyContactPhone: editEmergencyPhone.trim() || null,
          internalNotes: editInternalNotes.trim() || null,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["admin-operators"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-branch-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });

      toast.success("User details updated successfully");
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user details";
      toast.error(message);
    }
  };

  const handleDeleteClick = (profile: ProfileResponse) => {
    if (profile.authUserId === currentUser?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    setUserToDelete(profile);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync(userToDelete.authUserId);
      await queryClient.invalidateQueries({ queryKey: ["admin-operators"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-branch-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(`User ${userToDelete.fullName || userToDelete.email} deleted successfully`);
      setUserToDelete(null);
      if (selectedUser?.authUserId === userToDelete.authUserId) {
        setIsEditModalOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-surface border border-[var(--border-soft)]">
          <div className="h-12 w-12 rounded-xl bg-surface-muted flex items-center justify-center text-foreground">
            <Users className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted font-medium">
              {isDirector ? "Total Users" : "Branch Users"}
            </p>
            <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-surface border border-[var(--border-soft)]">
          <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center text-info">
            <UserCheck className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted font-medium">
              {isDirector ? "Customers" : "Branch Customers"}
            </p>
            <p className="text-2xl font-bold text-foreground">{metrics.customers}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-surface border border-[var(--border-soft)]">
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
            <Shield className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted font-medium">Operators</p>
            <p className="text-2xl font-bold text-foreground">{metrics.operators}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-surface border border-[var(--border-soft)]">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bike className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted font-medium">Riders</p>
            <p className="text-2xl font-bold text-foreground">{metrics.riders}</p>
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <Card className="p-4 space-y-4 bg-surface border border-[var(--border-soft)]">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-muted border border-[var(--border-soft)] rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {availableRoles.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoleFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${roleFilter === option.value
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "bg-surface-muted text-text-secondary hover:bg-surface-hover hover:text-foreground"
                  }`}
              >
                {option.label}
              </button>
            ))}

            {/* Refresh Button */}
            <Button
              variant="secondary"
              className="px-2.5 py-1.5 h-auto text-xs flex items-center gap-1 ml-2"
              onClick={() => {
                refetchProfiles();
                if (!isDirector) {
                  refetchOperators();
                  refetchOrders();
                  refetchBranches();
                }
              }}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Users Data Table ── */}
      <div className="rounded-xl border border-[var(--border-soft)] overflow-hidden shadow-sm">
        <DataTable
          rows={displayedProfiles}
          loading={isLoading}
          skeletonRows={6}
          emptyMessage={
            !isDirector
              ? search || roleFilter !== "ALL"
                ? "No branch users or staff match your active search or filters."
                : "No users or staff associated with your branch yet."
              : search || roleFilter !== "ALL"
              ? "No users match your active search or filters."
              : "No users found in the platform."
          }
          columns={[
            {
              key: "user",
              header: "User Details",
              render: (row) => (
                <div className="flex items-center gap-3">
                  {row.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatarUrl}
                      alt={row.fullName || row.email}
                      className="h-10 w-10 rounded-full object-cover border border-[var(--border-soft)]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-xs border border-primary/10">
                      {getInitials(row.fullName, row.email)}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm leading-tight">
                        {row.fullName || "No name set"}
                      </p>
                      {!isDirector && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-muted border border-[var(--border-soft)] text-text-muted font-medium">
                          {branchStaffMap.get(row.authUserId)?.branch?.name || currentBranchName || "My Branch"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <Mail className="h-3 w-3 text-text-muted" />
                      <span>{row.email}</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "phone",
              header: "Phone Number",
              render: (row) => (
                <div className="space-y-1">
                  {row.phoneNumber ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-[var(--border-soft)] text-xs text-foreground font-mono">
                      <Phone className="h-3 w-3 text-success" />
                      <span>{row.phoneNumber}</span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-muted/50 text-[11px] text-text-muted italic">
                      <PhoneOff className="h-3 w-3 text-text-muted" />
                      No phone linked
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (row) => (
                <Badge tone={getRoleTone(row.role)} value={row.role}>
                  {row.role === "USER" ? "CUSTOMER" : row.role}
                </Badge>
              ),
            },
            {
              key: "addresses",
              header: "Addresses",
              render: (row) => {
                const count = row.addresses?.length || 0;
                return (
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 text-text-muted" />
                    <span>{count} {count === 1 ? "address" : "addresses"}</span>
                  </div>
                );
              },
            },
            {
              key: "joined",
              header: "Joined Date",
              render: (row) => {
                if (!row.createdAt) return <span className="text-xs text-text-muted">—</span>;
                const d = new Date(row.createdAt);
                return (
                  <span className="text-xs text-text-secondary">
                    {d.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    className="px-2.5 py-1 text-xs flex items-center gap-1.5 h-8"
                    onClick={() => handleOpenEdit(row)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2.5 py-1 text-xs flex items-center gap-1.5 h-8 bg-danger/10 text-danger hover:bg-danger/20 border-danger/20"
                    onClick={() => handleDeleteClick(row)}
                    disabled={row.authUserId === currentUser?.id}
                    title={
                      row.authUserId === currentUser?.id
                        ? "Cannot delete your own account"
                        : "Delete user"
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Edit User Modal ── */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.fullName || selectedUser?.email || ""}`}
      >
        {selectedUser && (
          <form onSubmit={handleSaveEdit} className="space-y-6">
            {/* Header info badge */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-muted border border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-xs border border-primary/10">
                  {getInitials(selectedUser.fullName, selectedUser.email)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm leading-tight">
                    {selectedUser.fullName || "No name set"}
                  </p>
                  <p className="text-xs text-text-secondary">{selectedUser.email}</p>
                </div>
              </div>
              <Badge tone={getRoleTone(selectedUser.role)} value={selectedUser.role}>
                {selectedUser.role === "USER" ? "CUSTOMER" : selectedUser.role}
              </Badge>
            </div>

            {/* Personal Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full Name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />

              <Field
                label="Email Address"
                value={selectedUser.email}
                disabled
                hint="Login email identity cannot be changed directly."
              />
            </div>

            {/* Phone Number & Unlink Section */}
            <div className="space-y-2 p-4 rounded-xl border border-[var(--border-soft)] bg-surface-muted/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Phone Number
                </label>
                {selectedUser.phoneNumber && !isPhoneUnlinked && (
                  <button
                    type="button"
                    onClick={handleUnlinkPhone}
                    className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:text-danger/80 transition"
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    Unlink Phone Number
                  </button>
                )}
                {isPhoneUnlinked && selectedUser.phoneNumber && (
                  <button
                    type="button"
                    onClick={handleRestorePhone}
                    className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline transition"
                  >
                    Restore Linked Phone
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="+919876543210 (or leave empty to unlink)"
                  value={editPhoneNumber}
                  onChange={(e) => {
                    setEditPhoneNumber(e.target.value);
                    if (e.target.value.trim() === "") {
                      setIsPhoneUnlinked(true);
                    } else {
                      setIsPhoneUnlinked(false);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-surface border border-[var(--border-soft)] rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              {isPhoneUnlinked && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Phone number will be unlinked (removed) from this user upon saving.
                  </span>
                </div>
              )}
            </div>

            {/* Role & Avatar */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select
                  label="Platform Role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={!isDirector || selectedUser.role === "DIRECTOR"}
                  hint={!isDirector ? "Only Directors can change user roles." : undefined}
                >
                  <option value="USER">Customer (USER)</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="RIDER">Rider</option>
                  <option value="BRANCH_ADMIN">Branch Admin</option>
                  {selectedUser.role === "DIRECTOR" && <option value="DIRECTOR">Director</option>}
                </Select>
              </div>

              <Field
                label="Avatar URL"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Emergency Contact Information */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Emergency Contact Name"
                value={editEmergencyName}
                onChange={(e) => setEditEmergencyName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
              <Field
                label="Emergency Contact Phone"
                value={editEmergencyPhone}
                onChange={(e) => setEditEmergencyPhone(e.target.value)}
                placeholder="e.g. +919876543210"
              />
            </div>

            {/* Private Team Notes */}
            <TextArea
              label="Private Team Notes"
              value={editInternalNotes}
              onChange={(e) => setEditInternalNotes(e.target.value)}
              placeholder="Internal staff remarks, customer preferences, or support notes..."
              hint="Only clean7 administrators and staff can see these notes."
              rows={3}
            />

            {/* Saved Addresses Section (if any) */}
            {selectedUser.addresses && selectedUser.addresses.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-soft)]">
                <p className="text-xs uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Saved Delivery Addresses ({selectedUser.addresses.length})
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto thin-scrollbar">
                  {selectedUser.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-2.5 rounded-lg border border-[var(--border-soft)] bg-surface text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} - {addr.postalCode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-soft)]">
              <Button
                type="button"
                variant="danger"
                className="bg-danger/10 text-danger hover:bg-danger/20 border-danger/20"
                onClick={() => {
                  handleDeleteClick(selectedUser);
                }}
                disabled={selectedUser.authUserId === currentUser?.id}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Account
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
        <AlertDialogContent>
          {userToDelete && (
            <>
              <AlertDialogHeader>
                <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-2">
                  <Trash2 className="h-6 w-6" />
                </div>
                <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-foreground">
                    {userToDelete.fullName || userToDelete.email}
                  </strong>{" "}
                  (<code className="text-xs bg-surface-muted px-1 py-0.5 rounded">{userToDelete.email}</code>)?
                  <br />
                  <br />
                  This will permanently erase their login credentials, profile, operator/rider staff data,
                  contact information, and all saved delivery addresses. <strong className="text-danger">Nothing will remain in the database.</strong> This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger text-white hover:bg-danger/90"
                  onClick={handleConfirmDelete}
                >
                  {deleteUser.isPending ? "Deleting..." : "Yes, Delete User"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
