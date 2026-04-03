'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { privacyTranslations, type Language } from '@/lib/i18n/privacy-translations';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const privacy = privacyTranslations[language as Language];

  return (
    <div className="px-4 py-8 md:py-12 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <div className="text-center space-y-3 mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              {privacy.title}
            </h1>
            <p className="text-muted-foreground">{privacy.version}</p>
            <p className="text-sm text-muted-foreground">{privacy.effectiveDate}</p>
          </div>

          <div className="space-y-8 prose prose-sm dark:prose-invert max-w-none">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section1Title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                Biography Library è un&apos;associazione svizzera senza scopo di lucro con sede legale a Lugano, Ticino, Svizzera, costituita ai sensi degli articoli 60 e seguenti del Codice Civile Svizzero.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Mission:</strong> {privacy.section1Mission}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{privacy.section1Contacts}</strong>
              </p>
              <ul className="list-none space-y-1 ml-0">
                {privacy.section1ContactsList.map((contact, idx) => (
                  <li key={idx} className="text-muted-foreground">{contact}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section2Title}</h2>
              <p className="text-muted-foreground leading-relaxed">{privacy.section2Intro}</p>
              <ul className="space-y-2 ml-6">
                {privacy.section2Principles.map((principle, idx) => (
                  <li key={idx} className="text-muted-foreground leading-relaxed">{principle}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section3Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section3Registration}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section3RegistrationList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>

                <div className="bg-brand-wine/10 dark:bg-brand-wine/15 border-l-4 border-brand-wine p-4 my-4">
                  <p className="font-semibold text-foreground mb-2">{privacy.section3NeverCollect}</p>
                  <ul className="space-y-1 ml-6">
                    {privacy.section3NeverCollectList.map((item, idx) => (
                      <li key={idx} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section3Verification}</h3>
                <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section3VerificationRegistration}</strong></p>
                <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section3VerificationOnly}</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section3VerificationDocs.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground"><strong className="text-foreground">Conservation:</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section3VerificationStorage.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section3Content}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section3ContentList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section3Technical}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section3TechnicalList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section3AI}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section3AIList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section4Title}</h2>
              <p className="text-muted-foreground leading-relaxed">{privacy.section4Intro}</p>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section4Autobiography}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section4AutobiographyList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section4Deceased}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section4DeceasedList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-brand-wine/10 dark:bg-brand-wine/15 border-l-4 border-brand-wine p-4 my-4">
                <p className="font-semibold text-foreground mb-2">{privacy.section4Prohibited}</p>
                <ul className="space-y-1 ml-6">
                  {privacy.section4ProhibitedList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section4Declarations}</h3>
                <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section4DeclarationsAutobiography}</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section4DeclarationsAutobiographyList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section4DeclarationsDeceased}</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section4DeclarationsDeceasedList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
                <p className="text-sm text-brand-wineDark dark:text-brand-mustardLight mt-3">{privacy.section4FalseDeclarations}</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section5Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section5Purpose}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section5PurposeList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-brand-greenLight/30 dark:bg-brand-greenLight/10 border-l-4 border-brand-greenDark p-4 my-4">
                <h3 className="text-xl font-semibold text-foreground mb-2">{privacy.section5Never}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section5NeverList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section6Title}</h2>
              <p className="text-muted-foreground">{privacy.section6Legal}</p>
              <ul className="space-y-2 ml-6">
                {privacy.section6LegalList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section7Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section7Providers}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section7ProvidersList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section7Guarantees}</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section7GuaranteesList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section7Family}</h3>
                <p className="text-muted-foreground">{privacy.section7FamilyDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section7Reporting}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section7ReportingProcess.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section7Authorities}</h3>
                <p className="text-muted-foreground">{privacy.section7AuthoritiesIntro}</p>
                <ul className="space-y-1 ml-6">
                  {privacy.section7AuthoritiesList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section8Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section8Residency}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section8ResidencyList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section8Security}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section8SecurityList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section9Title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {privacy.section9Table[0].map((header, idx) => (
                        <th key={idx} className="border border-border p-3 text-left font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {privacy.section9Table.slice(1).map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-border p-3 text-muted-foreground">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground italic mt-2">{privacy.section9Note}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section10Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Access}</h3>
                <p className="text-muted-foreground">{privacy.section10AccessDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Rectification}</h3>
                <p className="text-muted-foreground">{privacy.section10RectificationDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Deletion}</h3>
                <p className="text-muted-foreground">{privacy.section10DeletionAutobiography}</p>
                <p className="text-muted-foreground mt-2">For biographies of deceased:</p>
                <ul className="space-y-1 ml-6">
                  {privacy.section10DeletionDeceased.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Portability}</h3>
                <p className="text-muted-foreground">Export formats: {privacy.section10PortabilityFormats.join(', ')}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Opposition}</h3>
                <p className="text-muted-foreground">{privacy.section10OppositionDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Revoke}</h3>
                <p className="text-muted-foreground">{privacy.section10RevokeDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section10Complaint}</h3>
                <p className="text-muted-foreground">{privacy.section10ComplaintSwitzerland}</p>
                <p className="text-muted-foreground">{privacy.section10ComplaintEU}</p>
                <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section10Exercise}</strong></p>
                <ul className="space-y-1 ml-6">
                  {privacy.section10ExerciseList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section11Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section11What}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section11WhatList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section11Never}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section11NeverList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section11Transparency}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section11TransparencyList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section11Local}</h3>
                <p className="text-muted-foreground">{privacy.section11LocalDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section11NoTraining}</h3>
                <p className="text-muted-foreground">{privacy.section11NoTrainingDesc}</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section12Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section12Report}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section12ReportList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section12Process}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section12ProcessList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section12Moderation}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section12ModerationList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section13Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section13Technical}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section13TechnicalList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section13NoProfiling}</h3>
                <p className="text-muted-foreground">{privacy.section13NoProfilingDesc}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section13NoAnalytics}</h3>
                <p className="text-muted-foreground">{privacy.section13NoAnalyticsDesc}</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section14Title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {privacy.section14Table[0].map((header, idx) => (
                        <th key={idx} className="border border-border p-3 text-left font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {privacy.section14Table.slice(1).map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-border p-3 text-muted-foreground">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section15Title}</h2>
              <p className="text-muted-foreground">{privacy.section15Intro}</p>
              <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section15Minors}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section15MinorsList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section16Title}</h2>
              <p className="text-muted-foreground">{privacy.section16Intro}</p>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section16Guarantees}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section16GuaranteesList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section16NoTransfer}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section16NoTransferList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section17Title}</h2>
              <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section17Updates}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section17UpdatesList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section17Notification}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section17NotificationList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section17NoRetroactivity}</strong></p>
              <p className="text-sm text-muted-foreground italic mt-2">{privacy.section17History}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section18Title}</h2>
              <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section18Contingency}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section18ContingencyList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section19Title}</h2>
              <p className="text-muted-foreground">{privacy.section19Intro}</p>
              <ul className="space-y-1 ml-6">
                {privacy.section19List.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mt-3">{privacy.section19Badge}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section20Title}</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section20DPO}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section20DPOList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section20Reporting}</h3>
                <ul className="space-y-1 ml-6">
                  {privacy.section20ReportingList.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{privacy.section20Authority}</h3>
                <p className="text-muted-foreground">{privacy.section20AuthoritySwitzerland}</p>
                <p className="text-muted-foreground">{privacy.section20AuthorityEU}</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section21Title}</h2>
              <p className="text-muted-foreground"><strong className="text-foreground">{privacy.section21Language}</strong></p>
              <p className="text-muted-foreground">{privacy.section21LanguageList}</p>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section21Law}</strong></p>
              <ul className="space-y-1 ml-6">
                {privacy.section21LawList.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3"><strong className="text-foreground">{privacy.section21Jurisdiction}</strong></p>
              <p className="text-muted-foreground">{privacy.section21JurisdictionLocation}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">{privacy.section22Title}</h2>
              <p className="text-muted-foreground">{privacy.section22Content}</p>
            </section>

            <section className="bg-muted p-6 rounded-lg mt-8">
              <h2 className="text-xl font-bold text-foreground mb-3">{privacy.lastRevision}</h2>
              <p className="text-muted-foreground">{privacy.lastRevisionVersion}</p>
              <p className="text-muted-foreground">{privacy.lastRevisionDate}</p>
            </section>

            <footer className="text-center pt-8 mt-12 border-t border-border space-y-3">
              <h3 className="text-2xl font-bold text-foreground">{privacy.footer}</h3>
              <p className="text-muted-foreground italic">{privacy.footerTagline}</p>
              <p className="text-sm text-muted-foreground">{privacy.footerHost}</p>
              <p className="text-sm text-muted-foreground">{privacy.footerOpenSource}</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
