"use client";

import { useState } from "react";
import { getCategory, reviews as seed } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { FilterTabs } from "@/components/admin/ui";
import { Badge, Card, EmptyState, Stars } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";

const tone = { published: "success", pending: "brand", hidden: "neutral" };

export function ReviewsManager() {
  const [list, setList] = useState(seed);
  const [filter, setFilter] = useState("all");
  const [replying, setReplying] = useState(null);
  const set = (id, status) => setList((x) => x.map((r) => (r.id === id ? { ...r, status } : r)));
  const shown = list.filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <div className="mb-4">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={["all", "pending", "published", "hidden"].map((v) => ({
            value: v,
            label: v[0].toUpperCase() + v.slice(1),
            count: v === "all" ? list.length : list.filter((r) => r.status === v).length,
          }))}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((r) => (
          <Card key={r.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {r.name} <span className="font-normal text-muted">from {r.suburb}</span>
                </p>
                <p className="text-sm text-muted">
                  {getCategory(r.category).name}, {formatDate(r.date, { day: "numeric", month: "short" })}
                </p>
              </div>
              <Badge tone={tone[r.status]}>{r.status}</Badge>
            </div>
            <Stars value={r.rating} className="mt-3" />
            <p className="mt-2 flex-1 leading-relaxed">“{r.text}”</p>
            {replying === r.id && <Textarea className="mt-3 min-h-20" placeholder="Public reply from Sorted" />}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              {r.status !== "published" && (
                <Button size="sm" onClick={() => set(r.id, "published")}>
                  Publish
                </Button>
              )}
              {r.status !== "hidden" && (
                <Button size="sm" variant="ghost" onClick={() => set(r.id, "hidden")}>
                  Hide
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setReplying(replying === r.id ? null : r.id)}>
                {replying === r.id ? "Cancel reply" : "Reply"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {shown.length === 0 && (
        <Card>
          <EmptyState title="No reviews here" body="New reviews from completed bookings land in Pending." />
        </Card>
      )}
    </>
  );
}
