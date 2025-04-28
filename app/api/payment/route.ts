import axios from "axios";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

interface PaymentPayload {
    gross_amount: number;
    first_name: string;
    last_name: string;
    email: string;
}

export async function POST(request: Request) {
    const body = await request.json() as PaymentPayload;
    if (!body.gross_amount || !body.first_name || !body.last_name || !body.email) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (body.gross_amount <= 0) {
        return NextResponse.json({ error: "Gross amount must be greater than 0" }, { status: 400 });
    }
    const res = await axios.post("https://app.sandbox.midtrans.com/snap/v1/transactions", {
        transaction_details: {
            order_id: randomUUID().toString(),
            gross_amount: body.gross_amount,
        },
        "customer_details": {
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
        },
    }, {
        headers: {
            "Authorization": "Basic " + Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64"),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
    })
    console.log(res.data);
    return NextResponse.json(res.data);
}