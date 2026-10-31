"use client";

import { useParams } from "next/navigation";
import IncidentPage from "../../../../dashboard-pages/IncidentPage";

export default function IncidentRoute() {
  const params = useParams<{ id: string }>();
  return <IncidentPage id={params.id} />;
}
