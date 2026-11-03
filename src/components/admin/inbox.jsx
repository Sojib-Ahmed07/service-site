"use client";

import Link from "next/link";
import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { enquiries, getCategory, partnerApplications } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Tabs, useToast } from "@/components/ui/interactive";

export function AdminInbox() {
  const [selected, setSelected] = useState(enquiries[0]?.id);
  const [apps, setApps] = useState(partnerApplications);
  const { toast, toastNode } = useToast();
  const msg = enquiries.find((e) => e.id === selected);

  const messages = (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {enquiries.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setSelected(e.id)}
                className={cn("w-full px-4 py-3 text-left", selected === e.id ? "bg-ink-50" : "hover:bg-paper/60")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm", e.status === "open" ? "font-semibold" : "")}>{e.name}</span>
                  <span className="text-xs text-muted">{formatDate(e.date, { day: "numeric", month: "short" })}</span>
                </div>
                <p className="truncate text-sm">{e.subject}</p>
                <div className="mt-1 flex gap-1.5">
                  <Badge>{e.type}</Badge>
                  {e.status === "open" && <Badge tone="brand">Open</Badge>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {msg ? (
        <Card className="flex flex-col">
          <div className="border-b border-line px-5 py-4">
            <p className="font-semibold">{msg.subject}</p>
            <p className="text-sm text-muted">
              {msg.name},{" "}
              <a href={`mailto:${msg.email}`} className="hover:underline">
                {msg.email}
              </a>
            </p>
          </div>
          <p className="flex-1 px-5 py-5 leading-relaxed">{msg.message}</p>
          <div className="space-y-3 border-t border-line p-5">
            <Textarea placeholder={`Reply to ${msg.name.split(" ")[0]}…`} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => toast("Reply sent")}>
                Send reply
              </Button>
              {msg.type === "Quote" && (
                <Link
                  href="/admin/bookings/new"
                  className="inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-sm font-semibold hover:bg-ink-50"
                >
                  Create booking
                </Link>
              )}
              <Button size="sm" variant="ghost" onClick={() => toast("Marked as closed")}>
                Close
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<InboxIcon />} title="Inbox zero" />
        </Card>
      )}
    </div>
  );

  const applications = (
    <div className="grid gap-4 lg:grid-cols-2">
      {apps.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{a.name}</p>
              <p className="text-sm text-muted">
                {a.business}, applied {formatDate(a.date, { day: "numeric", month: "short" })}
              </p>
            </div>
            <Badge
              tone={
                a.status === "approved"
                  ? "success"
                  : a.status === "rejected"
                    ? "danger"
                    : a.status === "reviewing"
                      ? "info"
                      : "brand"
              }
            >
              {a.status}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.skills.map((s) => (
              <span key={s} className="rounded-md bg-paper px-1.5 py-0.5 text-xs ring-1 ring-line">
                {getCategory(s).name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Zones: {a.zones.join(", ")}</p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button
              size="sm"
              onClick={() =>
                setApps((x) => x.map((y) => (y.id === a.id ? { ...y, status: "approved" } : y))) ||
                toast(`${a.name} approved — add their documents in Providers`)
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setApps((x) => x.map((y) => (y.id === a.id ? { ...y, status: "reviewing" } : y)))}
            >
              Mark reviewing
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() => setApps((x) => x.map((y) => (y.id === a.id ? { ...y, status: "rejected" } : y)))}
            >
              Decline
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <Tabs
        tabs={[
          { id: "messages", label: `Messages (${enquiries.filter((e) => e.status === "open").length})`, content: messages },
          {
            id: "apps",
            label: `Provider applications (${apps.filter((a) => a.status === "new").length})`,
            content: applications,
          },
        ]}
      />
      {toastNode}
    </>
  );
}
