import { runScreeningForReview, type ReviewScreeningOutcome } from '@/lib/server/review-submit-pipeline';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { editionOriginalBlock } from '@/lib/server/edition-publish';
import type { AnyClient } from '@/lib/server/service-client';

async function releaseEditionRevision(svc: AnyClient, biographyId: string): Promise<void> {
  await svc
    .from('biographies')
    .update({ status: 'revision_requested', ai_screening_status: null })
    .eq('id', biographyId)
    .eq('status', 'revision_pending_review');
}

function summaryOf(outcome: ReviewScreeningOutcome): string {
  const read = `${outcome.examinedChars} of ${outcome.sourceChars} characters`;
  switch (outcome.verdict) {
    case 'passed':
      return outcome.partial
        ? `Automatic screening of the corrected text read ${read} and flagged nothing in them. The text is longer than the model reads: read the whole text before approving.`
        : 'Automatic screening of the corrected text: no passage flagged. Approving publishes it only if the text is still exactly the one that was screened.';
    case 'flagged':
      return `Automatic screening of the corrected text flagged ${outcome.flaggedPassages.length} passage(s). Approving publishes the text only if it is still exactly the one that was screened.`;
    case 'ai_error':
    case 'parse_error':
      return 'Automatic screening of the corrected text could not complete. Read the whole text before deciding.';
    default:
      return 'Automatic screening of the corrected text did not produce a result.';
  }
}

/**
 * Dopo l'invio di una correzione (`revision_pending_review`): screening del testo
 * corretto, senza pubblicare. L'esito si allega al rapporto aperto (il revisore lo
 * vede nel pannello: riassunto e passaggi segnalati; il vecchio esito resta in
 * `previous_analysis`) e lascia l'impronta nel registro, così l'approvazione del
 * revisore pubblica solo il testo che questo esame ha visto.
 * Non solleva: l'invio dell'autore riesce comunque; se lo screening non gira, il
 * revisore lo vede scritto e può rilanciarlo o usare la pubblicazione forzata.
 */
export async function screenRevisionAndAttach(
  svc: AnyClient,
  params: { biographyId: string; reportId: string | null; authorId: string }
): Promise<{ ok: boolean; verdict?: ReviewScreeningOutcome['verdict'] }> {
  if (await editionOriginalBlock(svc, params.biographyId)) {
    await releaseEditionRevision(svc, params.biographyId);
    return { ok: true, verdict: 'passed' };
  }

  let outcome: ReviewScreeningOutcome;
  try {
    outcome = await runScreeningForReview(svc, params.biographyId);
  } catch (err) {
    console.error('[revision-screening] screening failed', err);
    if (params.reportId) {
      try {
        await writeModerationMessage(svc, {
          reportId: params.reportId,
          senderId: params.authorId,
          internal: true,
          message:
            'Automatic screening could not run on the corrected text. Run the screening again, or publish with the forced publication (which leaves a trace).',
        });
      } catch (messageErr) {
        console.error('[revision-screening] message failed', messageErr);
      }
    }
    return { ok: false };
  }

  if (await editionOriginalBlock(svc, params.biographyId)) {
    await releaseEditionRevision(svc, params.biographyId);
    return { ok: true, verdict: outcome.verdict };
  }

  if (!params.reportId) return { ok: true, verdict: outcome.verdict };

  try {
    const { data: report } = await svc
      .from('moderation_reports')
      .select('ai_analysis')
      .eq('id', params.reportId)
      .maybeSingle();
    const previous = (report as { ai_analysis?: Record<string, unknown> | null } | null)?.ai_analysis ?? null;
    const summary = summaryOf(outcome);

    await svc
      .from('moderation_reports')
      .update({
        ai_analysis: {
          summary,
          flagged_passages: outcome.flaggedPassages,
          revision_screening: {
            verdict: outcome.verdict,
            fingerprint: outcome.fingerprint,
            examined_chars: outcome.examinedChars,
            source_chars: outcome.sourceChars,
            partial: outcome.partial,
            at: new Date().toISOString(),
          },
          previous_analysis: previous,
        },
        ai_violation_level: outcome.overallSeverity,
      })
      .eq('id', params.reportId);

    await writeModerationMessage(svc, {
      reportId: params.reportId,
      senderId: params.authorId,
      internal: true,
      message: summary,
    });
  } catch (err) {
    console.error('[revision-screening] attach failed', err);
    return { ok: false, verdict: outcome.verdict };
  }
  return { ok: true, verdict: outcome.verdict };
}
