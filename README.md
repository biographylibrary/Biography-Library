# Biography Library

A modern, multilingual biography creation platform that helps preserve life stories and family memories. Built with Next.js, Supabase, and AI assistance.

## Features

### Multi-Language Support
- **Four Languages**: English, Italiano, Français, Deutsch
- **UI Translation**: Complete interface translation for all supported languages
- **Content Localization**: Each biography can be written in a different language
- **AI Assistance**: AI-powered writing suggestions, grammar checking, and guided prompts in the user's selected language
- **Language Persistence**: User language preference saved across sessions

### Biography Management
- **Structured Sections**: Organized biography sections (Early Years, Family, Education, Career, etc.)
- **Privacy Levels**: Private, Family, or Public sharing options
- **Rich Editor**: Intuitive text editor with formatting toolbar
- **Voice Recording**: Record memories and transcribe to text
- **Draft & Completion Status**: Track biography progress

### AI-Powered Features
- **Grammar Checking**: AI-powered grammar and style suggestions in multiple languages
- **Content Expansion**: Get help expanding your stories with AI
- **Guided Prompts**: Receive thoughtful questions to help spark memories
- **Smart Suggestions**: Context-aware writing assistance

### Sharing & Export
- **Share Links**: Generate public links to share biographies with family
- **PDF Export**: Export biographies to professional PDF format
- **Swiss Hosting**: Data hosted in Switzerland with Infomaniak infrastructure (production)

### Demo Capabilities
- **Demo Biography Loader**: Load pre-filled example biographies in any language
- **Explore Features**: Perfect for demonstrations and testing

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: Edge Functions with AI integration
- **Internationalization**: Custom i18n solution
- **Deployment**: Netlify (demo) / Infomaniak (production)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd biography-library
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

4. **Run database migrations**
   - Database migrations are automatically applied via Supabase
   - Check `supabase/migrations/` for schema details

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
biography-library/
├── app/                      # Next.js App Router pages
│   ├── dashboard/           # Dashboard page
│   ├── login/              # Authentication pages
│   ├── register/
│   ├── biography/          # Biography edit/view pages
│   └── layout.tsx          # Root layout
├── components/              # React components
│   ├── dashboard/          # Dashboard-specific components
│   ├── editor/            # Biography editor components
│   ├── ui/                # shadcn/ui components
│   └── ...                # Shared components
├── lib/                    # Utilities and services
│   ├── i18n/              # Internationalization
│   │   ├── translations.ts # Translation strings
│   │   └── i18n-context.tsx # i18n React context
│   ├── ai-service.ts      # AI integration
│   ├── supabase.ts        # Supabase client
│   ├── biographies.ts     # Biography CRUD operations
│   └── demo-loader.ts     # Demo biography generator
├── supabase/
│   ├── functions/         # Edge Functions
│   │   └── ai-assistant/  # AI assistant endpoint
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## Available Languages

- **English (en)**: Full support for English-speaking users
- **Italiano (it)**: Completo supporto per utenti italiani
- **Français (fr)**: Support complet pour les utilisateurs francophones
- **Deutsch (de)**: Vollständige Unterstützung für deutschsprachige Benutzer

## Database Schema

### Tables
- **profiles**: User profiles with language preferences
- **biographies**: Biography metadata and content
- **biography_sections**: Individual biography sections
- **ai_rate_limits**: AI usage tracking

### Row Level Security
All tables use RLS policies to ensure users can only access their own data.

## Features in Detail

### Language Selection
- First-time users see a welcome modal to select their preferred language
- Language can be changed anytime via the header dropdown
- Each biography can be written in a language independent of the UI language

### Demo Biography
- Click "Load Demo Biography" on the dashboard
- Automatically generates a sample biography in the selected language
- Pre-filled with realistic content to showcase all features
- Perfect for presentations and demonstrations

### Privacy Levels
- **Private**: Only you can see this biography
- **Family**: Shareable via secure link
- **Public**: Accessible to anyone with the link

### AI Features
- Grammar checking detects errors and suggests improvements
- Content expansion helps elaborate on brief entries
- Guided prompts ask thoughtful questions to inspire writing
- All AI responses are generated in the biography's language

## Production Deployment

### Infomaniak Hosting (Production)
The production version is designed to be hosted on Infomaniak's Swiss infrastructure, ensuring:
- Data sovereignty (Swiss data protection)
- GDPR compliance
- High availability
- European data residency

### Environment Variables (Production)
Ensure all environment variables are set in your production environment:
- Supabase connection strings
- API keys for AI features
- Any additional service credentials

## Development

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Component-based architecture
- Responsive design (mobile-first)

### Testing
```bash
npm run lint       # Lint code
npm run typecheck  # Type checking
npm run build      # Test production build
```

## Contributing

This is a demo project for evaluation purposes. For production use with Infomaniak partnership, please contact the development team.

## License

**AGPL v3** - Biography Library is free and open source software to ensure that the preservation of human memory remains a public good, accessible to all, controlled by none.

This project is developed by **Biography Library Association**, a Swiss non-profit organization based in Lugano, Ticino, Switzerland.

- Full license text: See [LICENSE](./LICENSE) file
- Official website: biographylibrary.org
- Read our [Manifesto](docs/manifesto.md) biographylibrary.org/manifesto

### Why AGPL v3?

The Affero GPL ensures that if anyone runs a modified version of this software as a service, they must share their modifications. This protects the commons and prevents proprietary forks.

## Support

For demo access or questions about the Infomaniak partnership, please contact the project maintainers.

---

**Demo Version** - This is a demonstration version. The production version will use Infomaniak's Swiss infrastructure for enhanced data protection and compliance.
