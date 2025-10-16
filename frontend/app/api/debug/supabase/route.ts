import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const env = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "DB query failed",
          error: {
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
          },
          env,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, sample: data, env })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e), env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      } },
      { status: 500 }
    )
  }
}