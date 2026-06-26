# Biography Library — Platform Knowledge Base

Version: 1.3 — 2026-06-25

Reference language: English. Echo, Help, and platform assistants answer in the user's language using these facts. Update this file whenever product rules or UX change, then run `npm run kb:sync`.

## account_and_biography_model

Each user account manages exactly one biography project: either an autobiography (your own life story) or a memorial biography (about a deceased person). You choose the type once during the introduction wizard at `/onboarding`; you cannot add a second biography to the same account or switch type by creating another biography on that account.

Common scenarios:
- Your autobiography and a memorial for your father: create two separate accounts with different email addresses.
- Memorial biographies for multiple deceased relatives (e.g. father and mother): one account per person.
- Two siblings writing about the same deceased parent: two separate accounts; each biography is an independent perspective (they may be linked on the profile in the future).
- You started a memorial but later want your own autobiography: register a new account and complete onboarding as autobiography.

Why one biography per account: keeps a single narrative focus, clear legal declarations per project, and simpler moderation and AI coaching.

If unsure which account to use, contact support at https://biographylibrary.org/contacts.

## platform_intro

Biography Library is a permanent, open-source, non-profit digital archive hosted in Switzerland. Users write autobiographies or biographies of deceased direct family members. It is not a social network or commercial data business. Assistants explain how the platform works in clear, simple language. They do not give legal, medical, tax or psychological advice. When uncertain, direct users to https://biographylibrary.org/contacts.

## manifesto

Key principles: (1) Every life deserves memory. (2) Only your own autobiography or a deceased direct family member's biography. (3) Open source AGPL v3. (4) Ethical Swiss-hosted open-source AI only; AI helps writing, never replaces voice; can be disabled. (5) Identity declared at registration, 18+. (6) Privacy: public, link-only, family-only, or private visibility; data never sold. (7) Strict moderation for illegal/harmful content. (8) No ads or data sales. (9) Long-term preservation commitment. (10) Non-profit association governance in Lugano.

## registration_and_onboarding

Registration needs first name, last name, email, password. Must be 18+. After signup, complete the introduction wizard at `/onboarding` (not the dashboard) to create your one biography: choose type (autobiography or memorial of a deceased direct family member), confirm legal declarations, enter title or protagonist/writer names, choose writing path (guided sections, import text, or publish-ready), and pick visibility. Writing mode (Sections vs Free Flow) is chosen during onboarding and cannot be changed after creation. The dashboard only shows your existing biography; it does not offer memorial setup.

## writing_modes

Sections mode: nine themed chapters (Childhood, Family, Education, Career, Life Events, Relationships, Challenges, Passions, Legacy). Work one chapter at a time; mark complete when done. Ideal for beginners. Free Flow mode: one continuous document, no predefined sections; same AI tools on selected text. Ideal for experienced writers or importing long existing text. Content is not auto-converted between modes.

## ai_tools

Editor AI tools (top bar): Check Grammar (typos/syntax, meaning preserved), Need Help? (contextual assistance on current section), Summarise, Review (clarity/flow feedback). AI On/Off toggle disables all AI buttons. Usage counter shows daily (40) and weekly (200) limits; heavy actions count as 2. Reset daily midnight UTC, weekly Monday UTC. AI never invents facts or publishes automatically.

## conversation_mode

Conversation Mode (toggle next to Editor Mode) lets users chat with the biography coach instead of writing directly. Share memories, answer questions; ask the coach to add a draft to the editor when ready. Particularly useful for people intimidated by a blank page. Only available in Sections mode, not Free Flow.

## book_structure_photos

Book Structure panel (left sidebar): optional front matter (Dedication, Epigraph, Preface) and back matter (Epilogue, Acknowledgements, Credits) for PDF export. Notes & To-Do: private notepad, not exported. Photos: upload JPG/PNG/WEBP up to 5 MB, max 30 gallery photos, captions, reorder by drag; included in online reader and PDF gallery after last chapter.

## import_export

Import text (sidebar): paste or upload into current chapter (Sections) or at cursor (Free Flow). For long Word documents, split into logical parts and import per chapter rather than all at once. Export panel: standard text export and print-ready B5 PDF with cover photo and optional photo gallery. Pre-flight check available before final PDF. Exported PDF/text is yours to print, share, or publish elsewhere.

## rights_chapters

Author keeps full copyright; platform is custodian only. No commercial AI training on private/semi-private/family biographies. Autobiography chapters: after first publish, new chapter allowed after minimum 365 days; published chapters are immutable. After author's death, autobiography frozen; family may write separate linked biographies using their own accounts. Deceased-person biographies: only direct family; published like autobiographies with reader reports reviewed by moderation.

## faq

FAQ: One account = one biography (autobiography OR memorial). Need another biography? Use a separate account with another email. Cannot write biography of living friend (only own or deceased direct family). Disable AI with AI On/Off toggle. Notes & To-Do are private, not exported. Conversation Mode = chat coach for memories. Long Word text: import in parts per chapter. After death your autobiography is frozen; family writes separate biographies on separate accounts. Commercial AI does not train on the archive.
