"use client";

export type CategoryChip = { id: string; label: string };

export function CategoryCarousel({
  chips,
  activeId,
  onSelect,
}: {
  chips: CategoryChip[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full gap-2">
        {chips.map((chip) => {
          const active = activeId === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                onSelect(chip.id);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition duration-200 sm:text-xs ${
                active
                  ? "border-orange-300 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.32)]"
                  : "border-amber-200/10 bg-white/[0.025] text-zinc-500 hover:border-orange-400/40 hover:bg-orange-400/5 hover:text-zinc-200"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
