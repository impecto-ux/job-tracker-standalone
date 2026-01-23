import { NextRequest, NextResponse } from 'next/server';

const COMFY_API = "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Proxy prompt queueing
        const res = await fetch(`${COMFY_API}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("ComfyUI Proxy Error:", err);
            return NextResponse.json({ error: "ComfyUI Error", details: err }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('filename');

        if (filename) {
            // Proxy Image Retrieval
            const comfyUrl = `${COMFY_API}/view?${searchParams.toString()}`;
            const res = await fetch(comfyUrl);

            if (!res.ok) throw new Error("Image not found");

            const blob = await res.blob();
            return new NextResponse(blob, {
                headers: { "Content-Type": "image/png" }
            });
        }

        return NextResponse.json({ error: "Missing filename" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: "Proxy Image Failed" }, { status: 500 });
    }
}
