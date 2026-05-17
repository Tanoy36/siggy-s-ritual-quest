import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getPerformers } from "@/lib/quests.functions";
import { PerformersList } from "@/components/PerformersList";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Top Performers · Ritual Riddle Quest" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(getPerformers);
  const q = useQuery({ queryKey: ["performers", "all"], queryFn: () => fn({ data: {} }) });
  useEffect(() => {
    const ch = supabase.channel("lb-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <h1 className="font-display text-4xl font-bold mb-2 text-holographic">Top Performers</h1>
      <p className="text-muted-foreground mb-8">
        Every solver, every attempt. Winners rise to the top after each reveal · streaks ignite from consecutive cracks.
      </p>
      <PerformersList rows={q.data ?? []} />
    </div>
  );
}
