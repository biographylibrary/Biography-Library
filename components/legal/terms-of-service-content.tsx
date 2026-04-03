'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';
import { termsTranslations } from '@/lib/i18n/terms-translations';
import { CheckCircle2, XCircle } from 'lucide-react';

export function TermsOfServiceContent() {
  const { language } = useTranslation();
  const t = termsTranslations[language];

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif font-semibold tracking-tight mb-2">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.lastUpdated}</p>
        <p className="text-sm text-muted-foreground">Version 1.0</p>
      </div>

      <p className="lead text-base mb-8">{t.introduction}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section1Title}</h2>
        {t.section1Content.map((line, idx) => (
          <p key={idx} className={idx > 1 ? 'ml-4' : ''}>{line}</p>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section2Title}</h2>
        <p>{t.section2Intro}</p>

        <div className="bg-brand-greenLight/35 dark:bg-brand-greenLight/10 border-l-4 border-brand-greenDark p-4 my-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-greenDark dark:text-brand-greenLight mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-brand-ink dark:text-brand-greenLight mb-1">{t.section2Autobiography}</h3>
              <p className="text-brand-ink dark:text-brand-beigeLight text-sm">{t.section2AutobiographyDesc}</p>
            </div>
          </div>
        </div>

        <div className="bg-brand-greenLight/35 dark:bg-brand-greenLight/10 border-l-4 border-brand-greenDark p-4 my-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-greenDark dark:text-brand-greenLight mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-brand-ink dark:text-brand-greenLight mb-1">{t.section2Deceased}</h3>
              <p className="text-brand-ink dark:text-brand-beigeLight text-sm">{t.section2DeceasedDesc}</p>
            </div>
          </div>
        </div>

        <div className="bg-brand-wine/10 dark:bg-brand-wine/15 border-l-4 border-brand-wine p-4 my-4">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-brand-wine dark:text-brand-mustardLight mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-brand-wineDark dark:text-brand-beigeLight mb-2">{t.section2Prohibited}</h3>
              <p className="text-brand-wineDark dark:text-brand-beigeLight text-sm mb-2">You CANNOT publish biographies of:</p>
              <ul className="list-disc list-inside space-y-1 text-brand-wineDark dark:text-brand-beigeLight text-sm">
                {t.section2ProhibitedList.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <p className="text-brand-wineDark dark:text-brand-beigeLight text-sm font-medium mt-3">{t.section2ProhibitedConsequence}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section3Title}</h2>
        <p>{t.section3Intro}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section3Responsibilities.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 font-medium">{t.section3Disclaimer}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section4Title}</h2>
        <p className="mb-2">When you publish a biography of a deceased person:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section4Content.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section5Title}</h2>
        <p className="mb-2">Biography Library respects your privacy and complies with Swiss data protection law (nLPD).</p>

        <h3 className="font-semibold mt-4 mb-2">{t.section5DataCollect}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section5DataCollectList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <h3 className="font-semibold mt-4 mb-2">{t.section5DataUse}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section5DataUseList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <p className="mt-3">{t.section5Hosting}</p>
        <p className="font-medium">{t.section5NoSale}</p>

        <h3 className="font-semibold mt-4 mb-2">{t.section5Rights}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section5RightsList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section6Title}</h2>
        <h3 className="font-semibold mb-2">{t.section6Control}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section6ControlList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-2">{t.section6Change}</p>

        <h3 className="font-semibold mt-4 mb-2">{t.section6License}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section6LicenseList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <p className="mt-3">{t.section6Ownership}</p>
        <p className="mt-2">{t.section6Deletion}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section7Title}</h2>
        <p className="mb-2">{t.section7Intro}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section7Features.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        {t.section7Provider && <p className="mt-3">{t.section7Provider}</p>}

        <h3 className="font-semibold mt-4 mb-2">{t.section7Important}</h3>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section7ImportantList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section8Title}</h2>
        <p className="mb-2">You may not publish:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section8List.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 font-medium">{t.section8Consequence}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section9Title}</h2>
        <p className="mb-2">{t.section9Intro}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section9CanReport.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{t.section9Review}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section10Title}</h2>
        <p className="mb-2">{t.section10Intro}</p>
        <p className="mb-2">{t.section10CannotGuarantee}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section10CannotGuaranteeList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <p className="mt-3 mb-2">{t.section10IfClose}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section10IfCloseList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <p className="mt-3 font-medium">{t.section10MaxLiability}</p>
        <p className="mb-2">{t.section10NotLiable}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section10NotLiableList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section11Title}</h2>
        {t.section11Content.map((para, idx) => (
          <p key={idx} className="mb-2">{para}</p>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section12Title}</h2>
        <p className="mb-2">{t.section12YouCan}</p>
        <p className="mb-2">{t.section12Deletes}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section12DeletesList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <p className="mt-4 mb-2">{t.section12WeCan}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section12WeCanList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section13Title}</h2>
        <p className="mb-2">{t.section13Intro}</p>
        <p className="mb-2 font-mono text-sm">{t.section13CodeUrl}</p>
        <p className="mb-2">{t.section13AnyoneCan}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section13AnyoneCanList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{t.section13OnlyWeIssue}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section14Title}</h2>
        <p className="mb-2">{t.section14Intro}</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          {t.section14Laws.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{t.section14Disputes}</p>
        <p className="mt-2">{t.section14EU}</p>
        <p className="mt-2">{t.section14Mediator}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t.section15Title}</h2>
        <p className="font-medium">{t.section15Org}</p>
        <p>{t.section15Location}</p>
        <p className="mt-3 mb-2">{t.section15Email}</p>
        <p className="font-mono text-sm ml-4">{t.section15EmailAddress}</p>
      </section>
    </div>
  );
}
