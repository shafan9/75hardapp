import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function resolveNextPath(rawNext: string | null): string {
  if (!rawNext) return "/dashboard";

  const decoded = (() => {
    try {
      return decodeURIComponent(rawNext);
    } catch {
      return rawNext;
    }
  })();

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return "/dashboard";
  }

  return decoded;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = resolveNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${nextPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
