# AI Section Review Component

A comprehensive AI-powered review dialog for biography sections with improvement suggestions, rewriting capabilities, and content statistics.

## Features

### 1. Suggestions Tab
- **AI-powered improvement suggestions** categorized by type:
  - 📖 **Clarity**: Makes confusing text clearer
  - ✨ **Detail**: Adds missing details or specificity
  - 🔄 **Flow**: Improves transitions and narrative flow
  - 🎨 **Style**: Enhances writing style and tone
  - 🏗️ **Structure**: Reorganizes content structure

- **Priority Levels**:
  - **High**: Critical errors or important changes (auto-selected)
  - **Medium**: Beneficial improvements
  - **Low**: Optional suggestions

- **Actions**:
  - Select/deselect individual improvements
  - Ignore suggestions you don't want
  - Apply selected improvements with one click
  - View original vs. suggested text side-by-side

### 2. Rewrite Tab
- **Three tone options**:
  - **Narrative**: Storytelling style with vivid descriptions
  - **Formal**: Polished and professional tone
  - **Intimate**: Warm and personal, like a letter to loved ones

- **Features**:
  - Generate rewrites on-demand for any tone
  - Compare original vs. rewritten side-by-side
  - Preserves all factual information
  - One-click apply or keep original

### 3. Statistics Tab
- **Content Metrics**:
  - Word count
  - Character count
  - Sentence count
  - Paragraph count

- **Readability Analysis**:
  - Readability score (0-100)
  - Average words per sentence
  - Suggestions for improvement

- **Improvement Summary**:
  - Total improvements found
  - Breakdown by priority level

## Usage

### Basic Integration

```tsx
import { useState } from 'react';
import { AISectionReview } from '@/components/editor/AISectionReview';

function YourEditor() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [content, setContent] = useState('Your text here...');

  const handleApplyChanges = (newContent: string, changeType: 'improvements' | 'rewrite') => {
    setContent(newContent);
    console.log(`Applied ${changeType}`);
  };

  return (
    <>
      <button onClick={() => setReviewOpen(true)}>
        Review with AI
      </button>

      <AISectionReview
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        biographyId="biography-uuid"
        sectionKey="early-life"
        sectionTitle="Early Life"
        content={content}
        language="en"
        onApplyChanges={handleApplyChanges}
      />
    </>
  );
}
```

### Integrated in Biography Editor

The component is fully integrated in the biography editor at `app/biography/[id]/edit/page.tsx`. Users can access it by clicking the "Review" button in the editor toolbar when AI is enabled.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Callback when dialog opens/closes |
| `biographyId` | `string` | UUID of the biography |
| `sectionKey` | `string` | Key identifier for the section (e.g., 'early-life', 'education') |
| `sectionTitle` | `string` | Display title of the section |
| `content` | `string` | Current section content to review |
| `language` | `string` | Content language (`en`, `it`, `fr`, `de`) |
| `onApplyChanges` | `(newContent: string, changeType: 'improvements' \| 'rewrite') => void` | Callback when changes are applied |

## Features in Detail

### Revision History
When improvements or rewrites are applied, the component automatically:
- Increments the section's `draft_version`
- Saves the change to `revision_history` in the database
- Records the change type and description
- Tracks number of improvements applied

### Loading States
- Shows spinner while analyzing content
- Individual loading states for each rewrite tone
- Disabled buttons during API calls
- Progress feedback to the user

### Error Handling
- Graceful error messages via toast notifications
- Handles rate limiting errors
- Falls back to original content on failure
- Logs errors for debugging

### UI/UX Features
- Responsive design for all screen sizes
- Smooth tab transitions
- Scrollable content areas
- Color-coded priority badges
- Visual comparison views
- Auto-selection of high-priority items

## Database Schema

The component uses the existing `biography_sections` table:

```sql
-- Required fields
id uuid PRIMARY KEY
draft_version integer DEFAULT 1
revision_history jsonb DEFAULT '[]'

-- Each revision entry:
{
  "version": 2,
  "content": "...",
  "timestamp": "2024-01-01T00:00:00Z",
  "changeType": "ai_improvement" | "ai_rewrite" | "manual_edit",
  "description": "Applied 3 AI improvements",
  "improvementsApplied": 3
}
```

## Services Used

### AI Provider (`lib/ai/ai-provider.ts`)
- `suggestImprovements()` - Gets categorized improvement suggestions
- `rewriteSectionWithToken()` - Rewrites content in different tones

### Revision History (`lib/revision-history-service.ts`)
- `addRevisionToHistory()` - Saves revision to database
- `getRevisionHistory()` - Retrieves all revisions
- `restoreRevision()` - Restores a previous version
- `getCurrentVersion()` - Gets current version number

## Styling

Uses shadcn/ui components:
- Dialog
- Tabs
- Card
- Button
- Badge
- Separator
- ScrollArea
- Loader

All components are fully themed and support dark mode.

## Performance Considerations

- **Lazy Loading**: Rewrite versions are only generated when requested
- **Caching**: Suggestions are loaded once per dialog open
- **Optimistic Updates**: UI updates immediately, database updates async
- **Rate Limiting**: Handled by the edge function (5 requests/minute)

## Future Enhancements

Potential additions:
- [ ] Batch apply improvements by type
- [ ] Undo/redo functionality
- [ ] Compare multiple rewrite versions
- [ ] Export review summary
- [ ] Save favorite improvements
- [ ] Custom tone options
- [ ] Grammar-only mode
- [ ] Spelling-only mode

## Example Workflows

### Workflow 1: Quick Grammar Fix
1. User clicks "Review with AI"
2. Suggestions tab loads automatically
3. High-priority items are pre-selected
4. User clicks "Apply Selected"
5. Changes are applied and saved

### Workflow 2: Style Rewrite
1. User opens review dialog
2. Switches to "Rewrite" tab
3. Clicks "Generate" for "Intimate" tone
4. Reviews side-by-side comparison
5. Clicks "Replace with this version"
6. New version is applied

### Workflow 3: Content Analysis
1. User opens review dialog
2. Switches to "Statistics" tab
3. Reviews readability score
4. Notes average words per sentence is high
5. Returns to "Suggestions" tab
6. Applies flow improvements to shorten sentences

## Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AISectionReview } from './AISectionReview';

describe('AISectionReview', () => {
  it('loads suggestions on open', async () => {
    render(
      <AISectionReview
        open={true}
        onOpenChange={jest.fn()}
        sectionId="test-id"
        sectionTitle="Test Section"
        content="Test content"
        language="en"
        onApplyChanges={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    });
  });

  it('applies selected improvements', async () => {
    const onApplyChanges = jest.fn();

    render(
      <AISectionReview
        open={true}
        onOpenChange={jest.fn()}
        sectionId="test-id"
        sectionTitle="Test Section"
        content="Test content"
        language="en"
        onApplyChanges={onApplyChanges}
      />
    );

    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.queryByText(/analyzing/i)).not.toBeInTheDocument();
    });

    // Click apply button
    const applyButton = screen.getByText(/apply selected/i);
    await userEvent.click(applyButton);

    expect(onApplyChanges).toHaveBeenCalled();
  });
});
```

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management
- Screen reader friendly
- High contrast mode support
- Semantic HTML structure

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Part of the Biography Library application.
