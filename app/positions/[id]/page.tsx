import { PositionDetail } from "@/components/positions/PositionDetail";

export default function PositionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <PositionDetail id={params.id} />
    </div>
  );
}
