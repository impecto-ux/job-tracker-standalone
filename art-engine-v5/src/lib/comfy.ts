
const PROXY_URL = "/api/proxy";

export interface ComfyNode {
    inputs: Record<string, any>;
    class_type: string;
    _meta: { title: string };
}

export type Workflow = Record<string, ComfyNode>;

export const ComfyClient = {
    /**
     * Queues a prompt to the ComfyUI server via the Next.js Proxy.
     */
    async queuePrompt(workflow: Workflow): Promise<{ prompt_id: string }> {
        try {
            const res = await fetch(PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: workflow })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.details || "Queue Failed");
            }

            const data = await res.json();
            return data;
        } catch (error) {
            console.error("ComfyUI Queue Error:", error);
            throw error;
        }
    },

    /**
     * Fetch history including outputs for a specific prompt_id via Proxy.
     */
    async getHistory(promptId: string): Promise<any> {
        try {
            const res = await fetch(`${PROXY_URL}?endpoint=/history/${promptId}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data[promptId] || null;
        } catch (error) {
            console.error("History Fetch Error:", error);
            return null;
        }
    },

    /**
     * Uploads an image to the ComfyUI server via Proxy.
     */
    async uploadImage(file: File): Promise<string> {
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("overwrite", "true");

            const res = await fetch(PROXY_URL, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload Failed");

            const data = await res.json();
            // ComfyUI returns { name: "filename.png", subfolder: "", type: "input" }
            return data.name;
        } catch (error) {
            console.error("Image Upload Error:", error);
            throw error;
        }
    },

    /**
     * Generates a URL for viewing an image via the Proxy.
     */
    getImageUrl(filename: string): string {
        return `${PROXY_URL}?filename=${filename}&type=output`;
    }
};
