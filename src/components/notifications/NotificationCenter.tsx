import { useState } from "react";
import { C } from "../../lib/constants";
import type { Notification } from "../../types";

const NOTIF_ICONS: Record<string, string> = {
  submission_received: "📥",
  verification_assigned: "⚖️",
  vote_cast: "🗳️",
  guide_approved: "✅",
  guide_rejected: "❌",
  appeal_opened: "📣",
  appeal_resolved: "📋",
  dispute_opened: "⚠️",
  dispute_resolved: "🔒",
  standing_warning: "⚡",
  verifier_qualified: "🏅",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  isMobile: boolean;
}

export function NotificationBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      style={{ position: "relative", background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px", cursor: "pointer", color: C.muted, fontSize: 16, display: "flex", alignItems: "center" }}>
      🔔
      {unreadCount > 0 && (
        <span aria-hidden="true" style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: C.accent, color: "#000", fontSize: 9, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, isMobile, onClose }: NotificationCenterProps & { onClose: () => void }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const shown = filter === "unread" ? notifications.filter(n => !n.read) : notifications;

  return (
    <div style={{ position: isMobile ? "fixed" : "absolute", ...(isMobile ? { inset: 0, top: "auto", bottom: 0, left: 0, right: 0 } : { right: 0, top: "calc(100% + 8px)", width: 360 }), zIndex: 150, background: "#111", border: `1px solid ${C.borderBright}`, borderRadius: isMobile ? "14px 14px 0 0" : 6, boxShadow: "0 8px 40px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: isMobile ? "80vh" : 480, display: "flex", flexDirection: "column" }}>

      {isMobile && <div style={{ width: 36, height: 4, background: C.borderBright, borderRadius: 2, margin: "10px auto 0" }} />}

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>NOTIFICATIONS</span>
          {unreadCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 10, background: C.accent, color: "#000", fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}>{unreadCount}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unreadCount > 0 && <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>MARK ALL READ</button>}
          <button onClick={onClose} aria-label="Close notifications" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: "8px 0", background: "none", border: "none", color: filter === f ? C.accent : C.muted, fontSize: 9, fontFamily: "monospace", letterSpacing: 1, cursor: "pointer", borderBottom: filter === f ? `2px solid ${C.accent}` : "2px solid transparent" }}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {shown.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: C.muted, fontSize: 12 }}>
            {filter === "unread" ? "All caught up ✓" : "No notifications yet"}
          </div>
        ) : (
          shown.map(n => (
            <button key={n.id} onClick={() => onMarkRead(n.id)}
              style={{ display: "flex", gap: 12, padding: "12px 16px", width: "100%", textAlign: "left", background: n.read ? "none" : `${C.accent}06`, border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{NOTIF_ICONS[n.type] ?? "📌"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: n.read ? C.dim : C.text, fontFamily: "'Georgia', serif" }}>{n.title}</span>
                  <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.body}</p>
              </div>
              {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0, marginTop: 5 }} />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
