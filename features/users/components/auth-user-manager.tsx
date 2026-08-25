"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/features/auth/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/field";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { MutationStatus } from "@/components/admin/mutation-status";
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
import { apiRequest } from "@/lib/browser-api";
import { humanizeToken } from "@/lib/format";
import type { ManagedAuthUser, ManagedAuthUserRole } from "@/lib/types";

const branchAdminAllowedRoles: ManagedAuthUserRole[] = ["OPERATOR", "RIDER"];

type AuthUserManagerMode = "managed-users" | "branch-admins";

export function AuthUserManager({
  mode = "managed-users",
}: {
  mode?: AuthUserManagerMode;
}) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const isBranchAdminMode = mode === "branch-admins";
  const allowedRoles = isDirector
    ? isBranchAdminMode
      ? (["BRANCH_ADMIN"] as ManagedAuthUserRole[])
      : (["DIRECTOR", "OPERATOR", "RIDER"] as ManagedAuthUserRole[])
    : branchAdminAllowedRoles;
  const [users, setUsers] = useState<ManagedAuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [roleFilter, setRoleFilter] = useState<ManagedAuthUserRole | "ALL">(
    isDirector ? (isBranchAdminMode ? "BRANCH_ADMIN" : "ALL") : "ALL",
  );
  const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users],
  );

  async function load() {
    if (!isDirector) return;

    setLoading(true);
    setError(null);

    try {
      const nextUsers = await apiRequest<ManagedAuthUser[]>({
        path: "/admin/auth-users",
        query: {
          role: isBranchAdminMode
            ? "BRANCH_ADMIN"
            : roleFilter === "ALL"
              ? undefined
              : roleFilter,
          isActive: activeFilter === "ALL" ? undefined : activeFilter,
          search,
        },
      });
      setUsers(nextUsers);
      setSelectedUserId((current) =>
        nextUsers.some((user) => user.id === current)
          ? current
          : nextUsers[0]?.id ?? "",
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load managed users.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isDirector) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector, roleFilter, activeFilter]);

  function createUser(formData: FormData, form: HTMLFormElement) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        await apiRequest({
          path: "/admin/auth-users",
          method: "POST",
          body: {
            name: String(formData.get("name") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            password: String(formData.get("password") ?? ""),
            role: isBranchAdminMode ? "BRANCH_ADMIN" : formData.get("role"),
            isActive: formData.get("isActive") === "on",
          },
        });
        form.reset();
        setMessage(
          isDirector
            ? isBranchAdminMode
              ? "Branch admin created."
              : "Managed user created."
            : "Staff login created.",
        );
        if (isDirector) {
          await load();
        }
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to create managed user.",
        );
      }
    });
  }

  function updateUser(formData: FormData, authUserId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        await apiRequest({
          path: `/admin/auth-users/${authUserId}`,
          method: "PATCH",
          body: {
            name: String(formData.get("name") ?? "").trim(),
            role: isBranchAdminMode ? "BRANCH_ADMIN" : formData.get("role"),
            isActive: formData.get("isActive") === "on",
          },
        });
        setMessage(isBranchAdminMode ? "Branch admin updated." : "Managed user updated.");
        await load();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to update managed user.",
        );
      }
    });
  }

  function resetPassword(formData: FormData, authUserId: string, form: HTMLFormElement) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        await apiRequest({
          path: `/admin/auth-users/${authUserId}/reset-password`,
          method: "POST",
          body: {
            password: String(formData.get("password") ?? ""),
          },
        });
        form.reset();
        setMessage("Password reset and active sessions revoked.");
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to reset password.",
        );
      }
    });
  }

  function deactivateUser(authUserId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        await apiRequest({
          path: `/admin/auth-users/${authUserId}`,
          method: "PATCH",
          body: {
            isActive: false,
          },
        });
        setMessage("User deactivated and sessions revoked.");
        await load();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to deactivate user.",
        );
      }
    });
  }

  function deleteUser(authUserId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
        await apiRequest({
          path: `/admin/auth-users/${authUserId}`,
          method: "DELETE",
        });
        setMessage("User deleted completely.");
        await load();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to delete user.",
        );
      }
    });
  }

  if (isBranchAdminMode && !isDirector) {
    return (
      <Card className="max-w-3xl">
        <p className="text-sm text-text-secondary">
          Only Directors can create and manage branch admin accounts.
        </p>
      </Card>
    );
  }

  if (!isDirector) {
    return (
      <Card className="max-w-3xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Create operator or rider login
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Branch Admins can create auth accounts only for operator and rider staff.
          </p>
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            createUser(new FormData(event.currentTarget), event.currentTarget);
          }}
        >
          <Field label="Name" name="name" placeholder="Rider One" required />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="rider.one@example.com"
            required
          />
          <Field
            label="Temporary password"
            name="password"
            type="password"
            minLength={8}
            required
          />
          <Select label="Role" name="role" defaultValue="OPERATOR">
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {humanizeToken(role)}
              </option>
            ))}
          </Select>
          <label className="text-sm text-text-secondary md:col-span-2">
            <input className="mr-2" type="checkbox" name="isActive" defaultChecked />
            User is active
          </label>
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <MutationStatus error={error} success={message} />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create user"}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (isBranchAdminMode) {
    return (
      <>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Branch admins
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Director-only auth accounts for branch administration. Create, update, delete, and reset passwords here.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="service-blue">{users.length} branch admins</Badge>
                  <Button variant="success" onClick={() => setCreateModalOpen(true)}>
                    Create branch admin
                  </Button>
                </div>
              </div>

              <form
                className="grid gap-3 md:grid-cols-[1fr_150px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load();
                }}
              >
                <Field
                  label="Search"
                  name="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or email"
                />
                <Select
                  label="Status"
                  name="isActive"
                  value={activeFilter}
                  onChange={(event) =>
                    setActiveFilter(event.target.value as "ALL" | "true" | "false")
                  }
                >
                  <option value="ALL">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading}>
                    Search
                  </Button>
                </div>
              </form>

              {loading ? (
                <InlineLoadingCard lines={6} />
              ) : (
                <DataTable
                  rows={users}
                  emptyMessage="No branch admins found."
                  columns={[
                    {
                      key: "user",
                      header: "User",
                      render: (user) => (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <p className="font-semibold text-foreground">
                            {user.name || "Unnamed user"}
                          </p>
                          <p className="text-xs text-text-muted">{user.email}</p>
                        </button>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (user) => (
                        <Badge value={user.isActive ? "ACTIVE" : "INACTIVE"} />
                      ),
                    },
                    {
                      key: "verified",
                      header: "Verified",
                      render: (user) => (user.isVerified ? "Yes" : "No"),
                    },
                  ]}
                />
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {selectedUser ? (
              <Card className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {selectedUser.name || selectedUser.email}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedUser.id}
                  </p>
                </div>

                <form
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateUser(new FormData(event.currentTarget), selectedUser.id);
                  }}
                >
                  <Field
                    label="Name"
                    name="name"
                    defaultValue={selectedUser.name ?? ""}
                    required
                  />
                  <div className="text-sm text-text-secondary">Role: Branch Admin</div>
                  <label className="text-sm text-text-secondary">
                    <input
                      className="mr-2"
                      type="checkbox"
                      name="isActive"
                      defaultChecked={selectedUser.isActive}
                    />
                    User is active
                  </label>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Updating..." : "Update branch admin"}
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-3 border-t border-[var(--border-soft)] pt-4">
                  <Button variant="secondary" onClick={() => setResetPasswordModalOpen(true)}>
                    Reset password
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="danger" className="flex-1">
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedUser.name || selectedUser.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. It will permanently delete their account and staff profile.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUser(selectedUser.id)}
                          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-text-secondary">
                  Select a branch admin to update their status or reset their password.
                </p>
              </Card>
            )}
          </div>
        </div>

        {
          isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl p-6">
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4 z-10"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Close
                </Button>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Create branch admin
                </h3>
                <form
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createUser(new FormData(event.currentTarget), event.currentTarget);
                    setCreateModalOpen(false);
                  }}
                >
                  <Field label="Name" name="name" placeholder="Branch Admin One" required />
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="branch.admin@example.com"
                    required
                  />
                  <Field
                    label="Temporary password"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                  <div className="flex items-end text-sm text-text-secondary">
                    Role: Branch Admin
                  </div>
                  <label className="text-sm text-text-secondary">
                    <input className="mr-2" type="checkbox" name="isActive" defaultChecked />
                    User is active
                  </label>
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <MutationStatus error={error} success={message} />
                    <Button type="submit" variant="success" disabled={isPending}>
                      {isPending ? "Saving..." : "Create branch admin"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

        {
          isResetPasswordModalOpen && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl p-6">
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4 z-10"
                  onClick={() => setResetPasswordModalOpen(false)}
                >
                  Close
                </Button>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Reset password
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Reset password for {selectedUser.name || selectedUser.email}
                </p>
                <form
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    resetPassword(
                      new FormData(event.currentTarget),
                      selectedUser.id,
                      event.currentTarget,
                    );
                    setResetPasswordModalOpen(false);
                  }}
                >
                  <Field
                    label="New temporary password"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <Button type="submit" variant="primary" disabled={isPending}>
                      Reset password
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )
        }
      </>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Managed users
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Director-only auth accounts for operators, riders, and director staff.
              </p>
            </div>
            <Badge tone="service-blue">{users.length} users</Badge>
          </div>

          <form
            className="grid gap-3 md:grid-cols-[1fr_180px_150px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <Field
              label="Search"
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email"
            />
            <Select
              label="Role"
              name="role"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as ManagedAuthUserRole | "ALL")
              }
            >
              <option value="ALL">All roles</option>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {humanizeToken(role)}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              name="isActive"
              value={activeFilter}
              onChange={(event) =>
                setActiveFilter(event.target.value as "ALL" | "true" | "false")
              }
            >
              <option value="ALL">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <div className="flex items-end">
              <Button type="submit" disabled={loading}>
                Search
              </Button>
            </div>
          </form>

          {loading ? (
            <InlineLoadingCard lines={6} />
          ) : (
            <DataTable
              rows={users}
              emptyMessage="No managed users found."
              columns={[
                {
                  key: "user",
                  header: "User",
                  render: (user) => (
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <p className="font-semibold text-foreground">
                        {user.name || "Unnamed user"}
                      </p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </button>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  render: (user) => <Badge value={user.role} />,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (user) => (
                    <Badge value={user.isActive ? "ACTIVE" : "INACTIVE"} />
                  ),
                },
                {
                  key: "verified",
                  header: "Verified",
                  render: (user) => (user.isVerified ? "Yes" : "No"),
                },
              ]}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Create managed user
          </h3>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              createUser(new FormData(event.currentTarget), event.currentTarget);
            }}
          >
            <Field label="Name" name="name" placeholder="Operations Lead" required />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="ops.lead@example.com"
              required
            />
            <Field
              label="Temporary password"
              name="password"
              type="password"
              minLength={8}
              required
            />
            <Select label="Role" name="role" defaultValue="OPERATOR">
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {humanizeToken(role)}
                </option>
              ))}
            </Select>
            <label className="text-sm text-text-secondary md:col-span-2">
              <input className="mr-2" type="checkbox" name="isActive" defaultChecked />
              User is active
            </label>
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <MutationStatus error={error} success={message} />
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Create user"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        {selectedUser ? (
          <Card className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {selectedUser.name || selectedUser.email}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {selectedUser.id}
              </p>
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateUser(new FormData(event.currentTarget), selectedUser.id);
              }}
            >
              <Field
                label="Name"
                name="name"
                defaultValue={selectedUser.name ?? ""}
                required
              />
              <Select label="Role" name="role" defaultValue={selectedUser.role}>
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>
                    {humanizeToken(role)}
                  </option>
                ))}
              </Select>
              <label className="text-sm text-text-secondary">
                <input
                  className="mr-2"
                  type="checkbox"
                  name="isActive"
                  defaultChecked={selectedUser.isActive}
                />
                User is active
              </label>
              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Updating..." : "Update user"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="danger" type="button" disabled={isPending}>
                      Deactivate account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deactivate {selectedUser.name || selectedUser.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disable the user account and immediately revoke all active sessions.
                        The user will be logged out and unable to log back in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-danger text-white hover:bg-danger-hover"
                        onClick={() => deactivateUser(selectedUser.id)}
                      >
                        Confirm Deactivation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>

            <form
              className="grid gap-4 border-t border-[var(--border-soft)] pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                resetPassword(
                  new FormData(event.currentTarget),
                  selectedUser.id,
                  event.currentTarget,
                );
              }}
            >
              <Field
                label="New temporary password"
                name="password"
                type="password"
                minLength={8}
                required
              />
              <Button type="submit" variant="secondary" disabled={isPending}>
                Reset password
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              Select a managed user to update their status or reset their password.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
