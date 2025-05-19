import { checkBalanceThenDeduct } from "@/utils/checkBalanceThenDeduct"
import { supabase } from "@/utils/supabase"
import { NextResponse } from "next/server"

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return response
}

export async function POST(request: Request) {
    const header = request.headers
    const accessToken = header.get("Authorization")?.split(" ")[1]
    const refreshToken = header.get("X-Refresh-Token")
    if (!accessToken || !refreshToken) {
        return NextResponse.json({ error: "Missing access/refresh token" }, { status: 401, headers: { "Content-Type": "application/json" } })
    }
    const { data: sessionData } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    })
    if (!sessionData.session || !sessionData.session.user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: { "Content-Type": "application/json" } })
    }
    const { user } = sessionData.session
    if (!user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: { "Content-Type": "application/json" } })
    }
    try {
        await checkBalanceThenDeduct(
            user.id,
            20000,
        )
    } catch (error) {
        console.error("Balance check failed:", error);
        return new Response(
            JSON.stringify({ error: "Insufficient balance" }),
            {
                status: 402, headers: {
                    "Content-Type": "application/json",
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            }
        );
    }
}