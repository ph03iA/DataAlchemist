# 🚀 Data Alchemist

[![Deploy to GitHub Pages](https://github.com/ph03iA/DataAlchemist/actions/workflows/deploy.yml/badge.svg)](https://github.com/ph03iA/DataAlchemist/actions/workflows/deploy.yml)

Transform messy spreadsheets into optimized task assignments with intelligent business rules.

## ✨ Features

- **📁 Smart File Upload** - CSV/XLSX support with drag & drop
- **🤖 AI Data Validation** - Automatic error detection and suggestions  
- **📝 Natural Language Rules** - Create business logic in plain English
- **⚡ Real Allocation Engine** - Execute rules to assign workers to tasks
- **📊 Interactive Data Grid** - Edit and fix data inline
- **📈 Allocation Analytics** - View utilization, success rates, and reasoning
- **💾 Export Ready** - Download cleaned data and allocation results

## 🎯 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd da2
   npm install
   ```

2. **Setup Environment**
   ```bash
   # Create .env.local file with your API key
   # Get your free API key from: https://makersuite.google.com/app/apikey
   echo "NEXT_PUBLIC_AI_API_KEY=your_google_gemini_api_key" > .env.local
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   
4. **Open Browser**
   - Navigate to `http://localhost:3001`
   - Upload sample data from `public/sample-data/`

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI**: Google Gemini API with rate limiting
- **Data**: CSV/XLSX processing, Papa Parse
- **UI**: Framer Motion, Heroicons, React Hot Toast

## 📋 Sample Workflow

1. **Upload** clients.csv, workers.csv, tasks.csv
2. **Validate** data with AI-powered checks
3. **Create Rules** like "Assign senior workers to high-priority clients"
4. **Execute** allocation engine 
5. **Review** assignments with confidence scores and reasoning
6. **Export** results for production use

## 🚀 Live Demo

Visit the live application: [https://ph03ia.github.io/DataAlchemist/](https://ph03ia.github.io/DataAlchemist/)

## 🛠️ Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Data Format

The application expects three types of CSV files:

### Clients CSV
- `ClientID`, `ClientName`, `PriorityLevel` (1-5), `RequestedTaskIDs`, `GroupTag`, `AttributesJSON`

### Workers CSV  
- `WorkerID`, `WorkerName`, `Skills`, `AvailableSlots`, `MaxLoadPerPhase`, `WorkerGroup`, `QualificationLevel`

### Tasks CSV
- `TaskID`, `TaskName`, `Category`, `Duration`, `RequiredSkills`, `PreferredPhases`, `MaxConcurrent`

## 🤖 AI Configuration

Set your Google Gemini API key in the environment:
```
NEXT_PUBLIC_AI_API_KEY=your_gemini_api_key
```

---

**Built for solving "spreadsheet chaos" in resource allocation** 🎯 