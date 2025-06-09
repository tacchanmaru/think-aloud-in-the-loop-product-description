# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Architecture Overview

This is a Next.js research application for conducting product description editing experiments with two conditions:

### Experiment Types
- **Baseline Manual** (`/baseline-manual`): Users manually edit product descriptions
- **Think Aloud** (`/think-aloud`): Users speak their thoughts while AI assists with editing

### Key Components Structure
- **Experiment Pages**: Each experiment type has its own page component with similar phases:
  1. Product image upload phase (`ProductImageUploadPhase`)
  2. Text editing/correction phase with different interaction models
  
- **Data Flow**: 
  - Experiments use `ExperimentResult` union types (`ManualExperimentResult` | `ThinkAloudExperimentResult`)
  - Data saved via `saveExperimentTaskData()` service → `/api/saveTaskData` → Firebase
  - Product selection handled by `getProductForExperiment()` with user-specific assignment

### Firebase Integration
- Client config in `lib/firebase.ts`, Admin config in `lib/firebaseAdmin.ts`
- Experiment results stored with structured data including timing, steps, and user interactions

### Audio Recording (Think Aloud)
- Uses `RealtimeAudioRecorder` for real-time speech-to-text transcription
- Integrates with OpenAI APIs for processing spoken instructions into text modifications

### UI Framework
- Tailwind CSS + shadcn/ui components
- Japanese language interface
- Custom components in `components/custom/` for experiment-specific UI

### Test Mode
- `useTestMode` hook enables testing without full experiment flow
- Controlled via environment or development flags