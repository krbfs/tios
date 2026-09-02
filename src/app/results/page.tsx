import { redirect } from "next/navigation";

import { getDemoEncdata, upgradeLegacyDemoEncdata } from "@/lib/encdata";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResultsRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (typeof params.encdata === "string") {
    query.set("encdata", upgradeLegacyDemoEncdata(params.encdata));
  } else if (typeof params.id === "string") {
    query.set("id", params.id);
  } else if (typeof params.token === "string") {
    query.set("token", params.token);
  } else {
    query.set("encdata", getDemoEncdata());
  }

  redirect(`/results.html?${query.toString()}`);
}
