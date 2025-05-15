import prisma from "@/utils/prisma";
import { supabase } from "@/utils/supabase";
import axios from "axios";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

interface PaymentPayload {
    gross_amount: number;
    access_token?: string;
    refresh_token?: string;
}
export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return response
}
export async function POST(request: Request) {
    const body = await request.json() as PaymentPayload;
    if (!body.refresh_token || !body.access_token) {
        return NextResponse.json({ error: "Missing access/refresh token" }, { status: 401 });
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
    })
    if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }
    if (!sessionData.session || !sessionData.session.user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = sessionData.session;

    if (!body.gross_amount) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (body.gross_amount <= 0) {
        return NextResponse.json({ error: "Gross amount must be greater than 0" }, { status: 400 });
    }
    const orderId = randomUUID().toString()
    const res = await axios.post("https://app.sandbox.midtrans.com/snap/v1/transactions", {
        transaction_details: {
            order_id: orderId,
            gross_amount: body.gross_amount,
        },
        "customer_details": {
            first_name: (user.user_metadata.name as string).split(" ").slice(
                0, -1
            ).join(" "),
            last_name: (user.user_metadata.name as string).split(" ").slice(-1).join(" "),
            email: user.email,
        },
    }, {
        headers: {
            "Authorization": "Basic " + Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64"),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
    })

    try {
        await prisma.$connect();
        await prisma.order.create({
            data: {
                order_id: orderId,
                user_id: user.id,
                amount: parseFloat(body.gross_amount.toString()),
                payment_link: res.data.redirect_url,
            }
        });
    } catch (error: any) {
        console.error("Error creating order:", error.message);
        return NextResponse.json({
            error: {
                ...error,
            }
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }

    const response = NextResponse.json({
        ...res.data,
        order_id: orderId,
    });
    return response;
}