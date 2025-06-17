import { checkBalanceThenDeduct } from "@/utils/checkBalanceThenDeduct"
import { supabase } from "@/utils/supabase"
import { NextResponse } from "next/server"

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, authorization")
    return response
}

interface AuthPayload {
    access_token?: string;
    refresh_token?: string;
}


export async function POST(request: Request) {
    const body = await request.json() as AuthPayload;
    if (!body.refresh_token || !body.access_token) {
        return NextResponse.json({ error: "Missing access/refresh token" }, { status: 401 });
    }

    const { data: sessionData } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
    })
    if (!sessionData.session || !sessionData.session.user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    try {
        await checkBalanceThenDeduct(
            sessionData.session.user.id,
            process.env.ANALYSIS_UNLOCK_COST ? parseInt(process.env.ANALYSIS_UNLOCK_COST) : 20
        )
    }
    catch (error) {
        console.error("Balance check failed:", error);
        return NextResponse.json(
            { error: "Insufficient balance" },
            { status: 402 }
        );
    }

    return NextResponse.json(
        { status: 200, message: "Balance checked and deducted successfully" },
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, authorization",
                "Access-Control-Max-Age": "86400",
            }
        }
    );
}