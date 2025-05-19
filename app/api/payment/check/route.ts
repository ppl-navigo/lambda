import { NextResponse } from "next/server"
import prisma from "@/utils/prisma";
import { checkOrCreateBalance } from "@/utils/checkOrCreateBalance";
import { supabase } from "@/utils/supabase";

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, authorization")
    return response
}

interface PaymentPayload {
    access_token?: string;
    refresh_token?: string;
}

export async function POST(request: Request) {
    const body = await request.json() as PaymentPayload;
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

    await prisma.$connect()
    const orders = await prisma.order.findMany({
        where: {
            user_id: sessionData.session.user.id,
        },
        include: {
            payments: true
        }
    })

    const balance = await checkOrCreateBalance(sessionData.session.user.id)
    const response = NextResponse.json({
        status: 200,
        data: {
            balance,
            orders
        }
    });

    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, xyz")

    return response
}