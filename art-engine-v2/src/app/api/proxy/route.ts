import { NextRequest, NextResponse } from 'next/server';

const COMFY_API = "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const res = await fetch(`${COMFY_API}/upload/image`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errText = await res.text();
                return NextResponse.json({ error: "ComfyUI Upload Error", details: errText }, { status: res.status });
            }

            const data = await res.json();
            return NextResponse.json(data);
        }

        const body = await req.json();

        // Proxy prompt queueing
        const res = await fetch(`${COMFY_API}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json({ error: "ComfyUI Error", details: errText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: "Proxy Failed", details: String(error) }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('filename');
        const endpoint = searchParams.get('endpoint'); // e.g., '/history/123'

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

        if (endpoint) {
            // Proxy Generic Endpoint (e.g. History)
            const res = await fetch(`${COMFY_API}${endpoint}`);
            const data = await res.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid Proxy Request. Need 'filename' or 'endpoint'" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: "Proxy Request Failed" }, { status: 500 });
    }
}
