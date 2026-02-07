interface PlaceholderScreenProps {
  title: string;
  message: string;
}

export function PlaceholderScreen({ title, message }: PlaceholderScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-5">
      <div className="glass rounded-3xl p-8 text-center max-w-sm">
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/60 text-sm">{message}</p>
      </div>
    </div>
  );
}
