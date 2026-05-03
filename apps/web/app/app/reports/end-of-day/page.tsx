import { ReportsShell } from "../../../_components/reports-shell";

export default async function EndOfDayReportPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const rawDate = searchParams.date;
  const initialDate = typeof rawDate === "string" ? rawDate : undefined;

  return <ReportsShell initialDate={initialDate} />;
}
