import { NextRequest, NextResponse } from 'next/server';

const COMFY_API = "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";

        // 1. File Upload (for Flux Context Agent)
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();

            // Forward directly to ComfyUI /upload/image
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

        // 2. JSON Workflow Queue (for both agents)
        const body = await req.json();

        const res = await fetch(`${COMFY_API}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json({ error: "ComfyUI Queue Error", details: errText }, { status: res.status });
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
        const endpoint = searchParams.get('endpoint');

        // 1. Image Retrieval
        if (filename) {
            const comfyUrl = `${COMFY_API}/view?${searchParams.toString()}`;
            const res = await fetch(comfyUrl);

            if (!res.ok) throw new Error("Image not found");

            const blob = await res.blob();
            return new NextResponse(blob, {
                headers: { "Content-Type": "image/png" }
            });
        }

        // 2. Generic Endpoint (History, etc.)
        if (endpoint) {
            const res = await fetch(`${COMFY_API}${endpoint}`);
            const data = await res.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid Proxy Request" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: "Proxy Request Failed" }, { status: 500 });
    }
}
