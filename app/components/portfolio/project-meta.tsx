type MediaFallbackProps = {
  label: string;
};

export function MediaFallback({ label }: MediaFallbackProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#e9e9e6]">
      <span className="text-xs text-[#666663]">{label}</span>
    </div>
  );
}

type MetadataProps = {
  disciplines: string[];
};

export function Metadata({ disciplines }: MetadataProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-[#686864]">
      {disciplines.map(function renderDiscipline(discipline) {
        return <span key={discipline}>{discipline}</span>;
      })}
    </div>
  );
}
