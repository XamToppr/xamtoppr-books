const rankCalculatorUrl = import.meta.env.VITE_RANK_API_URL || 'http://127.0.0.1:8000';

export default function RankCalculator() {
  return (
    <main className="h-screen min-h-[100dvh] w-full overflow-hidden">
      <iframe
        title="XamToppr Rank Calculator"
        src={rankCalculatorUrl}
        className="block h-full min-h-[100dvh] w-full border-0"
      />
    </main>
  );
}
