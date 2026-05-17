import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getLeaderboard } from "@/lib/quests.functions";
import { LeaderboardList } from "@/components/LeaderboardList";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · Ritual Riddle Quest" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(getLeaderboard);
  const q = useQuery({ queryKey: ["leaderboard", "all"], queryFn: () => fn({ data: {} }) });
  useEffect(() => {
    const ch = supabase.channel("lb-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <h1 className="font-display text-4xl font-bold mb-2 text-holographic">Top Ritualists</h1>
      <p className="text-muted-foreground mb-8">Global ranking across every Siggy quest.</p>
      <LeaderboardList rows={q.data ?? []} />
    </div>
  );
}
