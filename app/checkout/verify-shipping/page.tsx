import { redirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VerifyShipping({ searchParams }: Props) {
  const params = await searchParams;
  const order = typeof params.order === "string" ? params.order : "";
  const payment = typeof params.payment === "string" ? params.payment : "";
  const signature = typeof params.signature === "string" ? params.signature : "";

  const query = new URLSearchParams({ order, payment, signature });
  redirect(`/api/checkout/verify?${query.toString()}`);
}
