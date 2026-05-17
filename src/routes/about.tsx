import { createFileRoute } from "@tanstack/react-router";
import { Siggy } from "@/components/Siggy";
import { Shield, Sparkles, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Ritual Riddle Quest" },
      { name: "description", content: "Ritual Riddle Quest is a live onchain riddle platform for the Ritual ecosystem." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.2fr]">
        <div className="flex justify-center">
          <Siggy size={280} />
        </div>
        <div>
          <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">About the quest</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-holographic">Ritual Riddle Quest</h1>
          <p className="mt-5 text-muted-foreground">
            Ritual Riddle Quest is a live onchain community event built for the Ritual ecosystem.
            Solve riddles, sign a real Ritual chain interaction, and climb a transparent leaderboard
            curated by Siggy, the keeper of the ritual.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Feature icon={<Sparkles className="size-5 text-accent" />} title="Live quests"
              text="New riddles drop on a schedule. Each one has a winner cap, XP reward, and a unique badge." />
            <Feature icon={<Zap className="size-5 text-pink-glow" />} title="Onchain proof"
              text="Every answer is anchored by a signed message on Ritual chain. No funds spent." />
            <Feature icon={<Trophy className="size-5 text-ritual-green" />} title="Global leaderboard"
              text="Compete with the Ritual community across every quest. Speed and accuracy both matter." />
            <Feature icon={<Shield className="size-5 text-primary" />} title="Fair play"
              text="One submission per wallet. Bans for cheaters. Curated by trusted moderators." />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-2 flex items-center gap-2">{icon}<span className="font-semibold">{title}</span></div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}