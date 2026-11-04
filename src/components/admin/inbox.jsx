// src/components/admin/inbox.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { replyToEnquiry, setApplicationStatus, setEnquiryStatus } from "@/server/actions/admin-people";
import { cn, formatDate } from "@/lib/utils";
import { FilterTabs } from "@/components/admin/ui";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Tabs, useToast } from "@/components/ui/interactive";

const appTone = { approved: "success", rejected: "danger", reviewing: "info", new: "brand" };
const appLabel = { new: "New", reviewing: "Reviewing", approved: "Approved", rejected: "Declined" };
const shortDate = (iso) => formatDate(iso, { day: "numeric", month: "short" });

/** Contact-form messages and partner applications. `categoryNames` maps slug → name. */
export function AdminInbox({ enquiries, applications, categoryNames }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("open");
  const list = enquiries.filter((e) => filter === "all" || e.status === filter);
  const [selected, setSelected] = useState(list[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const msg = enquiries.find((e) => e.id === selected) ?? null;

  const run = (fn, success, after) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast(res.error);
      after?.(res);
      toast(typeof success === "function" ? success(res) : success);
      router.refresh();
    });

  const counts = (s) => enquiries.filter((e) => s === "all" || e.status === s).length;

  const messages = (
    <div className="space-y-3">
      <FilterTabs
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setSelected(enquiries.find((e) => v === "all" || e.status === v)?.id ?? null);
        }}
        options={[
          { value: "open", label: "Open", count: counts("open") },
          { value: "replied", label: "Replied", count: counts("replied") },
          { value: "closed", label: "Closed", count: counts("closed") },
          { value: "all", label: "All", count: counts("all") },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          {list.length ? (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      setSelected(e.id);
                      setReply("");
                    }}
                    className={cn("w-full px-4 py-3 text-left", selected === e.id ? "bg-ink-50" : "hover:bg-paper/60")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm", e.status === "open" ? "font-semibold" : "")}>{e.name}</span>
                      <span className="text-xs text-muted">{shortDate(e.date)}</span>
                    </div>
                    <p className="truncate text-sm">{e.subject || e.message}</p>
                    <div className="mt-1 flex gap-1.5">
                      <Badge tone={e.type === "Complaint" ? "danger" : "neutral"}>{e.type}</Badge>
                      {e.status === "open" && <Badge tone="brand">Open</Badge>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<InboxIcon />} title="Nothing here" />
          )}
        </Card>
        {msg ? (
          <Card className="flex min-w-0 flex-col">
            <div className="border-b border-line px-5 py-4">
              <p className="font-semibold">{msg.subject || `${msg.type} enquiry`}</p>
              <p className="text-sm text-muted">
                {msg.name},{" "}
                <a href={`mailto:${msg.email}`} className="hover:underline">
                  {msg.email}
                </a>
                {msg.phone && (
                  <>
                    ,{" "}
                    <a href={`tel:${msg.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {msg.phone}
                    </a>
                  </>
                )}
                {msg.bookingRef && (
                  <>
                    {" "}
                    · Booking{" "}
                    <Link href={`/admin/bookings/${msg.bookingRef}`} className="font-medium text-ink-900 hover:underline">
                      {msg.bookingRef}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex-1 space-y-4 px-5 py-5">
              <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
              {msg.replies.map((r, i) => (
                <div key={i} className="rounded-xl bg-paper p-3 text-sm ring-1 ring-line">
                  <p className="whitespace-pre-line">{r.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    Reply by {r.by}, {formatDate(r.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-line p-5">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to ${msg.name.split(" ")[0]}…`}
                maxLength={5000}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={pending || reply.trim().length < 2}
                  onClick={() =>
                    run(
                      () => replyToEnquiry(msg.id, reply),
                      "Reply sent",
                      () => setReply(""),
                    )
                  }
                >
                  Send reply
                </Button>
                {["Quote", "Booking", "Commercial"].includes(msg.type) && (
                  <Link
                    href="/admin/bookings/new"
                    className="inline-flex h-8 items-center rounded-[10px] border border-line-strong px-3 text-sm font-semibold hover:bg-ink-50"
                  >
                    Create booking
                  </Link>
                )}
                {msg.status !== "closed" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setEnquiryStatus(msg.id, "closed"), "Closed")}
                  >
                    Close
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setEnquiryStatus(msg.id, "open"), "Reopened")}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={<InboxIcon />} title={filter === "open" ? "Inbox zero" : "Select a message"} />
          </Card>
        )}
      </div>
    </div>
  );

  const applicationsView = applications.length ? (
    <div className="grid gap-4 lg:grid-cols-2">
      {applications.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{a.name}</p>
              <p className="text-sm text-muted">
                {a.business ? `${a.business}, ` : ""}applied {shortDate(a.date)}
              </p>
            </div>
            <Badge tone={appTone[a.status]}>{appLabel[a.status]}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            <a href={`tel:${a.phone.replace(/\s/g, "")}`} className="hover:underline">
              {a.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${a.email}`} className="hover:underline">
              {a.email}
            </a>
            {a.abn && ` · ABN ${a.abn}`}
            {a.experience && ` · ${a.experience} yrs`}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.skills.map((s) => (
              <span key={s} className="rounded-md bg-paper px-1.5 py-0.5 text-xs ring-1 ring-line">
                {categoryNames[s] ?? s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Zones: {a.zones.join(", ") || "—"}</p>
          {a.status !== "approved" && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setApplicationStatus(a.id, "approved"),
                    `${a.name} added as an onboarding provider`,
                    (res) => res.providerId && router.push(`/admin/providers/${res.providerId}`),
                  )
                }
              >
                Approve
              </Button>
              {a.status !== "reviewing" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setApplicationStatus(a.id, "reviewing"), "Marked reviewing")}
                >
                  Mark reviewing
                </Button>
              )}
              {a.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  disabled={pending}
                  onClick={() => run(() => setApplicationStatus(a.id, "rejected"), "Declined")}
                >
                  Decline
                </Button>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  ) : (
    <Card>
      <EmptyState title="No applications yet" body="Applications from the “Become a partner” page land here." />
    </Card>
  );

  return (
    <>
      <Tabs
        tabs={[
          { id: "messages", label: `Messages (${counts("open")})`, content: messages },
          {
            id: "apps",
            label: `Provider applications (${applications.filter((a) => a.status === "new").length})`,
            content: applicationsView,
          },
        ]}
      />
      {toastNode}
    </>
  );
}