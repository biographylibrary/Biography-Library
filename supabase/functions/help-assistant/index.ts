import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  de: "German",
};

const UNCERTAINTY_PHRASES = [
  "i don't know",
  "i'm not sure",
  "i cannot answer",
  "not covered",
  "outside the scope",
  "no information",
  "non lo so",
  "non sono sicuro",
  "je ne sais pas",
  "ich weiß nicht",
  "cannot help",
  "unable to answer",
  "not mentioned",
  "not described",
];

const HELP_KB = `
# Biography Library — Help Knowledge Base

---

## 1. How to Start a New Biography

To create a new biography, click "New Biography" from your Dashboard or the Biographies page.
You will be asked to:
- Enter a title for the biography.
- Choose the subject type: an autobiography (about yourself) or a biography of a deceased person.
- Choose the writing mode: Sections mode or Freeflow mode (see section 2 for the difference).

You cannot change the writing mode after the biography has been created, so choose carefully.
Once created, the biography opens in the Workspace editor where you can start writing.

---

## 2. Sections Mode vs Freeflow Mode

Sections mode is the standard writing experience. The biography is divided into up to nine chapters:
Childhood, Family, Education, Career, Life Events, Relationships, Challenges, Passions, and Legacy.
Each section has its own editor with:
- AI-powered writing prompts to help recall memories.
- Grammar check and AI suggestions.
- Voice recording with automatic transcription.
- Conversation mode (guided interview).
- Section status tracking (In Progress, Ready for Review, Complete).
Sections mode is recommended when you want to write the biography from scratch with AI guidance.

Freeflow mode is an import-only mode. There is NO AI writing assistance in Freeflow mode by design.
It is intended for users who already have a complete written biography and want to import and publish it.
In Freeflow mode you:
- Import an existing document (DOCX, TXT, RTF) or paste raw text.
- The platform automatically assigns content to the relevant sections.
- You can then edit the text manually in each section, but no AI prompts or AI suggestions are available.

Key difference: AI features (prompts, grammar check, suggestions, rewrite) are only available in Sections mode.
Freeflow mode has no AI by design — it is purely for importing and publishing existing text.

In Italian: Modalità sezioni vs Modalità freeflow.
In French: Mode sections vs Mode libre.
In German: Abschnittsmodus vs Freifluss-Modus.

---

## 3. Book Structure Panel (Dedication, Epigraph, Preface, Epilogue, Acknowledgements, Credits)

The Book Structure panel lets you add optional front-matter and back-matter elements to give your biography a professional book-like format.

To open it: click the "Book Structure" button in the editor sidebar or top bar.

Available elements (each can be enabled or disabled independently):
- Dedication (Dedica / Dédicace / Widmung): A short personal dedication to someone special.
- Epigraph (Epigrafe / Épigraphe / Epigraph): A quote or verse that sets the tone, with an optional source attribution.
- Preface (Prefazione / Préface / Vorwort): An introduction written by you or someone else, explaining the context of the biography.
- Epilogue (Epilogo / Épilogue / Epilog): Closing reflections or an afterword at the end of the biography.
- Acknowledgements (Ringraziamenti / Remerciements / Danksagungen): Thank-you notes to people who helped.
- Specific Credits (Crediti / Crédits / Danksagungen): Credits for photos, research, or other contributions.

Each element has a rich text editor. Toggle the switch next to each element to include it in the published biography. Changes are saved automatically.

---

## 4. How to Submit for Review and What Happens Next

Publishing follows a multi-step review workflow:

1. Finish writing your biography sections in the Workspace.
2. Click "Submit for Review" in the editor top bar or status area.
3. AI content screening (automatic): The full biography text is analysed by AI for content policy violations at three levels:
   - Level 1 (automatic block): genocide glorification, terrorism, CSAM, direct violence incitement, WMD content.
   - Level 2 (requires human review): hate speech, targeted harassment, graphic violence, copyright issues.
   - Level 3 (publish with note): controversial opinions, contested historical narratives.
   If a Level 1 violation is found, the biography is automatically blocked and you are notified.
   If Level 2 is found, a human moderator reviews it.
4. Human review: A reviewer reads the biography and either approves it or requests edits.
5. Published: If approved, the biography becomes visible in the Biography Library according to its visibility setting.

You can run the AI pre-publication check yourself from the editor before submitting to catch issues early.

---

## 5. What "Request Edit" Means and How to Respond

If a reviewer requests edits, it means the biography was not approved in its current form and changes are needed before it can be published.

What happens:
- The biography status changes to "Edit Requested".
- You receive a notification in the Notifications page with the reviewer's feedback and, if applicable, flagged passages.

How to respond:
1. Go to the Notifications page and read the reviewer's feedback carefully.
2. Open the biography in the Workspace editor.
3. Make the requested changes in the relevant sections.
4. Optionally run the AI pre-publication check to verify the content passes screening.
5. Click "Submit for Review" again when ready.
6. The biography will go through the AI screening and human review process again.

There is no limit to how many times you can resubmit after making edits.

---

## 6. How to Use Text Import (Paste or File Upload)

You can import existing text into your biography in two ways:

File upload (DOCX, TXT, RTF):
- In the Workspace editor, click the Import button in the toolbar.
- Select your file (supported formats: DOCX, TXT, RTF).
- The platform reads the file, splits it into text chunks, and uses AI to assign each chunk to the most relevant biography section (Childhood, Family, Career, etc.).
- The Section Assignment Wizard opens — review the AI-suggested assignments, move any chunks to a different section if needed, then confirm.
- The text is inserted into the corresponding section editors.

Paste text:
- Some import dialogs also allow you to paste text directly instead of uploading a file.
- The same assignment wizard applies.

Note: File import with AI section detection is only available in Sections mode. In Freeflow mode, the full document is imported and distributed across sections without an assignment wizard.

---

## 7. How to Use Voice Recording and Transcription

Voice recording allows you to dictate content directly into any biography section.

Steps:
1. Open the section you want to write in.
2. Click the microphone icon in the section editor toolbar.
3. Allow microphone access if prompted by your browser.
4. Speak clearly. Your voice is recorded and sent to the transcription service.
5. The transcribed text is automatically inserted into the section editor.
6. Review and edit the transcribed text as needed — transcription is not always perfect.

Tips:
- Speak at a natural pace and avoid background noise for best results.
- You can record in any of the four supported languages: English, Italian (Italiano), French (Français), German (Deutsch).
- The language used for transcription follows the biography's language setting.
- There is no time limit, but very long recordings may take a moment to process.

---

## 8. How to Export (PDF, DOCX, TXT, RTF)

You can export your biography at any time from the Workspace, regardless of its publication status.

Steps:
1. Click the Export button in the editor top bar.
2. Choose the export format.

Available formats:
- PDF: A formatted, print-ready document using the Noto Serif font. Includes section titles, body text, and any enabled Book Structure elements. Best for printing or sharing a polished version.
- DOCX: A Microsoft Word document with section titles and body text. Best for further editing in Word or Google Docs.
- TXT: Plain text with no formatting. Sections are concatenated with titles as separators. Best for simple sharing or archiving.
- RTF: Rich Text Format, compatible with most word processors.

The Advanced Export dialog provides additional options, such as choosing which sections to include or exclude, and whether to include Book Structure elements.

---

## 9. How to Manage Photos and Set the Cover Photo

Each biography has a Photo Gallery for storing and managing images.

To open the Photo Gallery:
- Click the Photo Gallery button (camera icon) in the editor sidebar or top bar.

What you can do:
- Upload photos: Click "Upload" and select images from your device (JPEG, PNG, and other common formats are supported).
- View photos: All uploaded photos are shown in the gallery grid.
- Set the cover photo: Click on a photo and select "Set as Cover" to make it the cover image on the biography's public page.
- Delete photos: Select a photo and click delete to remove it from the gallery.
- Reorder photos: You can rearrange photos in the gallery.

Only the biography owner can add, delete, or manage photos.
Reviewers and admins can view photos during the review process.

---

## 10. Visibility Options (Private, Link-Only, Public)

Each biography has a visibility setting that controls who can see it after it is published.

Options:
- Private (Privato / Privé / Privat): Only you (the owner) can view the biography. It does not appear in the Biography Library. Useful for personal records or work in progress.
- Link-only (Solo link / Lien uniquement / Nur Link): Not listed publicly but anyone with the direct link can view it. Useful for sharing with family or friends.
- Public (Pubblico / Public / Öffentlich): Visible to everyone in the Biography Library and findable through search.

How to change visibility:
- Open the biography in the Workspace editor.
- Find the Visibility setting in the editor's settings or status area.
- Select the desired option.

Note: Even if visibility is set to Public, the biography only becomes publicly visible after it has been approved through the review process.
`;

function detectLowConfidence(text: string): boolean {
  const lower = text.toLowerCase();
  return UNCERTAINTY_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildSystemPrompt(language: string): string {
  const langName = LANGUAGE_NAMES[language] || "English";
  return `You are a helpful support assistant for Biography Library, a web application for writing and publishing personal biographies and memoirs.

Your role is to answer user questions about how to use Biography Library features.

RULES:
1. Answer ONLY questions about Biography Library features. Do not answer questions unrelated to the application.
2. Base your answers EXCLUSIVELY on the knowledge base provided below. Do not invent features, steps, or options that are not described in the knowledge base.
3. If the user's question is not covered by the knowledge base, say clearly that you do not have information about that topic and suggest they contact support.
4. Respond in ${langName}. Always use ${langName} regardless of the language the user writes in.
5. Keep answers concise and helpful — aim for 3 to 6 sentences unless a step-by-step list is needed.
6. Do not repeat the question back to the user.
7. Never mention that you are using a knowledge base or that you are an AI.

KNOWLEDGE BASE:
${HELP_KB}`;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fn();
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error("All retries failed");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const infomaniakToken = Deno.env.get("INFOMANIAK_AI_TOKEN") || "";
    const infomaniakEndpoint = Deno.env.get("INFOMANIAK_AI_ENDPOINT") || "";
    const primaryModel = Deno.env.get("INFOMANIAK_AI_MODEL_PRIMARY") ?? "Apertus-70B-Instruct-2509";
    const fallbackModel = Deno.env.get("INFOMANIAK_AI_MODEL_FALLBACK") ?? "mistral3";

    if (!infomaniakToken) {
      return errorResponse("AI service is not configured.", 503);
    }

    if (!infomaniakEndpoint) {
      return errorResponse("AI endpoint is not configured.", 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      const isExpiry =
        authError?.message?.toLowerCase().includes("expired") ||
        authError?.status === 401;
      if (isExpiry) {
        return errorResponse("TOKEN_EXPIRED", 401);
      }
      return errorResponse("Unauthorized", 401);
    }

    let body: { question?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { question, language = "en" } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return errorResponse("Missing or empty question", 400);
    }

    const trimmedQuestion = question.trim().slice(0, 1000);
    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = trimmedQuestion;

    const aiPayload = {
      max_tokens: 512,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    let answerText = "";

    const models = [primaryModel, fallbackModel];
    let callSucceeded = false;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const res = await callWithRetry(() =>
          fetch(infomaniakEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${infomaniakToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...aiPayload, model }),
            signal: AbortSignal.timeout(28000),
          })
        );

        if (res.ok) {
          const data = await res.json();
          answerText = data?.choices?.[0]?.message?.content ?? "";
          callSucceeded = true;
          break;
        }

        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          const errText = await res.text();
          console.error("AI error:", { status: res.status, body: errText });
          break;
        }

        console.warn(`Model ${model} failed (${res.status}), ${i < models.length - 1 ? "trying fallback" : "no more fallbacks"}`);
      } catch (err) {
        if (i === models.length - 1) throw err;
        console.warn(`Model ${model} threw, trying fallback: ${err}`);
      }
    }

    if (!callSucceeded || !answerText.trim()) {
      return errorResponse("AI service unavailable. Please try again later.", 502);
    }

    const confidence = detectLowConfidence(answerText) ? "low" : "high";

    return new Response(
      JSON.stringify({ answer: answerText.trim(), confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("help-assistant error:", e);
    return errorResponse("Internal server error", 500);
  }
});
