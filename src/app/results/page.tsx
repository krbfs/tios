import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResultsRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (typeof params.id === "string") {
    query.set("id", params.id);
  }
  if (typeof params.token === "string") {
    query.set("token", params.token);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/results.html${suffix}`);
}
