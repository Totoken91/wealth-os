import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Server-side proxy for Frankfurter (https://api.frankfurter.app).
 * Frankfurter is CORS-friendly today but has had outages and intermittent
 * blocking from some networks (corporate proxies, ad blockers). Routing
 * through our edge runtime guarantees the rate fetch works as long as Vercel
 * itself can reach Frankfurter.
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR",
      { cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `Frankfurter ${res.status}` },
        { status: 200 },
      );
    }
    const data = (await res.json()) as { rates?: { EUR?: number } };
    if (typeof data.rates?.EUR !== "number") {
      return NextResponse.json(
        { error: "Frankfurter: missing EUR rate" },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { rate: data.rates.EUR },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 200 },
    );
  }
}
