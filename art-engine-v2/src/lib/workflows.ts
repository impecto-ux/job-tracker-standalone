import { Workflow } from "./comfy";

export const generateFluxWorkflow = (prompt: string, width: number = 1024, height: number = 1024): Workflow => {
    return {
        "3": {
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000000),
                "steps": 20,
                "cfg": 1,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler",
            "_meta": { "title": "KSampler" }
        },
        "4": {
            "inputs": { "ckpt_name": "flux1-dev-fp8.safetensors" },
            "class_type": "CheckpointLoaderSimple",
            "_meta": { "title": "Load Checkpoint" }
        },
        "5": {
            "inputs": { "width": width, "height": height, "batch_size": 1 },
            "class_type": "EmptyLatentImage",
            "_meta": { "title": "Empty Latent Image" }
        },
        "6": {
            "inputs": {
                "text": prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Positive Prompt" }
        },
        "7": {
            "inputs": {
                "text": "text, watermark, blur, low quality",
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Negative Prompt" }
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode",
            "_meta": { "title": "VAE Decode" }
        },
        "9": {
            "inputs": {
                "filename_prefix": "ArtEngine_Flux",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        }
    };
};

export const generateFluxImageToImageWorkflow = (prompt: string, inputImageFilename: string, denoise: number = 0.75): Workflow => {
    return {
        "3": {
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000000),
                "steps": 20,
                "cfg": 1,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": denoise,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["11", 0]
            },
            "class_type": "KSampler",
            "_meta": { "title": "KSampler" }
        },
        "4": {
            "inputs": { "ckpt_name": "flux1-dev-fp8.safetensors" },
            "class_type": "CheckpointLoaderSimple",
            "_meta": { "title": "Load Checkpoint" }
        },
        "6": {
            "inputs": {
                "text": prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Positive Prompt" }
        },
        "7": {
            "inputs": {
                "text": "text, watermark, blur, low quality",
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Negative Prompt" }
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode",
            "_meta": { "title": "VAE Decode" }
        },
        "9": {
            "inputs": {
                "filename_prefix": "ArtEngine_Flux_Img2Img",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        },
        "10": {
            "inputs": {
                "image": inputImageFilename,
                "upload": "image"
            },
            "class_type": "LoadImage",
            "_meta": { "title": "Load Image" }
        },
        "11": {
            "inputs": {
                "pixels": ["10", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEEncode",
            "_meta": { "title": "VAE Encode" }
        }
    };
};
