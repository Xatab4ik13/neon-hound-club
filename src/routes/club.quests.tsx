import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getQuests } from "@/api/quests";
import { motion } from "framer-motion";
import { CheckCircle2, Trophy, Zap, Calendar, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/club/quests")({
  component: QuestsPage,
});

function QuestsPage() {
  const { data: quests, isLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: getQuests,
  });

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-[calc(env(safe-area-inset-bottom)+96px)] pt-safe">
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-[34px] font-bold tracking-tight text-black">Квесты</h1>
      </div>

      <div className="px-4 space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Выполнено", value: "12", icon: CheckCircle2 },
            { label: "Очки", value: "1,240", icon: Trophy },
            { label: "Серия", value: "5 дн", icon: Zap },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1">
              <stat.icon className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold text-black">{stat.value}</span>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Quests List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 px-1">Активные</h2>
          {isLoading ? (
            <div className="h-24 bg-white rounded-2xl animate-pulse" />
          ) : (
            quests?.map((quest: any) => (
              <motion.div
                key={quest.id}
                whileTap={{ scale: 0.98 }}
                className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 active:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{quest.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{quest.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    +{quest.reward} XP
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
