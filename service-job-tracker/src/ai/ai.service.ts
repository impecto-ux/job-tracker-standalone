import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TasksService } from '../tasks/tasks.service';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async parseJobRequest(text: string): Promise<{ data: { title: string; department: string; priority: string; description: string }; usage: number }> {
        // ... (Keep existing parseJobRequest logic if needed, but for brevity I will assumption it is untouched or I can just target the constructor and generateDailyReport)
        /* ... existing parseJobRequest implementation preserved ... */
        const prompt = `
      You are a Job Tracker Assistant. Analyze the following request and extract structured data.
      
      Request: "${text}"
      
      Output JSON only:
      {
        "title": "Short descriptive title (max 50 chars) in TURKISH",
        "department": "One of [Post-Production, Design, Development, Marketing, General]",
        "priority": "One of [P1, P2, P3]",
        "description": "The EXACT original request text. DO NOT TRANSLATE."
      }
      
      Rules:
      - "Urgent", "ASAP", "Broken" usually means P1.
      - "Review", "Check" is P2.
      - "Idea", "Maybe" is P3.
      - Map keywords like "lighting", "render", "comp" to Post-Production.
      - Map "logo", "brand", "ui" to Design.
      - Map "api", "bug", "code" to Development.
      - GENERATE ALL CONTENT IN TURKISH.
      - KEEP DESCRIPTION EXACTLY AS IS.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const usage = response.usageMetadata?.totalTokenCount || 0;
            const jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            return {
                data: JSON.parse(jsonStr),
                usage: usage
            };
        } catch (error) {
            console.error('AI Parsing Error:', error);
            // Fallback
            return {
                data: {
                    title: text.substring(0, 20) + '...',
                    department: 'General',
                    priority: 'P2',
                    description: text,
                },
                usage: 0
            };
        }
    }

    async generateDailyReport(userId: number): Promise<{ report: string; usage: number }> {
        console.log('--- GENERATING DAILY REPORT ---');
        console.log('User:', userId);
        console.log('API Key configured:', !!this.configService.get<string>('GEMINI_API_KEY'));

        // 1. Fetch Tasks
        let tasks: Task[] = [];
        try {
            if (!this.tasksService) throw new Error("TasksService injection failed");
            tasks = await this.tasksService.findAll();
            console.log(`DB Success: Fetched ${tasks.length} tasks.`);
        } catch (dbError) {
            console.error("DB Fetch Error:", dbError);
            return { report: `Error fetching tasks: ${dbError.message}`, usage: 0 };
        }

        const today = new Date().toDateString();
        const todaysTasks = tasks.filter(t =>
            new Date(t.createdAt).toDateString() === today ||
            new Date(t.updatedAt).toDateString() === today
        );
        console.log(`Filtered: ${todaysTasks.length} tasks for today.`);

        if (todaysTasks.length === 0) {
            return { report: "No activity found for today yet. Go create some tasks!", usage: 0 };
        }

        const completed = todaysTasks.filter(t => t.status === 'done');
        const created = todaysTasks.filter(t => new Date(t.createdAt).toDateString() === today);
        const p1 = todaysTasks.filter(t => t.priority === 'P1');

        const tasksSummary = todaysTasks.map(t =>
            `- [${t.status.toUpperCase()}] [${t.priority}] ${t.title} (${t.department?.name || 'General'})`
        ).join('\n');

        const prompt = `
            You are an Executive Assistant generating a Daily Operations Report.
            
            Date: ${today}
            Stats:
            - Total Active/Touched: ${todaysTasks.length}
            - Completed: ${completed.length}
            - New items: ${created.length}
            - Critical (P1): ${p1.length}

            Brief Task List:
            ${tasksSummary}

            Please provide a professional yet concise summary (max 3-4 paragraphs).
            1. **Executive Summary**: General sentiment (Success/Busy/Blocked).
            2. **Accomplishments**: Highlight key completed items.
            3. **Bottlenecks/Focus**: Mention P1 items or stalled tasks.
            4. **Recommendations**: If any patterns found (e.g. lots of Design requests).

            Use Markdown styling. Use bold/lists.
        `;

        // 2. Generate AI Content
        try {
            console.log("Sending prompt to Gemini...");
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log("Gemini Response received, length:", text.length);

            const usage = response.usageMetadata?.totalTokenCount || 0;

            return {
                report: text,
                usage: usage
            };
        } catch (aiError) {
            console.error("AI Generation Error", aiError);
            return { report: `Failed to generate report via AI: ${aiError.message}. Check server logs for details.`, usage: 0 };
        }
    }
}
