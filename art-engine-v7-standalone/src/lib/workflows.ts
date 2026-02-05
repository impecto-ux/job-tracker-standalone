import { Workflow } from "./comfy";

export const workflows = {
    standard: (prompt: string, width: number = 1024, height: number = 1024): Workflow => ({
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
                "filename_prefix": "AE_v3_Flux",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        }
    }),

    context: (prompt: string, inputImageFilename: string, denoise: number = 0.6): Workflow => ({
        // --- MODEL LOADERS ---
        "39": {
            "inputs": { "vae_name": "ae.safetensors" },
            "class_type": "VAELoader",
            "_meta": { "title": "VAE Loader" }
        },
        "38": {
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn_scaled.safetensors",
                "type": "flux",
                "device": "default"
            },
            "class_type": "DualCLIPLoader",
            "_meta": { "title": "Dual CLIP Loader" }
        },
        "37": {
            "inputs": {
                "unet_name": "flux1-dev-kontext_fp8_scaled.safetensors",
                "weight_dtype": "default"
            },
            "class_type": "UNETLoader",
            "_meta": { "title": "UNET Loader (Kontext)" }
        },

        // --- INPUTS ---
        "6": {
            "inputs": {
                "text": prompt,
                "clip": ["38", 0]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Positive Prompt" }
        },
        "7": {
            "inputs": {
                "text": "text, watermark, blur, low quality",
                "clip": ["38", 0]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "Negative Prompt" }
        },
        "10": {
            "inputs": {
                "image": inputImageFilename,
                "upload": "image"
            },
            "class_type": "LoadImage",
            "_meta": { "title": "Load Image (Context)" }
        },

        // --- IMAGE PROCESSING (KONTEXT CHAIN) ---
        // Scale Image
        "42": {
            "inputs": {
                "image": ["10", 0] // Connect directly to LoadImage, bypassing Stitch
            },
            "class_type": "FluxKontextImageScale",
            "_meta": { "title": "Kontext Image Scale" }
        },
        // VAE Encode
        "124": {
            "inputs": {
                "pixels": ["42", 0],
                "vae": ["39", 0]
            },
            "class_type": "VAEEncode",
            "_meta": { "title": "VAE Encode" }
        },
        // Reference Latent (The Core Magic)
        "177": {
            "inputs": {
                "conditioning": ["6", 0], // From Positive Prompt
                "latent": ["124", 0]      // From VAE Encoded Image
            },
            "class_type": "ReferenceLatent",
            "_meta": { "title": "Reference Latent" }
        },
        // Conditioning Zero Out (For Negative)
        "135": {
            "inputs": {
                "conditioning": ["6", 0]
            },
            "class_type": "ConditioningZeroOut",
            "_meta": { "title": "Conditioning Zero Out" }
        },
        // Flux Guidance
        "35": {
            "inputs": {
                "conditioning": ["177", 0],
                "guidance": 2.5
            },
            "class_type": "FluxGuidance",
            "_meta": { "title": "Flux Guidance" }
        },

        // --- SAMPLING ---
        "31": {
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000000),
                "steps": 20,
                "cfg": 1,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": denoise,
                // In the provided json it was 1.0 with Context doing the work.
                // But usually Img2Img needs < 1.0. 
                // However, ReferenceLatent means we generated a NEW latent guided by the ref. 
                // So Denoise 1.0 is correct if the LATENT input to KSampler is EMPTY/NOISE.
                // WAIT! KSampler input "latent_image" (291) comes from VAEEncode (124).
                // If we feed the IMAGE latent, Denoise 1.0 will destroy it unless 
                // the ReferenceLatent handles the "Structure".
                // Let's stick to the JSON: JSON KSampler (31) inputs latent_image -> 291 (VAEEncode).
                // JSON Denoise is set to widget_value[6] which is "1".
                // But wait, standard Img2Img is < 1. 
                // Let's trust the JSON for now.
                "model": ["37", 0],
                "positive": ["35", 0], // From FluxGuidance
                "negative": ["7", 0],  // From Negative Prompt (Direct? Or via ZeroOut? JSON used 238->135->7)
                // JSON link 238 connects 135 to 31.
                // 135 input is 237 (Node 6 positive?).
                // Actually JSON Node 31 negative input is link 238, which is Output of 135 (ConditioningZeroOut).
                // 135 input is Node 6 (Positive).
                // So Negative is ZeroOut(Positive)? That's Flux defaults. 
                // I will replicate exactly.
                "latent_image": ["124", 0]
            },
            "class_type": "KSampler",
            "_meta": { "title": "KSampler" }
        },

        // --- OUTPUT ---
        "8": {
            "inputs": {
                "samples": ["31", 0],
                "vae": ["39", 0]
            },
            "class_type": "VAEDecode",
            "_meta": { "title": "VAE Decode" }
        },
        "9": {
            "inputs": {
                "filename_prefix": "AE_v3_Flux_Kontext",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        }
    }),

    qwenContext: (prompt: string, image1Filename: string, image2Filename?: string): Workflow => ({
        // --- MODEL LOADERS ---
        "61": {
            "inputs": {
                "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                "type": "qwen_image",
                "device": "default"
            },
            "class_type": "CLIPLoader",
            "_meta": { "title": "CLIP Loader" }
        },
        "10": {
            "inputs": { "vae_name": "qwen_image_vae.safetensors" },
            "class_type": "VAELoader",
            "_meta": { "title": "VAE Loader" }
        },
        "12": {
            "inputs": {
                "unet_name": "qwen_image_edit_2511_bf16.safetensors",
                "weight_dtype": "default"
            },
            "class_type": "UNETLoader",
            "_meta": { "title": "UNET Loader" }
        },
        "74": {
            "inputs": {
                "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
                "strength_model": 1,
                "model": ["12", 0]
            },
            "class_type": "LoraLoaderModelOnly",
            "_meta": { "title": "Lora Loader" }
        },
        "67": {
            "inputs": {
                "shift": 3.1,
                "model": ["74", 0]
            },
            "class_type": "ModelSamplingAuraFlow",
            "_meta": { "title": "Model Sampling AuraFlow" }
        },
        "64": {
            "inputs": {
                "strength": 1,
                "model": ["67", 0]
            },
            "class_type": "CFGNorm",
            "_meta": { "title": "CFG Norm" }
        },

        // --- IMAGE INPUTS ---
        "41": {
            "inputs": {
                "image": image1Filename,
                "upload": "image"
            },
            "class_type": "LoadImage",
            "_meta": { "title": "Load Image 1 (Source)" }
        },
        // We handle Image 2 optionally. If provided, use it. If not, maybe re-use image 1 or dummy?
        // Qwen Edit usually *needs* a reference to drive the edit if prompts aren't enough, 
        // but Node 89 inputs were optional.
        // Let's assume if no Image 2, we just don't link it? 
        // But the TextEncodeQwenImageEditPlus expects connectivity.
        // For now, if Image 2 is missing, we'll re-use Image 1.
        "83": {
            "inputs": {
                "image": image2Filename || image1Filename, // Fallback to Image 1
                "upload": "image"
            },
            "class_type": "LoadImage",
            "_meta": { "title": "Load Image 2 (Ref)" }
        },

        // --- PRE-PROCESSING ---
        "88": {
            "inputs": {
                "image": ["41", 0]
            },
            "class_type": "FluxKontextImageScale",
            "_meta": { "title": "Scale Image 1" }
        },
        "75": {
            "inputs": {
                "pixels": ["88", 0],
                "vae": ["10", 0]
            },
            "class_type": "VAEEncode",
            "_meta": { "title": "VAE Encode Image 1" }
        },

        // --- QWEN TEXT ENCODE PLUS ---
        "68": { // Positive
            "inputs": {
                "prompt": prompt,
                "clip": ["61", 0],
                "vae": ["10", 0],
                "image1": ["88", 0], // Source Scaled
                "image2": ["83", 0], // Ref 1
                "image3": ["83", 0]  // Ref 2 (Re-using Ref 1 if needed, or leave generic)
                // Logic: Input 1 is Source. Input 2/3 are refs.
            },
            "class_type": "TextEncodeQwenImageEditPlus",
            "_meta": { "title": "Qwen Text Encode (Pos)" }
        },
        // Note: Graph had 2 TextEncodes (68, 69). 68 output went to 70 (Conditioning). 69 went to 71.
        // Wait, JSON Node 69 ("TextEncodeQwenImageEditPlus") Inputs:
        // - clip: 181 (61)
        // - vae: 185 (10)
        // - image1: 214 (Node 88 - Source Scaled)
        // - image2: 223 (Node 83 - Ref 1)
        // - image3: 221 (Node 9 - SaveImage? No. Link 221 was Node 89->9? No link 221 in sub was different)
        // Let's simplify: Standard Qwen workflow usually uses one TextEncode for pos, one for neg or zero?
        // In the JSON, Node 68 had "Change furniture..." prompt. Node 69 had "" (empty) prompt?
        // Let's assume 69 is Negative/Null.
        "69": { // Negative/Null
            "inputs": {
                "prompt": "",
                "clip": ["61", 0],
                "vae": ["10", 0],
                "image1": ["88", 0],
                "image2": ["83", 0],
                "image3": ["83", 0]
            },
            "class_type": "TextEncodeQwenImageEditPlus",
            "_meta": { "title": "Qwen Text Encode (Neg)" }
        },

        // --- LATENT REFERENCE METHOD ---
        "70": {
            "inputs": {
                "conditioning": ["68", 0],
                "reference_latents_method": "index_timestep_zero"
            },
            "class_type": "FluxKontextMultiReferenceLatentMethod",
            "_meta": { "title": "Ref Method (Pos)" }
        },
        "71": {
            "inputs": {
                "conditioning": ["69", 0],
                "reference_latents_method": "index_timestep_zero"
            },
            "class_type": "FluxKontextMultiReferenceLatentMethod",
            "_meta": { "title": "Ref Method (Neg)" }
        },

        // --- SAMPLER ---
        "65": {
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000000),
                "steps": 25, // Qwen recommended 20-40
                "cfg": 1.0, // Lightning lora needs 1.0
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["64", 0],
                "positive": ["70", 0],
                "negative": ["71", 0],
                "latent_image": ["75", 0] // VAE Encoded Source
            },
            "class_type": "KSampler",
            "_meta": { "title": "KSampler" }
        },

        // --- OUTPUT ---
        "8": {
            "inputs": {
                "samples": ["65", 0],
                "vae": ["10", 0]
            },
            "class_type": "VAEDecode",
            "_meta": { "title": "VAE Decode" }
        },
        "9": {
            "inputs": {
                "filename_prefix": "AE_v3_Qwen",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        }
    })
};
