import { useMemo } from "react";
import { getDashboardData } from "@/db/repo";
import { useDataVersion } from "@/db/DbContext";
import { formatDateLong, greeting } from "@/lib/format";
import { DashboardView } from "@/components/dashboard/DashboardView";

export function DashboardPage() {
  const version = useDataVersion();
  const data = useMemo(() => getDashboardData(), [version]);

  return (
    <DashboardView
      data={data}
      userName="corretor"
      dateLong={formatDateLong()}
      greetingText={greeting()}
    />
  );
}
