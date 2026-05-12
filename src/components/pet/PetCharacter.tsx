import type { PetMood } from "@/types/pet";

interface Props {
  mood: PetMood;
}

const MOOD_EMOJI: Record<PetMood, string> = {
  happy: "(◕‿◕✿)",
  normal: "(•‿•)",
  angry: "(ᗒᗣᗕ)՞",
  sleepy: "(´-ω-`)",
  working: "(ง •̀_•́)ง",
};

const MOOD_COLOR: Record<PetMood, string> = {
  happy: "from-pink-400 to-purple-400",
  normal: "from-primary-400 to-primary-500",
  angry: "from-red-400 to-orange-400",
  sleepy: "from-indigo-300 to-purple-300",
  working: "from-green-400 to-teal-400",
};

export default function PetCharacter({ mood }: Props) {
  return (
    <div className="flex flex-col items-center">
      {/* Character body - placeholder with emoji face */}
      <div
        className={`
          w-24 h-24 rounded-full bg-gradient-to-br ${MOOD_COLOR[mood]}
          shadow-lg flex items-center justify-center
          transition-all duration-300 hover:scale-105
          border-2 border-white/40
        `}
      >
        <span className="text-3xl select-none">{MOOD_EMOJI[mood]}</span>
      </div>

      {/* Name tag */}
      <div className="mt-1 px-3 py-0.5 glass rounded-full text-xs text-fluent-text font-medium shadow-sm">
        JJ
      </div>
    </div>
  );
}
