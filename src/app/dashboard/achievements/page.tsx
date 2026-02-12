"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AchievementList } from "@/components/achievements/achievement-list";
import { ACHIEVEMENTS } from "@/lib/constants";
import { useAchievements } from "@/lib/hooks/use-achievements";
import { useAuth } from "@/lib/hooks/use-auth";
import { useGroup } from "@/lib/hooks/use-group";

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup();
  const { earned, checkAndAward, loading } = useAchievements(user?.id, group?.id);

  useEffect(() => {
    if (!user?.id || !group?.id) return;
    void checkAndAward();
  }, [user?.id, group?.id, checkAndAward]);

  if (authLoading || groupLoading || loading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-accent-violet/30 border-t-accent-violet"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-5 pb-6">
        <h1 className="text-2xl font-black gradient-text">Achievements</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl">🏅</p>
          <p className="mt-2 text-sm text-text-secondary">
            Join a squad to start earning achievements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black gradient-text">Achievements 🏅</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {earned.length} of {ACHIEVEMENTS.length} unlocked
        </p>
      </motion.div>

      <AchievementList achievements={ACHIEVEMENTS} earned={earned} />
    </div>
  );
}
