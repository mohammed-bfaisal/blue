import { supabase } from "./supabase";
import type { Guide, User, Notification, Method, Material, Dispute } from "../types";

// ─── PROFILE ──────────────────────────────────────────────────

export async function sbGetProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase!
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function sbUpdateProfile(
  userId: string,
  updates: Partial<Pick<User, "username" | "avatar_url">>
) {
  const { error } = await supabase!
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

// ─── GUIDES ───────────────────────────────────────────────────

function mapGuideRow(row: any): Guide {
  return {
    ...row,
    niche: row.niches?.name ?? row.niche ?? "",
    author_username: row.profiles?.username ?? row.author_username ?? "",
    author_role: row.profiles?.role ?? row.author_role ?? "user",
    tags: Array.isArray(row.tags) ? row.tags : [],
    level: Number(row.level),
    upvotes: Number(row.upvotes),
    verifier_count: Number(row.verifier_count),
  };
}

export async function sbGetGuides(params: {
  niche?: string;
  level?: number;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Guide[]> {
  const { niche, level, search, status = "approved", limit = 50, offset = 0 } = params;

  let query = supabase!
    .from("guides")
    .select("*, niches!niche_id(name, slug), profiles!author_id(username, role)")
    .eq("status", status)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (level) query = query.eq("level", level);

  if (niche && niche !== "All") {
    // Filter via niche name — subquery using niche slug/name
    const { data: nicheRow } = await supabase!
      .from("niches")
      .select("id")
      .eq("name", niche)
      .single();
    if (nicheRow) query = query.eq("niche_id", nicheRow.id);
  }

  if (search) {
    query = query.textSearch("search_vector", search, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapGuideRow);
}

export async function sbGetGuide(id: string): Promise<Guide | null> {
  const { data: guide, error } = await supabase!
    .from("guides")
    .select("*, niches!niche_id(name, slug), profiles!author_id(username, role)")
    .eq("id", id)
    .single();
  if (error || !guide) return null;

  const [{ data: methods }, { data: materials }, { data: prereqs }] = await Promise.all([
    supabase!.from("methods").select("*").eq("guide_id", id).order("sort_order"),
    supabase!.from("materials").select("*").eq("guide_id", id).order("sort_order"),
    supabase!.from("guide_prerequisites").select("requires_id").eq("guide_id", id),
  ]);

  return {
    ...mapGuideRow(guide),
    methods: (methods ?? []) as Method[],
    materials: (materials ?? []) as Material[],
    requires: (prereqs ?? []).map((p: any) => p.requires_id),
  };
}

export async function sbCreateGuide(data: {
  title: string;
  description: string;
  niche: string;
  level: number;
  content: string;
  tags: string[];
  author_id: string;
}): Promise<Guide> {
  // Resolve niche name → niche_id
  const { data: nicheRow, error: nicheErr } = await supabase!
    .from("niches")
    .select("id")
    .eq("name", data.niche)
    .single();
  if (nicheErr || !nicheRow) throw new Error(`Niche "${data.niche}" not found`);

  const { data: guide, error } = await supabase!
    .from("guides")
    .insert({
      title: data.title,
      description: data.description,
      niche_id: nicheRow.id,
      level: data.level,
      content: data.content,
      tags: data.tags,
      author_id: data.author_id,
    })
    .select("*, niches!niche_id(name, slug), profiles!author_id(username, role)")
    .single();
  if (error) throw error;
  return mapGuideRow(guide);
}

export async function sbSubmitGuide(guideId: string) {
  const { error } = await supabase!
    .from("guides")
    .update({ status: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", guideId);
  if (error) throw error;
}

export async function sbSaveMethods(
  guideId: string,
  methods: Array<{ title: string; description: string; steps: string[]; sort_order: number }>
) {
  await supabase!.from("methods").delete().eq("guide_id", guideId);
  if (methods.length === 0) return;
  const { error } = await supabase!.from("methods").insert(
    methods.map((m) => ({ guide_id: guideId, ...m }))
  );
  if (error) throw error;
}

export async function sbSaveMaterials(
  guideId: string,
  materials: Array<{
    name: string;
    description: string;
    optional: boolean;
    rating?: number;
    sort_order: number;
  }>
) {
  await supabase!.from("materials").delete().eq("guide_id", guideId);
  if (materials.length === 0) return;
  const { error } = await supabase!.from("materials").insert(
    materials.map((m) => ({ guide_id: guideId, ...m }))
  );
  if (error) throw error;
}

export async function sbSavePrerequisites(guideId: string, requiresIds: string[]) {
  await supabase!.from("guide_prerequisites").delete().eq("guide_id", guideId);
  if (requiresIds.length === 0) return;
  const { error } = await supabase!.from("guide_prerequisites").insert(
    requiresIds.map((rid) => ({ guide_id: guideId, requires_id: rid }))
  );
  if (error) throw error;
}

// ─── UPVOTES ──────────────────────────────────────────────────

export async function sbToggleUpvote(
  guideId: string,
  userId: string,
  currentlyVoted: boolean
) {
  if (currentlyVoted) {
    const { error } = await supabase!
      .from("guide_upvotes")
      .delete()
      .eq("guide_id", guideId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase!
      .from("guide_upvotes")
      .insert({ guide_id: guideId, user_id: userId });
    if (error) throw error;
  }
}

export async function sbGetUserUpvotes(userId: string): Promise<string[]> {
  const { data, error } = await supabase!
    .from("guide_upvotes")
    .select("guide_id")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r: any) => r.guide_id);
}

// ─── VERIFIER QUEUE ───────────────────────────────────────────

export async function sbGetVerifierQueue(userId: string) {
  const { data, error } = await supabase!
    .from("verification_sessions")
    .select(
      "*, guides!guide_id(title, description, level, content, niches!niche_id(name))"
    )
    .is("resolved_at", null)
    .order("deadline", { ascending: true });

  if (error) throw error;

  // Filter to only sessions this verifier is assigned to
  const sessionIds = (data ?? []).map((s: any) => s.id);
  if (sessionIds.length === 0) return [];

  const { data: assignments } = await supabase!
    .from("session_verifiers")
    .select("session_id")
    .eq("verifier_id", userId)
    .in("session_id", sessionIds);

  const assignedIds = new Set((assignments ?? []).map((a: any) => a.session_id));
  return (data ?? []).filter((s: any) => assignedIds.has(s.id));
}

export async function sbCastVote(data: {
  session_id: string;
  verifier_id: string;
  decision: "approve" | "reject";
  reasoning: string;
  niche_note?: string;
  level_note?: number;
}) {
  const { error } = await supabase!.from("votes").insert(data);
  if (error) throw error;
}

// ─── DISPUTES ─────────────────────────────────────────────────

export async function sbOpenDispute(data: {
  guide_id: string;
  opener_id: string;
  reason: string;
}) {
  const { data: dispute, error } = await supabase!
    .from("disputes")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return dispute.id as string;
}

export async function sbGetGuideDisputes(guideId: string): Promise<Dispute[]> {
  const { data, error } = await supabase!
    .from("disputes")
    .select("*, profiles!opener_id(username)")
    .eq("guide_id", guideId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    ...d,
    opener_username: d.profiles?.username,
  })) as Dispute[];
}

// ─── NOTIFICATIONS ────────────────────────────────────────────

export async function sbGetNotifications(
  userId: string,
  limit = 30
): Promise<Notification[]> {
  const { data, error } = await supabase!
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function sbMarkNotificationRead(id: string) {
  const { error } = await supabase!
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function sbMarkAllNotificationsRead(userId: string) {
  const { error } = await supabase!
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export function sbSubscribeNotifications(
  userId: string,
  onNew: (n: Notification) => void
) {
  const channel = supabase!
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new as Notification)
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

// ─── STATS ────────────────────────────────────────────────────

export async function sbStats(): Promise<{
  guides: number;
  users: number;
  niches: number;
}> {
  const [{ count: guides }, { count: users }, { count: niches }] = await Promise.all([
    supabase!.from("guides").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase!.from("profiles").select("*", { count: "exact", head: true }),
    supabase!.from("niches").select("*", { count: "exact", head: true }),
  ]);
  return {
    guides: guides ?? 0,
    users: users ?? 0,
    niches: niches ?? 0,
  };
}
