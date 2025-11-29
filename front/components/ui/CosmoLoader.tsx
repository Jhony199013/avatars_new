type CosmoLoaderProps = {
  ariaLabel?: string;
};

export function CosmoLoader({ ariaLabel = "Загрузка..." }: CosmoLoaderProps) {
  return (
    <div className="flex flex-col items-center" role="status" aria-live="polite">
      <div className="relative flex items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-transparent shadow-[0_0_18px_rgba(255,192,76,0.55)]"
          style={{
            borderTopColor: "#FFB347",
            borderRightColor: "#FFC94C",
          }}
        />
        <div className="absolute h-3 w-3 rounded-full bg-[#FFB347] opacity-70 blur-sm" />
      </div>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

