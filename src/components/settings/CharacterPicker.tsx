import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { PetMood } from "@/types/pet";

const MOODS: { key: PetMood; label: string }[] = [
  { key: "normal", label: "普通" },
  { key: "happy", label: "开心" },
  { key: "angry", label: "生气" },
  { key: "sleepy", label: "困倦" },
  { key: "working", label: "工作" },
];

export default function CharacterPicker() {
  const [characterImages, setCharacterImages] = useState<Record<string, string>>({});
  const [selectedMood, setSelectedMood] = useState<PetMood>("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const images = await invoke<Record<string, string>>("get_character_images");
      setCharacterImages(images);
    } catch (e) {
      console.error("Failed to load character images:", e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await invoke("save_character_image", {
          mood: selectedMood,
          imageData: base64,
        });
        await loadImages();
      } catch (err) {
        console.error("Failed to save character image:", err);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (mood: string) => {
    try {
      await invoke("delete_character_image", { mood });
      await loadImages();
    } catch (e) {
      console.error("Failed to delete character image:", e);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-fluent-muted">
        为桌宠的每种心情上传自定义图片。建议使用正方形透明背景的 PNG 图片。
      </p>

      {/* Mood selector */}
      <div className="flex gap-2 flex-wrap">
        {MOODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedMood(key)}
            className={`
              px-3 py-1.5 text-xs rounded-lg border transition-colors
              ${
                selectedMood === key
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white text-fluent-text border-gray-200 hover:border-primary-300"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Image preview */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden border-2 border-white shadow">
          {characterImages[selectedMood] ? (
            <img
              src={convertFileSrc(characterImages[selectedMood])}
              alt={selectedMood}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">
              {selectedMood === "happy"
                ? "(◕‿◕✿)"
                : selectedMood === "angry"
                ? "(ᗒᗣᗕ)՞"
                : selectedMood === "sleepy"
                ? "(´-ω-`)"
                : selectedMood === "working"
                ? "(ง •̀_•́)ง"
                : "(•‿•)"}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="char-upload"
          />
          <label
            htmlFor="char-upload"
            className="block text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 cursor-pointer transition-colors text-center"
          >
            上传图片
          </label>
          {characterImages[selectedMood] && (
            <button
              onClick={() => handleDelete(selectedMood)}
              className="block text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors w-full text-center"
            >
              恢复默认
            </button>
          )}
        </div>
      </div>

      {/* All moods preview */}
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map(({ key, label }) => (
          <div key={key} className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden border border-white shadow-sm">
              {characterImages[key] ? (
                <img
                  src={convertFileSrc(characterImages[key])}
                  alt={key}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs">
                  {key === "happy"
                    ? "^‿^"
                    : key === "angry"
                    ? ">_<"
                    : key === "sleepy"
                    ? "-_-"
                    : key === "working"
                    ? ">_>"
                    : "._."}
                </span>
              )}
            </div>
            <span className="text-xs text-fluent-muted mt-1">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
