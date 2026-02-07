import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { AISectionReview } from './AISectionReview';

export function SectionEditorWithReview() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sectionContent, setSectionContent] = useState('Your biography content here...');

  const biographyId = 'your-biography-id';
  const sectionKey = 'early-life';
  const sectionTitle = 'Early Life';
  const language = 'en';

  const handleApplyChanges = (newContent: string, changeType: 'improvements' | 'rewrite') => {
    setSectionContent(newContent);

    console.log(`Applied ${changeType} to section`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{sectionTitle}</h2>
        <Button onClick={() => setReviewOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Review with AI
        </Button>
      </div>

      <textarea
        className="w-full min-h-[400px] p-4 border rounded-lg"
        value={sectionContent}
        onChange={(e) => setSectionContent(e.target.value)}
      />

      <AISectionReview
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        biographyId={biographyId}
        sectionKey={sectionKey}
        sectionTitle={sectionTitle}
        content={sectionContent}
        language={language}
        onApplyChanges={handleApplyChanges}
      />
    </div>
  );
}
