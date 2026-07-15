import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type SourceType = "email_text" | "pdf_text" | "notebooklm_text" | "manual_text";

type PlanDay = {
  g: number;
  date?: string;
  title: string;
  tasks: string[];
  outcome: string;
};

type PlanWeek = {
  title: string;
  goal: string;
  days: PlanDay[];
};

type OakBoardPlan = {
  role: string;
  reports: string;
  collab: string;
  nWeeks: 2 | 4;
  weeks: PlanWeek[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_TITLE_MAX = 90;
const DAY_TASK_MAX = 90;
const DAY_TASK_SHORT_MAX = 50;
const DAY_OUTCOME_MAX = 90;
const RAW_TEXT_MAX = 120_000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !apiKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: apiKey,
    },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id && user?.email ? user : null;
}

function cleanText(value: unknown, max = 10_000) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim().slice(0, max)
    : "";
}

function limitText(value: unknown, max: number) {
  return cleanText(value, max).replace(/\s+/g, " ").slice(0, max);
}

function limitTasks(tasks: unknown): string[] {
  const raw = Array.isArray(tasks) ? tasks : [];
  const normalized = raw
    .map((task) => limitText(task, DAY_TASK_MAX))
    .filter(Boolean);
  const hasLongTask = normalized.some((task) => task.length > DAY_TASK_SHORT_MAX);
  return normalized.slice(0, hasLongTask ? 4 : 6);
}

function safeDayLabel(dayNo: number) {
  return `Day ${dayNo}`;
}

function compactPhrase(value: string, fallback: string, max = DAY_TITLE_MAX) {
  const cleaned = limitText(value, max);
  return cleaned || fallback.slice(0, max);
}

function splitTasksAcrossRange(tasks: string[], rangeIndex: number, rangeSize: number, dayTitle: string, dayNo: number) {
  if (!tasks.length) return [`Complete the ${safeDayLabel(dayNo)} portion of ${dayTitle}`];
  if (rangeSize <= 1) return tasks;

  const chunkSize = Math.max(1, Math.ceil(tasks.length / rangeSize));
  const start = rangeIndex * chunkSize;
  const chunk = tasks.slice(start, start + chunkSize);
  const fallback = tasks[rangeIndex % tasks.length];
  return (chunk.length ? chunk : [fallback]).slice(0, 6);
}

function dayTitleFromTasks(baseTitle: string, tasks: string[], dayNo: number, rangeIndex: number) {
  const seed = tasks[0] || baseTitle;
  const phrase = seed
    .replace(/^complete\s+/i, "")
    .replace(/^the\s+/i, "")
    .split(/[.;:,-]/)[0]
    .trim();
  return compactPhrase(`${baseTitle} - Day ${rangeIndex + 1}: ${phrase || safeDayLabel(dayNo)} Focus`, `${baseTitle} - ${safeDayLabel(dayNo)} Focus`);
}

function dayOutcomeFromTasks(baseOutcome: string, tasks: string[], dayNo: number) {
  const seed = tasks[tasks.length - 1] || tasks[0] || baseOutcome;
  const phrase = seed
    .replace(/^complete\s+/i, "")
    .replace(/^review\s+/i, "")
    .split(/[.;:,-]/)[0]
    .trim();
  return compactPhrase(`${safeDayLabel(dayNo)} milestone: ${phrase || "progress reviewed"}`, baseOutcome || `${safeDayLabel(dayNo)} milestone completed`, DAY_OUTCOME_MAX);
}

function blankDay(globalDay: number): PlanDay {
  return {
    g: globalDay,
    title: `Day ${globalDay} Training`,
    tasks: ["Review assigned onboarding material", "Practice role-specific workflow"],
    outcome: "Daily onboarding progress reviewed",
  };
}

function makeDaysDistinct(plan: OakBoardPlan): OakBoardPlan {
  return {
    ...plan,
    weeks: plan.weeks.map((week) => {
      const seen = new Set<string>();
      return {
        ...week,
        days: week.days.map((day, index) => {
          const signature = JSON.stringify({
            title: day.title.toLowerCase(),
            tasks: day.tasks.map((task) => task.toLowerCase()),
            outcome: day.outcome.toLowerCase(),
          });
          if (!seen.has(signature)) {
            seen.add(signature);
            return day;
          }

          const rotatedTasks = day.tasks.length
            ? day.tasks.slice(index % day.tasks.length).concat(day.tasks.slice(0, index % day.tasks.length))
            : blankDay(day.g).tasks;
          const tasks = limitTasks([
            ...rotatedTasks.slice(0, Math.min(4, rotatedTasks.length)),
            `Review ${safeDayLabel(day.g)} progress with the reporting manager`,
          ]);
          const updatedDay = {
            ...day,
            title: dayTitleFromTasks(day.title.replace(/\s+-\s+Day\s+\d+:.+$/i, ""), tasks, day.g, index),
            tasks,
            outcome: dayOutcomeFromTasks(day.outcome, tasks, day.g),
          };
          seen.add(JSON.stringify({
            title: updatedDay.title.toLowerCase(),
            tasks: updatedDay.tasks.map((task) => task.toLowerCase()),
            outcome: updatedDay.outcome.toLowerCase(),
          }));
          return updatedDay;
        }),
      };
    }),
  };
}

function validatePlanShape(plan: OakBoardPlan, preferredWeeks?: number) {
  const expectedWeeks = preferredWeeks === 2 || preferredWeeks === 4 ? preferredWeeks : plan.nWeeks;
  if (plan.nWeeks !== expectedWeeks || plan.weeks.length !== expectedWeeks) {
    throw new Error(`Parser produced ${plan.weeks.length} weeks, expected ${expectedWeeks}.`);
  }

  const expectedDays = expectedWeeks * 5;
  const flattenedDays = plan.weeks.flatMap((week) => week.days);
  if (flattenedDays.length !== expectedDays) {
    throw new Error(`Parser produced ${flattenedDays.length} days, expected ${expectedDays}.`);
  }

  flattenedDays.forEach((day, index) => {
    const expectedGlobalDay = index + 1;
    if (day.g !== expectedGlobalDay) {
      throw new Error(`Parser produced invalid day number ${day.g}, expected ${expectedGlobalDay}.`);
    }
    if (!day.title || !day.outcome || !day.tasks.length) {
      throw new Error(`Parser produced incomplete content for Day ${expectedGlobalDay}.`);
    }
  });
}

function normalizePlan(input: Partial<OakBoardPlan>, preferredWeeks?: number): OakBoardPlan {
  const nWeeks = (preferredWeeks === 2 || preferredWeeks === 4)
    ? preferredWeeks
    : input.nWeeks === 2 || input.nWeeks === 4
    ? input.nWeeks
    : (Array.isArray(input.weeks) && input.weeks.length > 2 ? 4 : 2);

  const weeks: PlanWeek[] = [];
  const sourceWeeks = Array.isArray(input.weeks) ? input.weeks : [];
  for (let wi = 0; wi < nWeeks; wi++) {
    const sourceWeek = sourceWeeks[wi] || {} as Partial<PlanWeek>;
    const sourceDays = Array.isArray(sourceWeek.days) ? sourceWeek.days : [];
    const days: PlanDay[] = [];
    for (let di = 0; di < 5; di++) {
      const globalDay = wi * 5 + di + 1;
      const sourceDay = sourceDays[di] || blankDay(globalDay);
      const tasks = limitTasks(sourceDay.tasks);
      days.push({
        g: globalDay,
        date: cleanText(sourceDay.date, 20) || undefined,
        title: limitText(sourceDay.title || `Day ${globalDay} Training`, DAY_TITLE_MAX),
        tasks: tasks.length ? tasks : blankDay(globalDay).tasks,
        outcome: limitText(sourceDay.outcome || "Daily onboarding progress reviewed", DAY_OUTCOME_MAX),
      });
    }
    weeks.push({
      title: limitText(sourceWeek.title || `Week ${wi + 1}`, DAY_TITLE_MAX),
      goal: limitText(sourceWeek.goal || "Complete assigned onboarding goals", 140),
      days,
    });
  }

  const plan = {
    role: limitText(input.role || "", 80),
    reports: limitText(input.reports || "", 120),
    collab: limitText(input.collab || "", 160),
    nWeeks,
    weeks,
  };

  const normalized = makeDaysDistinct(plan);
  validatePlanShape(normalized, preferredWeeks);
  return normalized;
}

function extractRole(rawText: string) {
  const designationMatch = rawText.match(/Designation\s*\n?\s*([^\n]+)/i)
    || rawText.match(/Designation\s*[:\-]\s*([^\n]+)/i)
    || rawText.match(/for\s+(?:the\s+)?([A-Za-z][A-Za-z\s/&-]{2,60})\s+role/i);
  return designationMatch ? designationMatch[1].replace(/\d+/g, "").trim() : "";
}

function extractReports(rawText: string) {
  const mentionMatch = rawText.match(/@([^,\n]+)(?:\s*\/\s*@?([^,\n]+))?.{0,80}onboarding plan/i);
  if (mentionMatch) return [mentionMatch[1], mentionMatch[2]].filter(Boolean).join(" / ").trim();
  const fromMatch = rawText.match(/From:\s*([^\n<]+)/i);
  return fromMatch ? fromMatch[1].trim() : "";
}

function extractCollaborators(rawText: string) {
  const toMatch = rawText.match(/To:\s*([\s\S]*?)(?:\nCc:|\nSubject:)/i);
  return toMatch
    ? toMatch[1].replace(/<[^>]+>/g, "").replace(/\s*;\s*/g, ", ").replace(/\n+/g, " ").trim().slice(0, 160)
    : "";
}

function parseWeekBlocks(rawText: string): PlanWeek[] {
  const weekRegex = /Week\s+(\d+)\s*[:\-–—]\s*([^\n]+)([\s\S]*?)(?=Week\s+\d+\s*[:\-–—]|$)/gi;
  const weeks: PlanWeek[] = [];
  let match: RegExpExecArray | null;

  while ((match = weekRegex.exec(rawText)) !== null) {
    const weekNo = Number(match[1]);
    const title = match[2].trim();
    const body = match[3].trim();
    const goal = (body.match(/Goal\s*[:\-]\s*([^\n]+)/i)?.[1] || "").trim();
    const outcome = (body.match(/Output by end of Week\s+\d+\s*:\s*([\s\S]*?)(?=Day\s+\d|$)/i)?.[1] || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("; ");

    const dayRegex = /Day\s+(\d+)(?:\s*[–-]\s*(\d+))?\s*[:\-–—]\s*([^\n]+)([\s\S]*?)(?=Day\s+\d|Output by end of Week|$)/gi;
    const days: PlanDay[] = [];
    let dayMatch: RegExpExecArray | null;

    while ((dayMatch = dayRegex.exec(body)) !== null) {
      const startDay = Number(dayMatch[1]);
      const endDay = dayMatch[2] ? Number(dayMatch[2]) : startDay;
      const dayTitle = dayMatch[3].trim();
      const dayBody = dayMatch[4].trim();
      const tasks = dayBody
        .split("\n")
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter((line) => line && !/^Goal\s*:/i.test(line) && !/^Output/i.test(line))
        .slice(0, 8);

      const rangeSize = Math.max(1, endDay - startDay + 1);
      for (let dayNo = startDay; dayNo <= endDay; dayNo++) {
        const rangeIndex = dayNo - startDay;
        const dayTasks = splitTasksAcrossRange(tasks, rangeIndex, rangeSize, dayTitle, dayNo);
        const rangedTitle = rangeSize === 1
          ? dayTitle
          : dayTitleFromTasks(dayTitle, dayTasks, dayNo, rangeIndex);
        days.push({
          g: dayNo,
          title: rangedTitle,
          tasks: dayTasks,
          outcome: dayOutcomeFromTasks(outcome, dayTasks, dayNo),
        });
      }
    }

    weeks.push({
      title,
      goal,
      days,
    });
  }

  return weeks;
}

function heuristicParse(rawText: string, preferredWeeks?: number): OakBoardPlan {
  return normalizePlan({
    role: extractRole(rawText),
    reports: extractReports(rawText),
    collab: extractCollaborators(rawText),
    nWeeks: preferredWeeks === 2 || preferredWeeks === 4 ? preferredWeeks : rawText.match(/Week\s+4/i) ? 4 : 2,
    weeks: parseWeekBlocks(rawText),
  }, preferredWeeks);
}

function parserSystemPrompt(preferredWeeks?: number) {
  return `You convert messy management emails, PDF text, or onboarding notes into strict OakBoard JSON.
Return only valid JSON and no markdown.
Schema:
{
  "role": "string",
  "reports": "string",
  "collab": "string",
  "nWeeks": 2 or 4,
  "weeks": [
    {
      "title": "max 90 chars",
      "goal": "short weekly goal",
      "days": [
        {
          "g": 1,
          "date": "optional YYYY-MM-DD",
          "title": "max 90 chars",
          "tasks": ["each max 90 chars"],
          "outcome": "max 90 chars"
        }
      ]
    }
  ]
}
Rules:
- Use exactly ${preferredWeeks === 2 || preferredWeeks === 4 ? preferredWeeks : "2 or 4"} weeks.
- Each week must have exactly 5 days.
- Day numbers must be sequential from 1.
- If a source combines Day 1-2, split it into separate days with useful tasks.
- Prefer practical onboarding actions over vague summaries.`;
}

async function callOpenAICompatible(rawText: string, preferredWeeks?: number): Promise<OakBoardPlan> {
  const baseUrl = Deno.env.get("AI_BASE_URL") || "https://api.openai.com/v1";
  const apiKey = Deno.env.get("AI_API_KEY");
  const model = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

  if (!apiKey) throw new Error("AI_API_KEY is not configured.");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: parserSystemPrompt(preferredWeeks) },
        { role: "user", content: rawText },
      ],
    }),
  });

  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("AI provider returned an empty response.");
  return JSON.parse(content);
}

async function callOllama(rawText: string, preferredWeeks?: number): Promise<OakBoardPlan> {
  const endpoint = Deno.env.get("OLLAMA_ENDPOINT") || "https://ollama.com";
  const model = Deno.env.get("OLLAMA_MODEL") || "glm-5.2:cloud";
  const apiKey = Deno.env.get("OLLAMA_API_KEY");
  const isCloud = endpoint.replace(/\/$/, "") === "https://ollama.com";
  if (isCloud && !apiKey) throw new Error("OLLAMA_API_KEY is not configured.");

  const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      ...(!isCloud ? { format: "json" } : {}),
      messages: [
        { role: "system", content: parserSystemPrompt(preferredWeeks) },
        { role: "user", content: rawText },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
  const result = await response.json();
  const content = result?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Ollama returned an empty response.");
  const jsonText = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || content;
  return JSON.parse(jsonText.trim());
}

async function saveImport(params: {
  ownerId: string;
  sourceType: SourceType;
  rawText: string;
  parsedPlan: OakBoardPlan;
  parserProvider: string;
  parserModel?: string;
  preferredWeeks?: number;
  sourceFilename?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_imports?select=id`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      owner_id: params.ownerId,
      source_type: params.sourceType,
      source_filename: params.sourceFilename || null,
      raw_text: params.rawText,
      parser_provider: params.parserProvider,
      parser_model: params.parserModel || null,
      preferred_weeks: params.preferredWeeks || null,
      parsed_json: params.parsedPlan,
      status: "parsed",
    }),
  });

  if (!response.ok) {
    console.error("Unable to save onboarding import:", await response.text());
    return null;
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0]?.id || null : null;
}

async function saveParsedPlan(params: {
  ownerId: string;
  parsedPlan: OakBoardPlan;
  importId?: string | null;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  const role = params.parsedPlan.role || "New Role";
  const title = `${params.parsedPlan.nWeeks}-Week Onboarding Plan - ${role}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_plans?select=id`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      owner_id: params.ownerId,
      title,
      role: params.parsedPlan.role,
      reports_to: params.parsedPlan.reports,
      collaborates_with: params.parsedPlan.collab,
      duration_weeks: params.parsedPlan.nWeeks,
      plan_json: params.parsedPlan,
      source_import_id: params.importId || null,
    }),
  });

  if (!response.ok) {
    console.error("Unable to save parsed onboarding plan:", await response.text());
    return null;
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0]?.id || null : null;
}

export default {
  fetch: async (request: Request) => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
    }

    const user = await getAuthenticatedUser(request);
    const email = user?.email;
    const ownerId = user?.id;
    if (!email || !ownerId) {
      return jsonResponse({ ok: false, error: "Your session is no longer valid." }, 401);
    }

    if (!String(email).toLowerCase().endsWith("@9ostech.com")) {
      return jsonResponse({ ok: false, error: "Only 9ostech accounts can import plans." }, 403);
    }

    try {
      const body = await request.json();
      const rawText = cleanText(body.rawText, RAW_TEXT_MAX);
      const sourceType: SourceType = ["email_text", "pdf_text", "notebooklm_text", "manual_text"].includes(body.sourceType)
        ? body.sourceType
        : "manual_text";
      const preferredWeeks = body.preferredWeeks === 2 || body.preferredWeeks === 4
        ? body.preferredWeeks
        : undefined;
      const sourceFilename = cleanText(body.sourceFilename, 200) || undefined;

      if (rawText.length < 50) {
        return jsonResponse({ ok: false, error: "Paste or upload more onboarding content first." }, 400);
      }

      const provider = (Deno.env.get("AI_PROVIDER") || "heuristic").toLowerCase();
      let parsedPlan: OakBoardPlan;
      let usedProvider = provider;
      let usedModel = Deno.env.get("AI_MODEL") || Deno.env.get("OLLAMA_MODEL") || undefined;

      try {
        if (provider === "openai-compatible") {
          parsedPlan = await callOpenAICompatible(rawText, preferredWeeks);
        } else if (provider === "ollama") {
          parsedPlan = await callOllama(rawText, preferredWeeks);
        } else {
          parsedPlan = heuristicParse(rawText, preferredWeeks);
          usedProvider = "heuristic";
          usedModel = undefined;
        }
      } catch (providerError) {
        console.error("AI parser provider failed, falling back to heuristic parser:", providerError);
        parsedPlan = heuristicParse(rawText, preferredWeeks);
        usedProvider = `${provider}-fallback-heuristic`;
      }

      const plan = normalizePlan(parsedPlan, preferredWeeks);
      const importId = await saveImport({
        ownerId: String(ownerId),
        sourceType,
        rawText,
        parsedPlan: plan,
        parserProvider: usedProvider,
        parserModel: usedModel,
        preferredWeeks,
        sourceFilename,
      });
      const planId = await saveParsedPlan({
        ownerId: String(ownerId),
        parsedPlan: plan,
        importId,
      });

      return jsonResponse({
        ok: true,
        importId,
        planId,
        provider: usedProvider,
        model: usedModel || null,
        plan,
      });
    } catch (error) {
      console.error("parse-onboarding-plan failed:", error);
      return jsonResponse({ ok: false, error: "Unable to parse onboarding content." }, 500);
    }
  },
};
