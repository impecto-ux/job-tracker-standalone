import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TasksService } from '../tasks/tasks.service';
import { Task } from '../tasks/entities/task.entity';
import { StatsInsight } from './entities/stats-insight.entity';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(
        private configService: ConfigService,
        @InjectRepository(StatsInsight)
        private statsInsightRepo: Repository<StatsInsight>,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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
            console.log(`[AiService] Parsing Job Request using model: gemini-flash-latest`);
            const response = await this.callGeminiWithRetry(prompt);
            console.log(`[AiService] Response received.`);
            const usage = response.usageMetadata?.totalTokenCount || 0;
            const jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            console.log(`[AiService] Parsed JSON string: ${jsonStr.substring(0, 50)}...`);

            return {
                data: JSON.parse(jsonStr),
                usage: usage
            };
        } catch (error) {
            console.error('[AiService] CRITICAL AI ERROR:', error);
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
            console.log("Sending prompt to Gemini with retry...");
            const response = await this.callGeminiWithRetry(prompt, 5, 3000); // Higher retry for reports
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

    async generateStatsSummary(statsData: any, range: string = 'Weekly'): Promise<StatsInsight> {
        console.log(`Generating stats summary for range: ${range}...`);

        const prompt = `
            You are a Data Analyst for a creative studio. Analyze the following ${range} job statistics and provide an Executive Summary in TURKISH.
            
            Data Provided:
            - Daily Completions (past 7 days): ${JSON.stringify(statsData.dailyStats)}
            - Daily Work Hours: ${JSON.stringify(statsData.dailyWorkHours)}
            - Peak Hours: ${JSON.stringify(statsData.hourlyActivity)}
            - Status Distribution: ${JSON.stringify(statsData.statusData)}
            - Average Completion Time: ${statsData.avgCompletionTime} hours
            - Total XP Earned: ${statsData.totalScore}

            Context: The user has selected a "${range}" view. Focus your analysis on this perspective.
            
            Please provide a structured response (Markdown):
            1. **Genel Bakış**: Brief summary of the ${range} performance. (Max 2 sentences)
            2. **Öne Çıkanlar**: Key achievements (e.g. highest day, efficiency).
            3. **Gelişim Alanları / Uyarılar**: If any bottlenecks or irregular hours are spotted.
            4. **Tavsiye**: One actionable advice.

            Tone: Professional, encouraging, yet analytical. Language: TURKISH.
        `;

        try {
            const response = await this.callGeminiWithRetry(prompt);
            const text = response.text();

            // Save to DB
            const insight = this.statsInsightRepo.create({
                content: text,
                periodEnd: new Date(),
                // usage metadata could be tracked if needed
            });
            return this.statsInsightRepo.save(insight);
        } catch (e) {
            console.error("AI Summary Error:", e);
            throw new Error("Failed to generate summary");
        }
    }

    async getStatsHistory(): Promise<StatsInsight[]> {
        return this.statsInsightRepo.find({
            order: { createdAt: 'DESC' },
            take: 10
        });
    }

    async generateProactiveResponse(agent: any, task: Task, event: string, extraContext?: string): Promise<string> {
        const personalityPrompts: Record<string, string> = {
            'Analytical': 'You focus on data, logic, and potential issues. Be precise and observant.',
            'Proactive': 'You are energetic and focused on moving things forward. Be helpful but firm about progress.',
            'Creative': 'You look for visual quality and user experience. Be encouraging and offer aesthetic feedback.',
            'Enforcer': 'You are the "Boss". Focus on deadlines, P1 priorities, and accountability.'
        };

        const prompt = `
            You are "${agent.name}", the AI Operator for the "${task.department?.name || 'General'}" Squad.
            Your personality is "${agent.personality}". ${personalityPrompts[agent.personality] || ''}
            Your mission: ${agent.systemPrompt || 'Help the team stay on track and ensure quality.'}

            EVENT TRIGGERED: "${event}"
            TASK CONTEXT:
            - Title: ${task.title}
            - Description: ${task.description}
            - Priority: ${task.priority}
            - Status: ${task.status}
            - Requester (Created by): ${task.requester?.fullName || 'Unknown'}
            - Owner (Assigned to): ${task.owner?.fullName || 'UNASSIGNED (Pool)'}

            SYSTEM RULES:
            - Tasks are NOT assigned manually at creation.
            - The "Requester" is the person who ASKED for the work.
            - The "Owner" is the person who is DOING the work.
            - If "Owner" is UNASSIGNED, it means the task is in the pool and anyone can take it.
            - NEVER tell the Requester "this is assigned to you" unless they are also the Owner.

            ${extraContext ? `ADDITIONAL CONTEXT:\n${extraContext}` : ''}

            Based on this event and task, provide a PROACTIVE response to the squad.
            - If it's a P1 task creation, show urgency and call for the team to pick it up.
            - If a task is marked DONE, offer a brief praise to the OWNER or ask about the next dependency.
            - If the event is "user_mention", answer the user's question directly and professionally.
            - For status/data questions, be specific and analytical. Mention numbers if you see them.
            - Keep it concise but ensure the question is answered accurately.
            - Use TURKISH for the response. 
            - Be proactive ("dürtükleyici"). Don't just greet, say something actionable.

            Respond as the bot personality. No "AI Advisor:" prefix, just the message.
        `;

        try {
            console.log(`[AiService] Sending Prompt to ${agent.name} (Length: ${prompt.length})`);
            const response = await this.callGeminiWithRetry(prompt);
            return response.text().trim();
        } catch (error) {
            console.error('[AiService] Proactive Prompt Error after retries:', error);
            return '';
        }
    }

    private async callGeminiWithRetry(prompt: string, maxRetries = 5, initialDelay = 5000): Promise<any> {
        let lastError: any;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await this.model.generateContent(prompt);
                return result.response;
            } catch (error: any) {
                lastError = error;
                // Check if it's a rate limit error (429)
                if (error.status === 429 || (error.message && error.message.includes('429'))) {
                    let delay = initialDelay * Math.pow(2, i);

                    // Attempt to parse retry info from the error
                    try {
                        const errorDetails = error.errorDetails || (error.response && error.response.error && error.response.error.details);
                        if (errorDetails && Array.isArray(errorDetails)) {
                            const retryInfo = errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' || d['@type']?.includes('RetryInfo'));
                            if (retryInfo && retryInfo.retryDelay) {
                                // retryDelay can be '22s', '52.76s' or similar
                                const secondsMatch = String(retryInfo.retryDelay).match(/([\d.]+)/);
                                if (secondsMatch) {
                                    delay = (parseFloat(secondsMatch[1]) + 1.5) * 1000; // Add 1.5s cushion
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[AiService] Failed to parse retry delay:', e.message);
                    }

                    console.warn(`[AiService] Rate limit hit (429). Retrying in ${Math.round(delay / 1000)}s... (Attempt ${i + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                // For other errors, throw immediately
                throw error;
            }
        }
        throw lastError;
    }
}
