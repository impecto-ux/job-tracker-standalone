
export const COMFY_API_URL = "http://127.0.0.1:8000";

interface ComfyPrompt {
    client_id: string;
    prompt: Record<string, any>;
}

export class ComfyClient {
    private clientId: string;
    private socket: WebSocket | null = null;
    private messageMap = new Map<string, (data: any) => void>();

    constructor() {
        this.clientId = Math.random().toString(36).substring(7);
    }

    async connect() {
        return new Promise<void>((resolve, reject) => {
            // WebSocket still connects directly to ComfyUI (usually allowed across origins if server permits, or less strict)
            // If this fails, we will need to proxy WS too (much harder).
            // Standard ComfyUI typically accepts WS from any origin if not configured strictly? 
            // User added --enable-cors-header *. This SHOULD allow WS too.
            this.socket = new WebSocket(`ws://127.0.0.1:8000/ws?clientId=${this.clientId}`);

            this.socket.onopen = () => {
                console.log("Connected to ComfyUI (WS)");
                resolve();
            };

            this.socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (this.messageMap.has(message.type)) {
                    this.messageMap.get(message.type)?.(message.data);
                }
            };

            this.socket.onerror = (err) => reject(err);
        });
    }

    on(type: string, callback: (data: any) => void) {
        this.messageMap.set(type, callback);
    }

    async queuePrompt(workflow: Record<string, any>) {
        const payload: ComfyPrompt = {
            client_id: this.clientId,
            prompt: workflow
        };

        // PROXY CHANGE: Call our own Next.js API route
        const res = await fetch(`/api/proxy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Proxy Queue Failed");
        return await res.json();
    }

    async getImage(filename: string, subfolder = "", type = "output") {
        // PROXY CHANGE: Call our own Next.js API route
        const params = new URLSearchParams({ filename, subfolder, type });
        const res = await fetch(`/api/proxy?${params}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }
}

export const comfy = new ComfyClient();
