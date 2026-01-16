This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

This application uses [Ollama](https://ollama.ai) to run the llama3.2:latest model locally. Before starting, make sure you have:

1. **Ollama installed**: Download and install from [https://ollama.ai](https://ollama.ai)
2. **Pull the llama3.2:latest model**:
   ```bash
   ollama pull llama3.2:latest
   ```
3. **Start the Ollama service**:
   ```bash
   ollama serve
   ```

## Getting Started

First, ensure Ollama is running (see Prerequisites above).

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Configuration (Optional)

By default, the app connects to Ollama at `http://localhost:11434/v1` and uses the `llama3.2:latest` model. 

You can customize these settings by creating a `.env.local` file (you can copy `.env.example`):

```bash
cp .env.example .env.local
```

Then edit `.env.local` to change:
- `OLLAMA_BASE_URL` - if your Ollama instance is running on a different host/port
- `OLLAMA_MODEL` - if you want to use a different Ollama model

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
