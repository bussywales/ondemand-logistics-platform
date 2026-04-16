import { ProductShell } from "../../../_components/product-shell";

export default async function JobDetailPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  return <ProductShell jobId={params.jobId} view="job-detail" />;
}
