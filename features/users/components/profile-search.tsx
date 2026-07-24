"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useProfileSearch } from "../api/profile-api";

export function ProfileSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get("phoneNumber") || "");

  const queryEmail = searchParams.get("email") || undefined;
  const queryPhone = searchParams.get("phoneNumber") || undefined;

  const { data: profiles, isLoading, isError, error } = useProfileSearch({
    email: queryEmail,
    phoneNumber: queryPhone,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (email) {
      params.set("email", email);
    } else {
      params.delete("email");
    }
    if (phoneNumber) {
      params.set("phoneNumber", phoneNumber);
    } else {
      params.delete("phoneNumber");
    }
    // Clear the selected authUserId when a new search starts
    params.delete("authUserId");
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelect = (authUserId: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("authUserId", authUserId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Find a profile</h2>
        <p className="text-sm text-text-secondary">
          Enter an email or phone number to look up customer or staff profiles.
        </p>
      </div>

      <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
        <Field
          label="Email"
          placeholder="customer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Phone Number"
          placeholder="+919876543210"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Button type="submit" disabled={!email && !phoneNumber}>
          Search
        </Button>
      </form>

      {(queryEmail || queryPhone) && (
        <div className="pt-4 border-t border-surface-hover">
          {isError ? (
            <p className="text-sm text-danger">{error?.message || "Failed to search profiles."}</p>
          ) : (
            <DataTable
              rows={profiles || []}
              emptyMessage={isLoading ? "Searching..." : "No profiles found."}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-foreground">{row.fullName || "No name"}</p>
                      <p className="text-xs text-text-muted">{row.authUserId}</p>
                    </div>
                  ),
                },
                {
                  key: "contact",
                  header: "Contact",
                  render: (row) => (
                    <div className="text-sm">
                      <div>{row.email}</div>
                      <div className="text-text-secondary">{row.phoneNumber || "No phone"}</div>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  render: (row) => <Badge value={row.role} />,
                },
                {
                  key: "action",
                  header: "",
                  render: (row) => (
                    <div className="text-right">
                      <Button variant="secondary" onClick={() => handleSelect(row.authUserId)}>
                        Edit
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}
    </Card>
  );
}
