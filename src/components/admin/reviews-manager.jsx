// src/components/admin/reviews-manager.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveReviewReply, setReviewStatus } from "@/server/actions/admin-people";
import { formatDate } from "@/lib/utils";
import { FilterTabs } from "@/components/admin/ui";
import { Badge, Card, EmptyState, Stars } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/interactive";

const tone = { published: "success", pending: "brand", hidden: "neutral" };
const label = { published: "Published", pending: "Pending", hidden: "Hidden" };

/** Publish, hide and reply to reviews. Only published reviews appear on the website. */
export function ReviewsManager({ reviews }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("all");
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState("");
  const shown = reviews.filter((r) => filter === "all" || r.status === filter);

  const run = (fn, success, after) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast(res.error);
      after?.();
      toast(success);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={["all", "pending", "published", "hidden"].map((v) => ({
            value: v,
            label: v === "all" ? "All" : label[v],
            count: v === "all" ? reviews.length : reviews.filter((r) => r.status === v).length,
          }))}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((r) => (
          <Card key={r.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {r.name} {r.suburb && <span className="font-normal text-muted">from {r.suburb}</span>}
                </p>
                <p className="text-sm text-muted">
                  {[r.categoryName, formatDate(r.date, { day: "numeric", month: "short", year: "numeric" })]
                    .filter(Boolean)
                    .join(", ")}
                  {r.bookingRef && (
                    <>
                      {" · "}
                      <Link href={`/admin/bookings/${r.bookingRef}`} className="hover:underline">
                        {r.bookingRef}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
            </div>
            <Stars value={r.rating} className="mt-3" />
            <p className="mt-2 flex-1 leading-relaxed">
              {r.text ? `“${r.text}”` : <span className="text-muted">No comment.</span>}
            </p>
            {r.reply && replying !== r.id && (
              <p className="mt-3 rounded-xl bg-paper p-3 text-sm ring-1 ring-line">
                <span className="font-medium">Our reply:</span> {r.reply}
              </p>
            )}
            {replying === r.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  className="min-h-20"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Public reply from Sorted (leave empty to remove)"
                  maxLength={1000}
                />
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => saveReviewReply(r.id, replyText),
                      replyText.trim() ? "Reply saved" : "Reply removed",
                      () => setReplying(null),
                    )
                  }
                >
                  Save reply
                </Button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              {r.status !== "published" && (
                <Button size="sm" disabled={pending} onClick={() => run(() => setReviewStatus(r.id, "published"), "Published")}>
                  Publish
                </Button>
              )}
              {r.status !== "hidden" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setReviewStatus(r.id, "hidden"), "Hidden")}
                >
                  Hide
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyText(r.reply);
                  setReplying(replying === r.id ? null : r.id);
                }}
              >
                {replying === r.id ? "Cancel reply" : r.reply ? "Edit reply" : "Reply"}
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
      {toastNode}
    </>
  );
}