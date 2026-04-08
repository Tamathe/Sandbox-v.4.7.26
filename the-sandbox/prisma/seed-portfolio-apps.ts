/**
 * Seed script for demo portfolio (imported) apps.
 * Run: npx tsx prisma/seed-portfolio-apps.ts
 */
import { PrismaClient, ToolType, UserRole } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const PORTFOLIO_APPS = [
  {
    name: 'ΑΧΩ Philanthropy Assistant',
    shortDescription: 'AI donation prospecting wizard that helps Greek life organizations find local businesses and generate personalized outreach materials.',
    fullDescription: `A web-based wizard tool that helps Greek life organizations find local businesses to approach for donations, then generates personalized outreach materials including phone scripts, fundraising emails, and follow-up messages.

Built with Node.js, Express, and the Anthropic Claude API. Uses multi-step wizard flow with LocalStorage-based session persistence. Features include AI-generated business recommendations, personalized phone scripts (~90 seconds when read aloud), donation request emails, and map visualization of target businesses via Leaflet.js.`,
    externalUrl: 'https://chaelyn-philanthropy.vercel.app',
    category: 'Campus',
    techStack: ['Node.js', 'Express', 'Anthropic', 'JavaScript'],
    repoUrl: null,
    creatorEmail: 'tiana.the.student@uky.edu',
  },
  {
    name: 'Clinical Trial Matcher',
    shortDescription: 'AI-powered cancer clinical trial matching system for the UK Markey Cancer Center Molecular Tumor Board.',
    fullDescription: `A Streamlit web app for the University of Kentucky Markey Cancer Center's Molecular Tumor Board (MTB). It extracts patient data from clinical notes and genomic PDFs, searches ClinicalTrials.gov for matching trials, then scores each trial's eligibility using criterion-by-criterion AI matching.

5-stage pipeline: Extract (clinical PDFs + genomic reports), Retrieve (hybrid search of ClinicalTrials.gov), Match (criterion-by-criterion AI evaluation with ~87% accuracy), Rank (composite scoring with OncoKB evidence), Report (downloadable MTB report). Supports Caris, Guardant360, Tempus, and FoundationOne genomic formats.`,
    externalUrl: 'https://clinical-trial-matcher-markey.streamlit.app',
    category: 'Medicine',
    techStack: ['Python', 'Streamlit', 'Anthropic', 'OpenAI', 'PyTorch'],
    repoUrl: null,
    creatorEmail: 'katie.thompson@uky.edu',
  },
  {
    name: 'Kaylee Daniel Portfolio',
    shortDescription: 'Personal brand site for UK Track & Field pole vaulter — bio, meet results, personal records, gallery, press, and NIL partnerships.',
    fullDescription: `A CMS-driven personal website for Kaylee Daniel, a University of Kentucky Track & Field pole vaulter. Features a full athlete portfolio with biography, meet results, personal records (PRs), photo/video gallery, press coverage, and NIL partnership showcase.

Built with Next.js 15 (App Router) + React 19, with Sanity.io as the headless CMS so the athlete can update content without coding. Includes embedded Sanity Studio, Framer Motion scroll animations, responsive lightbox gallery, and a contact form powered by Resend.`,
    externalUrl: 'https://kaylee-daniel.vercel.app',
    category: 'Campus',
    techStack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Sanity'],
    repoUrl: null,
    creatorEmail: 'tiana.the.student@uky.edu',
  },
  {
    name: 'KCH Network Tool',
    shortDescription: 'RAG-powered document search for Kentucky Children\'s Hospital — providers search policies and guidelines with AI-generated cited answers.',
    fullDescription: `A full-stack Retrieval-Augmented Generation (RAG) system for the Kentucky Children's Hospital (KCH) network. Healthcare providers search a vector database of hospital policies, procedures, and guidelines using natural language, with AI-generated answers that cite source documents.

Backend: Python FastAPI with ChromaDB vector store, OpenAI embeddings (text-embedding-3-large), and Anthropic Claude for answer generation. Frontend: Next.js 14 + React 18. Features include admin document upload pipeline (PDF/DOCX/TXT → chunking → embedding), hybrid retrieval (semantic + BM25), confidence scoring, conversation threads, analytics dashboard, and role-based access control.`,
    externalUrl: 'https://kch-network-tool.vercel.app',
    category: 'Practice',
    techStack: ['Python', 'FastAPI', 'Next.js', 'React', 'TypeScript', 'OpenAI', 'Anthropic'],
    repoUrl: null,
    creatorEmail: 'tiana.the.student@uky.edu',
  },
]

async function main() {
  console.log('Seeding portfolio apps...')

  for (const app of PORTFOLIO_APPS) {
    // Find creator
    const creator = await prisma.user.findUnique({
      where: { email: app.creatorEmail },
    })
    if (!creator) {
      console.warn(`  Skipping "${app.name}" — creator ${app.creatorEmail} not found`)
      continue
    }

    const isPrivileged = creator.role === 'EDUCATOR' || creator.role === 'ADMIN'

    // Upsert by name + creator to avoid duplicates
    const existing = await prisma.tool.findFirst({
      where: { name: app.name, creatorId: creator.id, toolType: 'PORTFOLIO' },
    })

    if (existing) {
      await prisma.tool.update({
        where: { id: existing.id },
        data: {
          shortDescription: app.shortDescription,
          fullDescription: app.fullDescription,
          externalUrl: app.externalUrl,
          category: app.category,
          techStack: app.techStack,
          repoUrl: app.repoUrl,
          isPortfolio: true,
        },
      })
      console.log(`  Updated: ${app.name}`)
    } else {
      await prisma.tool.create({
        data: {
          name: app.name,
          shortDescription: app.shortDescription,
          fullDescription: app.fullDescription,
          category: app.category,
          toolType: 'PORTFOLIO' as ToolType,
          externalUrl: app.externalUrl,
          techStack: app.techStack,
          repoUrl: app.repoUrl,
          isPortfolio: true,
          published: true,
          approvalStatus: isPrivileged ? 'APPROVED' : 'PENDING',
          fastTrackApprovedAt: isPrivileged ? new Date() : null,
          difficultyLevel: 'Introductory',
          creatorId: creator.id,
        },
      })
      console.log(`  Created: ${app.name} (${isPrivileged ? 'APPROVED' : 'PENDING'})`)
    }
  }

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
