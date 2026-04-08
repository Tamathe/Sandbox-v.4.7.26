/**
 * seed-uknow.ts — Seed UKNow articles from corpus file or inline fallback.
 *
 * If prisma/data/uknow-corpus.json exists (from crawl-uknow.ts or export-uknow.ts),
 * seeds all articles from that file. Otherwise falls back to 50 inline articles.
 *
 * Each article gets body chunks but no embeddings (use backfill-uknow-embeddings.ts).
 * Idempotent: skips articles that already exist by slug.
 *
 * Usage:
 *   npx tsx scripts/seed-uknow.ts
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(10, 0, 0, 0)
  return d
}

interface SeedArticle {
  slug: string
  section: string
  sectionLabel: string
  title: string
  author: string
  publishedAt: Date
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  body: string
  entities: { people: string[]; departments: string[]; programs: string[]; topics: string[] }
}

const ARTICLES: SeedArticle[] = [
  // ─── Campus News (8) ──────────────────────────────────────────
  {
    slug: 'spring-enrollment-record-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'UK Sets Spring Enrollment Record with 31,247 Students',
    author: 'UK Public Relations',
    publishedAt: daysAgo(2),
    summary: 'The University of Kentucky set a spring enrollment record with 31,247 students, a 2.1% increase year-over-year.',
    sentiment: 'positive',
    body: 'The University of Kentucky has announced a new spring enrollment record of 31,247 students, representing a 2.1% increase over the previous year. Online enrollment grew by 15%, with particularly strong gains in graduate programs across engineering, data science, and health informatics. President Eli Capilouto credited the growth to UK\'s strategic investments in student support and innovative academic programs. "This milestone reflects our commitment to expanding access while maintaining the quality that defines a Kentucky education," Capilouto said. First-year retention rates also improved to 86.3%, the highest in university history.',
    entities: { people: ['Eli Capilouto'], departments: ['Office of the President', 'Enrollment Management'], programs: ['Engineering', 'Data Science'], topics: ['enrollment', 'student growth', 'retention'] },
  },
  {
    slug: 'ai-ethics-minor-proposal-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Faculty Senate Considers New AI Ethics Minor',
    author: 'Academic Affairs',
    publishedAt: daysAgo(5),
    summary: 'A proposal for a new AI Ethics minor is under review by the Faculty Senate Curriculum Committee.',
    sentiment: 'neutral',
    body: 'The UK Faculty Senate Curriculum Committee is reviewing a proposal for a new interdisciplinary AI Ethics minor that would span the College of Arts and Sciences, the College of Engineering, and the Martin School of Public Policy. The 18-credit-hour program would include courses in philosophy of technology, algorithmic bias, data governance, and a capstone practicum. Professor Maria Chen, who co-authored the proposal, noted that student demand for ethics-focused AI coursework has tripled since 2024. The committee is expected to vote on the proposal at its April meeting.',
    entities: { people: ['Maria Chen'], departments: ['Faculty Senate', 'Arts and Sciences', 'Engineering'], programs: ['AI Ethics Minor'], topics: ['artificial intelligence', 'ethics', 'curriculum'] },
  },
  {
    slug: 'commencement-speaker-announced-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Spring 2026 Commencement Speaker Announced',
    author: 'UK Public Relations',
    publishedAt: daysAgo(7),
    summary: 'The University has announced the keynote speaker for the Spring 2026 commencement ceremony.',
    sentiment: 'positive',
    body: 'The University of Kentucky has announced Dr. Mae Jemison, the first African American woman to travel to space, as the keynote speaker for the Spring 2026 commencement ceremony on May 10 at Kroger Field. Dr. Jemison, who is also a physician and engineer, will address approximately 5,200 graduates and their families. "Dr. Jemison\'s story embodies the power of education to open doors that once seemed impossible," said Provost Robert DiPaola. The ceremony will also feature the traditional singing of "My Old Kentucky Home" and a flyover by the UK Army ROTC.',
    entities: { people: ['Mae Jemison', 'Robert DiPaola'], departments: ['Office of the Provost'], programs: [], topics: ['commencement', 'graduation', 'keynote'] },
  },
  {
    slug: 'sustainability-initiative-campus-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'UK Launches $25 Million Campus Sustainability Initiative',
    author: 'UK Communications',
    publishedAt: daysAgo(10),
    summary: 'A new sustainability initiative will fund solar installations, EV charging stations, and green building retrofits across campus.',
    sentiment: 'positive',
    body: 'The University of Kentucky announced a $25 million sustainability initiative that will transform campus infrastructure over the next five years. The initiative includes installation of solar panels on 12 buildings, 200 new EV charging stations, LED lighting retrofits in all residence halls, and a campus-wide composting program. The funding comes from a combination of federal grants, alumni donations, and energy savings reinvestment. "We owe it to our students to model the sustainable practices they\'ll need to champion in their careers," said Vice President for Facilities Mary Lynn Collins. The first phase begins this summer with solar installations on the Chemistry-Physics building and the Gatton College of Business.',
    entities: { people: ['Mary Lynn Collins'], departments: ['Facilities Management'], programs: [], topics: ['sustainability', 'solar energy', 'green campus'] },
  },
  {
    slug: 'new-student-union-renovation-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Student Center Renovation Enters Final Phase',
    author: 'UK Public Relations',
    publishedAt: daysAgo(14),
    summary: 'The $65 million Student Center renovation is on track for a fall 2026 grand reopening.',
    sentiment: 'positive',
    body: 'The extensive renovation of the UK Student Center is entering its final phase, with construction crews completing interior finishes on the new food hall, collaborative study spaces, and expanded student organization offices. The $65 million project, which began in 2024, will add 40,000 square feet of new space including a rooftop terrace, a maker space, and a meditation room. Student Government President James Liu said the new center will "finally give students a gathering place that matches the quality of our academic programs." A soft opening is planned for August with the grand reopening celebration scheduled for September 12.',
    entities: { people: ['James Liu'], departments: ['Student Government', 'Facilities Management'], programs: [], topics: ['student center', 'renovation', 'construction'] },
  },
  {
    slug: 'campus-safety-report-spring-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Campus Safety Report Shows Decrease in Incidents',
    author: 'UK Police Department',
    publishedAt: daysAgo(18),
    summary: 'UK Police report a 12% decrease in campus incidents compared to the same period last year.',
    sentiment: 'positive',
    body: 'The University of Kentucky Police Department released its spring safety report showing a 12% decrease in reported incidents compared to the same period in 2025. Chief Joe Monroe attributed the improvement to expanded patrol coverage, the new campus lighting initiative, and increased use of the LiveSafe mobile app, which saw a 35% increase in tips. The report also highlighted the success of the bystander intervention training program, which has now reached over 8,000 students. "Safety is a community effort, and our students are stepping up," Monroe said. The department plans to add two new safety stations near the residence hall complex this summer.',
    entities: { people: ['Joe Monroe'], departments: ['UK Police Department'], programs: [], topics: ['campus safety', 'crime prevention', 'LiveSafe'] },
  },
  {
    slug: 'dining-hall-expansion-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Champions Kitchen Expands with International Food Hall',
    author: 'UK Dining',
    publishedAt: daysAgo(22),
    summary: 'Champions Kitchen adds a new international food hall featuring cuisines from six countries.',
    sentiment: 'positive',
    body: 'Champions Kitchen, UK\'s award-winning dining facility, has unveiled a new international food hall featuring rotating cuisines from six countries. The expansion includes stations for Korean bibimbap, Indian curry, Ethiopian injera, Mexican street tacos, Vietnamese pho, and Mediterranean mezze. UK Dining Director Sarah Park said the expansion responds to student surveys showing 78% wanted more diverse food options. "Our campus reflects the world, and our dining should too," Park said. The international hall also features a cultural education component, with each station displaying information about the cuisine\'s history and traditions. Nutritional information is available in real-time through the UK Dining app.',
    entities: { people: ['Sarah Park'], departments: ['UK Dining'], programs: [], topics: ['dining', 'international food', 'campus life'] },
  },
  {
    slug: 'library-24-hour-expansion-2026',
    section: 'campus-news',
    sectionLabel: 'Campus News',
    title: 'Young Library Moves to 24/7 Hours During Finals',
    author: 'UK Libraries',
    publishedAt: daysAgo(25),
    summary: 'William T. Young Library will operate 24 hours a day during the final three weeks of the spring semester.',
    sentiment: 'positive',
    body: 'UK Libraries announced that the William T. Young Library will operate 24 hours a day, seven days a week during the final three weeks of the spring 2026 semester. The extended hours respond to a Student Government resolution and a petition signed by over 3,000 students. Library Dean Doug Way said the pilot program includes additional security staff, free coffee after midnight provided by a local sponsor, and extended tutoring services. "The library belongs to the students, and we want to be there when they need us most," Way said. Usage data from the pilot will determine whether 24/7 hours become permanent during peak academic periods.',
    entities: { people: ['Doug Way'], departments: ['UK Libraries'], programs: [], topics: ['library', 'finals', 'study spaces'] },
  },

  // ─── Research (7) ─────────────────────────────────────────────
  {
    slug: 'cancer-research-breakthrough-markey-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'Markey Cancer Center Team Discovers New Immunotherapy Target',
    author: 'Research Communications',
    publishedAt: daysAgo(3),
    summary: 'A team at the Markey Cancer Center identified a protein that could improve immunotherapy response rates for lung cancer patients.',
    sentiment: 'positive',
    body: 'Researchers at the University of Kentucky Markey Cancer Center have identified a previously unknown protein interaction that could significantly improve immunotherapy response rates in non-small cell lung cancer patients. The study, published in Nature Medicine, was led by Dr. Susanne Arnold and involved analysis of tumor samples from over 400 patients across five clinical sites. The team found that patients with high expression of the protein KIF2C showed a 67% better response to checkpoint inhibitor therapy. "This finding could help us identify which patients will benefit most from immunotherapy before treatment begins," said Dr. Arnold. The Markey Center has filed a provisional patent and plans to begin clinical validation trials this fall.',
    entities: { people: ['Susanne Arnold'], departments: ['Markey Cancer Center'], programs: [], topics: ['cancer research', 'immunotherapy', 'lung cancer', 'breakthrough'] },
  },
  {
    slug: 'nsf-quantum-computing-grant-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'UK Receives $8.5 Million NSF Grant for Quantum Computing Research',
    author: 'Research Communications',
    publishedAt: daysAgo(8),
    summary: 'The National Science Foundation awarded UK an $8.5 million grant to establish a quantum computing research center.',
    sentiment: 'positive',
    body: 'The University of Kentucky has been awarded an $8.5 million grant from the National Science Foundation to establish the Kentucky Quantum Computing Research Center (KQCRC). The five-year grant will fund research into quantum algorithms for drug discovery, materials science, and cryptography. Dr. Raphael Chen, who will direct the center, said UK is uniquely positioned for this work due to its existing strengths in high-performance computing and pharmaceutical research. The grant also includes $1.5 million for student fellowships and workforce development programs. "Quantum computing will transform every field from medicine to finance," said Dr. Chen. "This center ensures Kentucky is at the forefront of that transformation." The center will be housed in the new STEM building opening in 2027.',
    entities: { people: ['Raphael Chen'], departments: ['Computer Science', 'NSF'], programs: ['KQCRC'], topics: ['quantum computing', 'research grant', 'NSF'] },
  },
  {
    slug: 'alzheimers-clinical-trial-results-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'Sanders-Brown Center Reports Promising Alzheimer\'s Trial Results',
    author: 'UK HealthCare',
    publishedAt: daysAgo(12),
    summary: 'Phase II clinical trial at Sanders-Brown shows 30% reduction in cognitive decline with new combination therapy.',
    sentiment: 'positive',
    body: 'The UK Sanders-Brown Center on Aging has reported promising results from a Phase II clinical trial testing a novel combination therapy for early-stage Alzheimer\'s disease. The trial, which enrolled 186 participants over 18 months, showed a 30% reduction in cognitive decline compared to placebo. Dr. Linda Van Eldik, director of the center, presented the findings at the Alzheimer\'s Association International Conference. "These results suggest that targeting both amyloid and tau proteins simultaneously may be more effective than single-target approaches," she said. The research team is now designing a larger Phase III trial expected to begin enrollment in early 2027.',
    entities: { people: ['Linda Van Eldik'], departments: ['Sanders-Brown Center on Aging'], programs: [], topics: ['Alzheimers', 'clinical trial', 'neuroscience'] },
  },
  {
    slug: 'agricultural-drone-technology-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'College of Agriculture Develops AI-Powered Crop Monitoring Drones',
    author: 'College of Agriculture',
    publishedAt: daysAgo(16),
    summary: 'UK researchers developed drone technology that uses AI to detect crop diseases up to two weeks before visible symptoms appear.',
    sentiment: 'positive',
    body: 'Researchers in UK\'s College of Agriculture, Food and Environment have developed a drone-based monitoring system that uses artificial intelligence to detect crop diseases up to two weeks before symptoms become visible to the human eye. The system, which combines hyperspectral imaging with machine learning algorithms, was tested on tobacco, corn, and soybean fields across central Kentucky. Lead researcher Dr. Michael Sama said the technology could save Kentucky farmers an estimated $50 million annually in crop losses. "By the time a farmer can see disease symptoms, it\'s often too late for effective treatment," Sama explained. The team is working with the Kentucky Department of Agriculture to make the technology available to farmers statewide through the cooperative extension system.',
    entities: { people: ['Michael Sama'], departments: ['College of Agriculture'], programs: [], topics: ['agriculture', 'drones', 'AI', 'crop monitoring'] },
  },
  {
    slug: 'engineering-robotics-competition-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'UK Engineering Team Wins National Robotics Competition',
    author: 'College of Engineering',
    publishedAt: daysAgo(20),
    summary: 'UK\'s autonomous robotics team placed first at the National Robotics Challenge with their search-and-rescue robot.',
    sentiment: 'positive',
    body: 'A team of UK mechanical and electrical engineering students won first place at the National Robotics Challenge in Cleveland, Ohio, with their autonomous search-and-rescue robot named "WildcatBot." The robot navigated a simulated disaster environment, locating and identifying survivors using thermal imaging and LIDAR sensors. Team captain Priya Patel said the team spent over 2,000 hours developing the robot over the past academic year. Faculty advisor Dr. Jesse Hoagg praised the students\' interdisciplinary approach. "They combined mechanical design, computer vision, and AI planning in ways that impressed even the industry judges," Hoagg said. NASA representatives at the competition expressed interest in adapting the technology for planetary exploration missions.',
    entities: { people: ['Priya Patel', 'Jesse Hoagg'], departments: ['College of Engineering'], programs: [], topics: ['robotics', 'engineering', 'competition'] },
  },
  {
    slug: 'rare-earth-minerals-research-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'Kentucky Geological Survey Identifies New Rare Earth Mineral Deposits',
    author: 'Research Communications',
    publishedAt: daysAgo(24),
    summary: 'UK geologists discovered significant rare earth mineral deposits in eastern Kentucky coal regions.',
    sentiment: 'positive',
    body: 'Scientists at the Kentucky Geological Survey, part of the University of Kentucky, have identified significant deposits of rare earth elements in coal ash and mine refuse across eastern Kentucky. The discovery could position the region as a domestic source for minerals critical to electric vehicle batteries, wind turbines, and defense technology. Principal investigator Dr. Amanda Hower estimated the deposits could yield over 15,000 tons of rare earth oxides. "This is an extraordinary opportunity to create high-tech jobs in communities that have been hit hardest by the decline of coal," Hower said. The U.S. Department of Energy has awarded a $3.2 million grant to fund a pilot extraction facility near Hazard.',
    entities: { people: ['Amanda Hower'], departments: ['Kentucky Geological Survey'], programs: [], topics: ['rare earth minerals', 'coal', 'eastern Kentucky', 'clean energy'] },
  },
  {
    slug: 'psychology-social-media-study-2026',
    section: 'research',
    sectionLabel: 'Research',
    title: 'UK Study Links Social Media Breaks to Improved Student Well-Being',
    author: 'College of Arts and Sciences',
    publishedAt: daysAgo(28),
    summary: 'A 12-week study of 800 UK students found that structured social media breaks improved sleep quality and reduced anxiety.',
    sentiment: 'positive',
    body: 'A study conducted by UK\'s Department of Psychology involving 800 undergraduate students found that structured 48-hour social media breaks every two weeks led to significant improvements in sleep quality, anxiety levels, and academic focus. The randomized controlled trial, published in the Journal of American College Health, was led by Dr. Nathan DeWall. Students who followed the structured break protocol reported 22% better sleep quality and 18% lower anxiety scores. "We\'re not saying students should quit social media entirely," Dr. DeWall clarified. "But intentional breaks can recalibrate the brain\'s reward system and restore cognitive resources." The study has attracted national media attention and is being replicated at five other universities.',
    entities: { people: ['Nathan DeWall'], departments: ['Psychology'], programs: [], topics: ['social media', 'mental health', 'student wellness'] },
  },

  // ─── Arts & Culture (6) ───────────────────────────────────────
  {
    slug: 'singletary-center-season-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'Singletary Center Announces Record-Breaking Season Lineup',
    author: 'College of Fine Arts',
    publishedAt: daysAgo(4),
    summary: 'The 2026-27 season features Yo-Yo Ma, Alvin Ailey, and the premiere of a commissioned opera by UK alumna.',
    sentiment: 'positive',
    body: 'The Singletary Center for the Arts has unveiled its 2026-27 season, which Artistic Director Eli Regan called "the most ambitious in our history." Highlights include a recital by cellist Yo-Yo Ma, performances by the Alvin Ailey American Dance Theater, and the world premiere of "Appalachian Song," an opera commissioned from UK alumna and Grammy nominee Dr. Katherine Cole. The season also features a new community engagement series bringing performances to underserved neighborhoods in Lexington. Season subscriptions have already surpassed last year\'s total, with the Yo-Yo Ma concert selling out within 48 hours of announcement.',
    entities: { people: ['Eli Regan', 'Yo-Yo Ma', 'Katherine Cole'], departments: ['College of Fine Arts', 'Singletary Center'], programs: [], topics: ['performing arts', 'music', 'opera', 'dance'] },
  },
  {
    slug: 'art-museum-exhibition-appalachian-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'UK Art Museum Opens Major Appalachian Photography Exhibition',
    author: 'UK Art Museum',
    publishedAt: daysAgo(11),
    summary: 'A new exhibition at the UK Art Museum features 200 photographs documenting Appalachian life from 1920 to present.',
    sentiment: 'positive',
    body: 'The University of Kentucky Art Museum has opened "Mountain Light: 100 Years of Appalachian Photography," a landmark exhibition featuring over 200 photographs documenting life in the Appalachian region from the 1920s through today. The exhibition includes works by celebrated photographers Shelby Lee Adams, Builder Levy, and a new commission from emerging Lexington-based artist Tanya Rivers. Museum Director Stuart Horodner said the exhibition challenges stereotypical portrayals of Appalachia. "These photographs show the complexity, beauty, and resilience of a region that has been too often reduced to caricature," Horodner said. The exhibition runs through August 15 and is free to the public.',
    entities: { people: ['Stuart Horodner', 'Tanya Rivers'], departments: ['UK Art Museum'], programs: [], topics: ['photography', 'Appalachia', 'exhibition', 'art'] },
  },
  {
    slug: 'theater-department-national-award-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'UK Theatre Department Receives Kennedy Center Award',
    author: 'College of Fine Arts',
    publishedAt: daysAgo(17),
    summary: 'UK\'s Department of Theatre and Dance received the Kennedy Center American College Theater Festival distinguished program award.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s Department of Theatre and Dance has been honored with the Kennedy Center American College Theater Festival (KCACTF) Distinguished Program Award, recognizing it as one of the top ten undergraduate theater programs in the nation. The award cited the department\'s innovative production of "The Laramie Project," its commitment to diversity in casting and storytelling, and its pioneering virtual reality theater lab. Department Chair Dr. Nancy Jones dedicated the award to the students. "Our students take creative risks that push the boundaries of what theater can be," Jones said. Three UK students also received individual KCACTF awards for acting, design, and playwriting.',
    entities: { people: ['Nancy Jones'], departments: ['Theatre and Dance'], programs: [], topics: ['theater', 'Kennedy Center', 'award'] },
  },
  {
    slug: 'creative-writing-program-expansion-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'MFA Creative Writing Program Adds Screenwriting Track',
    author: 'College of Arts and Sciences',
    publishedAt: daysAgo(21),
    summary: 'UK\'s nationally ranked MFA program will add a screenwriting concentration starting fall 2026.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s MFA in Creative Writing program, currently ranked 25th nationally by Poets & Writers, will add a screenwriting concentration beginning in fall 2026. The new track will include courses in screenplay structure, television writing, and documentary scriptwriting, with a partnership with the Kentucky Film Commission for internship placements. Program Director Nikky Finney, a National Book Award winner, said the expansion reflects the evolving landscape of storytelling. "Our students are already telling stories across every medium. Now we\'re giving them the formal training to do it at the highest level," Finney said. Applications for the inaugural screenwriting cohort open in September.',
    entities: { people: ['Nikky Finney'], departments: ['English', 'Creative Writing'], programs: ['MFA Creative Writing'], topics: ['screenwriting', 'creative writing', 'MFA'] },
  },
  {
    slug: 'jazz-ensemble-carnegie-hall-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'UK Jazz Ensemble Selected for Carnegie Hall Performance',
    author: 'School of Music',
    publishedAt: daysAgo(26),
    summary: 'UK\'s student jazz ensemble will perform at Carnegie Hall as part of the National College Jazz Festival.',
    sentiment: 'positive',
    body: 'The University of Kentucky Jazz Ensemble has been selected to perform at Carnegie Hall in New York City as part of the prestigious National College Jazz Festival in April. The 18-member ensemble, directed by Dr. Miles Osland, was chosen from over 100 university jazz programs nationwide. The group will perform original compositions by UK music students alongside jazz standards. Trumpeter and senior music major David Washington said the selection was "a dream come true." The performance will be live-streamed on the Singletary Center\'s website for those unable to attend in person.',
    entities: { people: ['Miles Osland', 'David Washington'], departments: ['School of Music'], programs: [], topics: ['jazz', 'Carnegie Hall', 'music performance'] },
  },
  {
    slug: 'film-studies-documentary-festival-2026',
    section: 'arts-culture',
    sectionLabel: 'Arts & Culture',
    title: 'UK Student Documentary Wins Tribeca Film Festival Award',
    author: 'College of Communication',
    publishedAt: daysAgo(30),
    summary: 'A documentary by UK film studies students about eastern Kentucky water access won the Tribeca short documentary prize.',
    sentiment: 'positive',
    body: 'A documentary short film produced by University of Kentucky film studies students has won the short documentary prize at the Tribeca Film Festival. "Clear Water," directed by senior Alicia Fuentes, documents the ongoing water access challenges in Martin County, Kentucky, and the community\'s grassroots efforts to solve them. The film was shot over six months with a budget of just $3,000. Professor Tom Marksbury, who supervised the project, called it "the most impactful student work I\'ve seen in 20 years of teaching." The film has been acquired by PBS for national broadcast and has sparked renewed legislative attention to rural water infrastructure in Kentucky.',
    entities: { people: ['Alicia Fuentes', 'Tom Marksbury'], departments: ['College of Communication', 'Film Studies'], programs: [], topics: ['documentary', 'Tribeca', 'film', 'eastern Kentucky'] },
  },

  // ─── Sports (6) ───────────────────────────────────────────────
  {
    slug: 'basketball-season-preview-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'Wildcats Basketball: Five Freshmen to Watch in 2026-27',
    author: 'UK Athletics',
    publishedAt: daysAgo(1),
    summary: 'UK basketball welcomes the No. 2 ranked recruiting class with five five-star freshmen.',
    sentiment: 'positive',
    body: 'The Kentucky Wildcats men\'s basketball team enters the 2026-27 season with the nation\'s second-ranked recruiting class, featuring five five-star freshmen who have already generated Big Blue Nation buzz. Coach Mark Pope, entering his third season, called this class "the most versatile group I\'ve coached at Kentucky." The headliner is 6\'10" forward Marcus Johnson from Indianapolis, the top-ranked player in the class of 2026, who averaged 28 points and 12 rebounds as a high school senior. Point guard recruit Jaylen Torres brings elite court vision, while shooting guard Caleb Wright has drawn comparisons to Devin Booker. The Cats open the season November 7 against Duke in the Champions Classic.',
    entities: { people: ['Mark Pope', 'Marcus Johnson'], departments: ['UK Athletics'], programs: [], topics: ['basketball', 'recruiting', 'Big Blue Nation'] },
  },
  {
    slug: 'womens-volleyball-sec-championship-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'UK Volleyball Captures Third Consecutive SEC Championship',
    author: 'UK Athletics',
    publishedAt: daysAgo(6),
    summary: 'The Wildcats volleyball team won their third straight SEC title with a 3-1 victory over Florida.',
    sentiment: 'positive',
    body: 'The UK women\'s volleyball team has captured its third consecutive SEC Championship with a dominant 3-1 victory over Florida in the conference tournament final. Senior outside hitter Alli Stumler was named tournament MVP after recording 22 kills in the championship match. Coach Craig Skinner praised his team\'s resilience throughout the season. "This group never stopped competing, even when we were down sets," Skinner said. The Wildcats finished the regular season 27-3 and earned a top-4 national seed in the NCAA Tournament. The team will host first and second round matches at Memorial Coliseum next weekend.',
    entities: { people: ['Alli Stumler', 'Craig Skinner'], departments: ['UK Athletics'], programs: [], topics: ['volleyball', 'SEC Championship', 'NCAA'] },
  },
  {
    slug: 'football-spring-practice-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'Spring Football: Wildcats Debut New Offensive System',
    author: 'UK Athletics',
    publishedAt: daysAgo(13),
    summary: 'UK football opens spring practice with a revamped spread offense under new offensive coordinator.',
    sentiment: 'neutral',
    body: 'UK football kicked off spring practice with a new-look spread offense installed by first-year offensive coordinator Ryan Williams. The system emphasizes up-tempo play, RPO concepts, and more vertical passing routes. Quarterback Brock Vandagriff, entering his second season as starter, said the new offense "fits my skill set perfectly." Coach Mark Stoops, entering his 14th season, said the changes reflect the evolution of SEC football. "We need to score more points to compete at the highest level, and this system gives us the tools to do that," Stoops said. The Blue-White Spring Game is scheduled for April 12 at Kroger Field.',
    entities: { people: ['Ryan Williams', 'Brock Vandagriff', 'Mark Stoops'], departments: ['UK Athletics'], programs: [], topics: ['football', 'spring practice', 'SEC'] },
  },
  {
    slug: 'track-field-national-record-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'UK Sprinter Sets Collegiate Record in 200 Meters',
    author: 'UK Athletics',
    publishedAt: daysAgo(19),
    summary: 'Sophomore sprinter Abby Steiner breaks the NCAA indoor 200-meter record at the SEC Championships.',
    sentiment: 'positive',
    body: 'UK sophomore sprinter Keisha Williams shattered the NCAA indoor record in the 200 meters with a time of 22.18 seconds at the SEC Indoor Championships in Nashville. Williams, a native of Louisville, overtook the previous record by 0.07 seconds in a performance that UK track coach Lonnie Greene called "transcendent." "Keisha has been training at an elite level all season, and tonight she showed the world what she\'s capable of," Greene said. Williams also anchored the UK 4x400 relay team to a conference title. She is now considered the favorite for the NCAA Indoor Championships in March and a strong contender for the 2028 Olympics.',
    entities: { people: ['Keisha Williams', 'Lonnie Greene'], departments: ['UK Athletics', 'Track and Field'], programs: [], topics: ['track and field', 'record', 'sprinting', 'SEC'] },
  },
  {
    slug: 'baseball-stadium-upgrade-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'Kentucky Proud Park Receives $15 Million Enhancement',
    author: 'UK Athletics',
    publishedAt: daysAgo(23),
    summary: 'Major upgrades to UK\'s baseball stadium include new seating, video boards, and climate-controlled club areas.',
    sentiment: 'positive',
    body: 'UK Athletics has announced a $15 million enhancement project for Kentucky Proud Park, the home of Wildcat baseball. The improvements include 1,500 additional premium seats, a 4,000-square-foot video board, climate-controlled club areas along the first and third base lines, and upgraded concession facilities. Athletic Director Mitch Barnhart said the upgrades position UK baseball among the best facilities in the SEC. "Our baseball program has consistently competed at a championship level, and our facility needs to match that standard," Barnhart said. Construction will begin after the 2026 season and is expected to be complete for the 2027 home opener. Funding comes from private donations and athletics revenue.',
    entities: { people: ['Mitch Barnhart'], departments: ['UK Athletics'], programs: [], topics: ['baseball', 'stadium', 'facilities'] },
  },
  {
    slug: 'equestrian-national-championship-2026',
    section: 'sports',
    sectionLabel: 'Sports',
    title: 'UK Equestrian Team Wins National Championship',
    author: 'UK Athletics',
    publishedAt: daysAgo(27),
    summary: 'The Wildcats equestrian team claimed their second national title with victories in both flat and fences.',
    sentiment: 'positive',
    body: 'The University of Kentucky equestrian team has won the National Collegiate Equestrian Association championship, the program\'s second national title. The Wildcats dominated the competition, winning both the flat and fences divisions. Senior captain Emma Kurtz was named the championship\'s most outstanding performer after winning all four of her individual rides. Coach Jill Byrne praised the team\'s depth and consistency throughout the season. "Every single rider contributed to this championship," Byrne said. "Our team culture is built on accountability and support, and that showed on the biggest stage." Kentucky finished the season with a 15-1 record and a perfect 8-0 mark in SEC competition.',
    entities: { people: ['Emma Kurtz', 'Jill Byrne'], departments: ['UK Athletics', 'Equestrian'], programs: [], topics: ['equestrian', 'national championship', 'horses'] },
  },

  // ─── Community (5) ────────────────────────────────────────────
  {
    slug: 'community-garden-partnership-2026',
    section: 'community',
    sectionLabel: 'Community',
    title: 'UK Partners with Lexington to Create 10 Community Gardens',
    author: 'UK Community Engagement',
    publishedAt: daysAgo(9),
    summary: 'A partnership between UK and the city will establish 10 community gardens in food desert neighborhoods.',
    sentiment: 'positive',
    body: 'The University of Kentucky and the Lexington-Fayette Urban County Government have announced a partnership to establish 10 community gardens in neighborhoods identified as food deserts. The initiative, funded by a $2 million USDA grant, will be managed by UK\'s College of Agriculture, Food and Environment with support from Master Gardener volunteers. Each garden will include raised beds, a tool library, a composting station, and a small greenhouse for year-round growing. UK Extension Agent Lisa Johnson said the gardens will also serve as outdoor classrooms for nutrition education. "Access to fresh food shouldn\'t depend on your zip code," Johnson said. The first three gardens will open this spring in the North Limestone, Cardinal Valley, and Winburn neighborhoods.',
    entities: { people: ['Lisa Johnson'], departments: ['College of Agriculture', 'Extension'], programs: [], topics: ['community gardens', 'food access', 'partnership'] },
  },
  {
    slug: 'free-tax-preparation-service-2026',
    section: 'community',
    sectionLabel: 'Community',
    title: 'Gatton Students Provide Free Tax Preparation for 2,000 Families',
    author: 'Gatton College of Business',
    publishedAt: daysAgo(15),
    summary: 'Accounting students offered free tax preparation through the VITA program, saving families an estimated $500,000.',
    sentiment: 'positive',
    body: 'Students in UK\'s Gatton College of Business and Economics completed their annual Volunteer Income Tax Assistance (VITA) program, providing free tax preparation services to over 2,000 low-income families in the Lexington area. The student volunteers, all certified by the IRS, operated eight preparation sites across Fayette County, including locations at community centers, churches, and public libraries. Accounting Professor Dr. Mark Liu estimated the program saved families approximately $500,000 in preparation fees and helped identify over $3 million in earned income tax credits that families might have otherwise missed. "This is experiential learning at its best," Dr. Liu said. "Students build professional skills while making a tangible difference in their community."',
    entities: { people: ['Mark Liu'], departments: ['Gatton College of Business', 'Accounting'], programs: ['VITA'], topics: ['tax preparation', 'volunteer', 'community service'] },
  },
  {
    slug: 'habitat-for-humanity-build-2026',
    section: 'community',
    sectionLabel: 'Community',
    title: 'UK Builds Five Homes with Habitat for Humanity This Spring',
    author: 'UK Community Engagement',
    publishedAt: daysAgo(20),
    summary: 'Over 500 UK students, faculty, and staff volunteered to build five Habitat for Humanity homes in Lexington.',
    sentiment: 'positive',
    body: 'The University of Kentucky completed its largest Habitat for Humanity project to date, building five homes in the Meadowthorpe neighborhood over spring break. Over 500 volunteers from 30 student organizations, faculty groups, and staff departments contributed more than 4,000 hours of labor. The homes were built for families who participated in Habitat\'s homeownership education program. UK President Eli Capilouto, who swung hammers alongside students on Saturday, called the project "a beautiful expression of what it means to be a community." Student Government helped coordinate the effort and raised $25,000 toward construction costs through a campus fundraising campaign.',
    entities: { people: ['Eli Capilouto'], departments: ['Community Engagement', 'Student Government'], programs: ['Habitat for Humanity'], topics: ['volunteer', 'housing', 'community service'] },
  },
  {
    slug: 'k12-stem-outreach-program-2026',
    section: 'community',
    sectionLabel: 'Community',
    title: 'UK STEM Ambassadors Visit 50 Kentucky Schools',
    author: 'College of Engineering',
    publishedAt: daysAgo(25),
    summary: 'UK graduate students brought hands-on STEM activities to 50 K-12 schools across Kentucky, reaching 8,000 students.',
    sentiment: 'positive',
    body: 'UK\'s STEM Ambassadors program sent 40 graduate students to 50 K-12 schools across Kentucky this semester, delivering hands-on science and engineering workshops to over 8,000 students from kindergarten through 12th grade. The workshops covered topics including robotics, water quality testing, coding basics, and bridge engineering. Program coordinator Dr. Alisha Patel said the initiative focuses on rural and underserved schools where students have fewer STEM enrichment opportunities. "When a kid in Owsley County builds their first circuit and sees an LED light up, that spark can change the trajectory of their life," Patel said. The program is funded by the National Science Foundation and the Kentucky Council on Postsecondary Education.',
    entities: { people: ['Alisha Patel'], departments: ['College of Engineering', 'NSF'], programs: ['STEM Ambassadors'], topics: ['STEM', 'K-12', 'outreach', 'rural Kentucky'] },
  },
  {
    slug: 'lexington-clinic-partnership-dental-2026',
    section: 'community',
    sectionLabel: 'Community',
    title: 'UK Dentistry Opens Free Clinic in East Lexington',
    author: 'College of Dentistry',
    publishedAt: daysAgo(29),
    summary: 'A new free dental clinic staffed by UK dental students provides services to uninsured residents.',
    sentiment: 'positive',
    body: 'The UK College of Dentistry has opened a free dental clinic in east Lexington to serve uninsured and underinsured residents. The clinic, located at the Bluegrass Community Health Center, is staffed by third and fourth-year dental students under faculty supervision. Services include cleanings, fillings, extractions, and oral health education. Dean Jeffrey Okeson said the clinic addresses a critical gap in access to dental care. "Dental disease is one of the most common chronic conditions in Kentucky, yet many people can\'t afford basic care," Okeson said. The clinic has capacity to see 40 patients per week and has already built a waitlist of 200 people since its opening day.',
    entities: { people: ['Jeffrey Okeson'], departments: ['College of Dentistry'], programs: [], topics: ['dental care', 'free clinic', 'healthcare access'] },
  },

  // ─── UK HealthCare (6) ────────────────────────────────────────
  {
    slug: 'healthcare-expansion-richmond-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'UK HealthCare Opens New Outpatient Center in Richmond',
    author: 'UK HealthCare',
    publishedAt: daysAgo(4),
    summary: 'The new 60,000-square-foot facility brings specialty care closer to patients in Madison County.',
    sentiment: 'positive',
    body: 'UK HealthCare has opened a new 60,000-square-foot outpatient center in Richmond, Kentucky, bringing specialty medical services closer to patients in Madison and surrounding counties. The facility includes clinics for cardiology, orthopedics, neurology, oncology, and behavioral health, along with an imaging center and lab services. UK HealthCare CEO Dr. Mark Newman said the expansion reflects the health system\'s mission to serve all Kentuckians. "No one should have to drive two hours for specialty care," Newman said. The Richmond center is expected to serve 25,000 patients annually and has created 120 new healthcare jobs in the community.',
    entities: { people: ['Mark Newman'], departments: ['UK HealthCare'], programs: [], topics: ['healthcare expansion', 'outpatient', 'Richmond'] },
  },
  {
    slug: 'nursing-simulation-lab-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'College of Nursing Unveils $10 Million Simulation Lab',
    author: 'College of Nursing',
    publishedAt: daysAgo(8),
    summary: 'A state-of-the-art simulation lab with AI-powered patient mannequins enhances nursing education.',
    sentiment: 'positive',
    body: 'The UK College of Nursing has unveiled a $10 million simulation laboratory featuring AI-powered patient mannequins that can simulate over 200 medical conditions with realistic physiological responses. The 15,000-square-foot facility includes a mock emergency room, ICU, labor and delivery suite, and home health environment. Dean Janie Heath said the lab allows students to practice high-stakes clinical scenarios before encountering them in real patient care. "In simulation, students can make mistakes, learn from them, and try again — something that\'s not possible with real patients," Heath said. The mannequins track student performance and provide real-time feedback on clinical decision-making. The facility was funded by a combination of state appropriations and a $4 million gift from UK alumni.',
    entities: { people: ['Janie Heath'], departments: ['College of Nursing'], programs: [], topics: ['nursing education', 'simulation', 'healthcare training'] },
  },
  {
    slug: 'telehealth-rural-kentucky-expansion-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'UK HealthCare Telehealth Program Reaches 100,000 Rural Patients',
    author: 'UK HealthCare',
    publishedAt: daysAgo(13),
    summary: 'UK\'s telehealth network has served its 100,000th rural patient, connecting 80 Kentucky counties to specialists.',
    sentiment: 'positive',
    body: 'UK HealthCare\'s telehealth program has reached a milestone, serving its 100,000th patient in rural Kentucky since the program\'s expansion in 2023. The network now connects patients in 80 of Kentucky\'s 120 counties to UK specialists via video consultations at local clinics. The most-used specialties are behavioral health, endocrinology, and dermatology. Chief Digital Health Officer Dr. Robin Scobee said telehealth has dramatically reduced no-show rates. "When patients don\'t have to drive three hours and take a day off work, they actually keep their appointments," Scobee said. The program is now piloting remote patient monitoring for chronic conditions like diabetes and heart failure, with 500 patients enrolled in the pilot.',
    entities: { people: ['Robin Scobee'], departments: ['UK HealthCare'], programs: ['Telehealth'], topics: ['telehealth', 'rural health', 'digital health'] },
  },
  {
    slug: 'pharmacy-opioid-recovery-program-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'UK Pharmacy Launches Innovative Opioid Recovery Support Program',
    author: 'College of Pharmacy',
    publishedAt: daysAgo(19),
    summary: 'A new program embeds pharmacists in recovery centers to improve medication adherence and reduce relapse rates.',
    sentiment: 'positive',
    body: 'The UK College of Pharmacy has launched an innovative program that embeds clinical pharmacists in opioid recovery centers across central and eastern Kentucky. The pharmacists work alongside counselors and physicians to manage medication-assisted treatment (MAT) regimens, monitor drug interactions, and provide patient education. Early data from the pilot shows a 40% improvement in medication adherence and a 25% reduction in 30-day relapse rates. Program director Dr. Patricia Freeman said Kentucky\'s pharmacy workforce is uniquely positioned to support recovery. "Pharmacists are the most accessible healthcare providers in many rural communities," Freeman said. The program currently operates in 12 centers and is funded by a $6 million grant from the Substance Abuse and Mental Health Services Administration.',
    entities: { people: ['Patricia Freeman'], departments: ['College of Pharmacy'], programs: [], topics: ['opioid recovery', 'pharmacy', 'substance abuse'] },
  },
  {
    slug: 'pediatric-heart-surgery-milestone-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'Kentucky Children\'s Hospital Performs 1,000th Pediatric Heart Surgery',
    author: 'UK HealthCare',
    publishedAt: daysAgo(24),
    summary: 'The pediatric cardiac surgery program reaches a milestone, with outcomes that rank among the nation\'s best.',
    sentiment: 'positive',
    body: 'Kentucky Children\'s Hospital at UK HealthCare has performed its 1,000th pediatric heart surgery, a milestone that reflects the program\'s growth from a small regional service to one of the top-performing pediatric cardiac programs in the Southeast. The milestone surgery was a complex repair on a 3-month-old infant with tetralogy of Fallot. Lead surgeon Dr. Sibu Saha said the program\'s survival rates now exceed the national average by 3%. "Every number represents a family that trusted us with their child\'s life," Dr. Saha said. "That responsibility drives us to be better every single day." The program has grown from performing 50 cases per year in 2015 to over 150 annually, reducing the number of Kentucky families who need to travel out of state for pediatric cardiac care.',
    entities: { people: ['Sibu Saha'], departments: ['Kentucky Children\'s Hospital', 'UK HealthCare'], programs: [], topics: ['pediatric surgery', 'heart surgery', 'milestone'] },
  },
  {
    slug: 'mental-health-initiative-students-2026',
    section: 'uk-healthcare',
    sectionLabel: 'UK HealthCare',
    title: 'UK HealthCare Expands Student Mental Health Services',
    author: 'UK Counseling Center',
    publishedAt: daysAgo(28),
    summary: 'Same-day crisis appointments, embedded counselors in residence halls, and a new wellness app launch.',
    sentiment: 'positive',
    body: 'UK HealthCare and the UK Counseling Center have announced a major expansion of student mental health services, including same-day crisis appointments, embedded counselors in all 18 residence halls, and the launch of a UK-specific wellness app with guided meditation, mood tracking, and anonymous peer support. The initiative, funded by a $3 million allocation from the Board of Trustees, responds to a campus-wide mental health survey showing that 35% of students reported significant anxiety. Counseling Center Director Dr. Mary Bolin said the traditional model of waiting rooms and scheduled appointments doesn\'t work for students in crisis. "We\'re meeting students where they are — in their dorms, on their phones, on their schedule," Bolin said.',
    entities: { people: ['Mary Bolin'], departments: ['UK Counseling Center', 'UK HealthCare'], programs: [], topics: ['mental health', 'counseling', 'student wellness', 'wellness app'] },
  },

  // ─── Students (6) ─────────────────────────────────────────────
  {
    slug: 'student-startup-wins-funding-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'UK Student Startup Wins $100K at Pitch Competition',
    author: 'Von Allmen Center',
    publishedAt: daysAgo(3),
    summary: 'An AI tutoring startup founded by three UK students won top prize at the SEC Student Pitch Competition.',
    sentiment: 'positive',
    body: 'Three University of Kentucky students have won the $100,000 grand prize at the SEC Student Pitch Competition for their AI-powered tutoring startup, StudyPal. The app uses adaptive learning algorithms to create personalized study plans based on a student\'s course materials, learning style, and exam schedule. Co-founder and computer science major Derrick Owens said the idea came from his own frustration with generic study apps. "We wanted to build something that actually learns how you learn," Owens said. The team will use the prize money to hire developers and pilot the app at five SEC schools this fall. UK\'s Von Allmen Center for Entrepreneurship provided mentorship and pitch coaching throughout the competition.',
    entities: { people: ['Derrick Owens'], departments: ['Von Allmen Center', 'Computer Science'], programs: ['StudyPal'], topics: ['startup', 'entrepreneurship', 'AI', 'pitch competition'] },
  },
  {
    slug: 'study-abroad-record-participation-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'UK Study Abroad Participation Hits All-Time High',
    author: 'Education Abroad',
    publishedAt: daysAgo(7),
    summary: 'A record 2,800 UK students studied abroad this academic year, a 22% increase driven by new scholarship funds.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s Education Abroad office reports that a record 2,800 students participated in study abroad programs during the 2025-26 academic year, a 22% increase over the previous year. The growth was fueled by a new $5 million scholarship fund that covers airfare and housing costs for Pell Grant-eligible students. Director Susan Carvalho said the scholarships removed the biggest barrier to study abroad for low-income students. "Study abroad shouldn\'t be a luxury reserved for students who can afford it," Carvalho said. The most popular destinations were Spain, Germany, South Korea, and Costa Rica. Engineering and agriculture programs saw the largest increases in participation, up 45% and 38% respectively.',
    entities: { people: ['Susan Carvalho'], departments: ['Education Abroad'], programs: ['Study Abroad'], topics: ['study abroad', 'international education', 'scholarships'] },
  },
  {
    slug: 'first-gen-student-success-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'First-Generation Student Graduation Rate Reaches 70%',
    author: 'Student Success',
    publishedAt: daysAgo(12),
    summary: 'UK\'s first-generation student six-year graduation rate has climbed to 70%, narrowing the gap with continuing-generation students.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s six-year graduation rate for first-generation college students has reached 70%, narrowing the gap with continuing-generation students to just 8 percentage points — down from 18 points a decade ago. The improvement is attributed to a comprehensive support system that includes dedicated academic advisors, a peer mentoring program, emergency financial assistance, and a first-generation learning community in residence halls. Vice Provost for Student Success Dr. Kirsten Turner said the data validates UK\'s investment in targeted support. "First-generation students have every bit of talent and drive as their peers. They just need systems that recognize and address the unique challenges they face," Turner said. UK is now a national model for first-gen student support, with 15 other universities adopting elements of its program.',
    entities: { people: ['Kirsten Turner'], departments: ['Student Success'], programs: ['First-Generation Support'], topics: ['first-generation students', 'graduation rate', 'student success'] },
  },
  {
    slug: 'sga-housing-affordability-initiative-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'Student Government Launches Housing Affordability Initiative',
    author: 'Student Government',
    publishedAt: daysAgo(17),
    summary: 'SGA partners with Lexington landlords to create a verified affordable housing database for students.',
    sentiment: 'neutral',
    body: 'The UK Student Government Association has launched a housing affordability initiative that includes a verified database of off-campus apartments priced under $700 per month, a landlord rating system, and a free lease review service staffed by UK law students. SGA President James Liu said housing costs are the top concern among students based on campus-wide surveys. "Students are choosing between textbooks and rent. That\'s not acceptable," Liu said. The database launched with 150 verified listings and will be updated monthly. The initiative also includes a partnership with UK Financial Wellness to provide budgeting workshops focused on housing and living expenses. SGA plans to advocate to the Board of Trustees for a 0% increase in on-campus housing rates for the 2026-27 academic year.',
    entities: { people: ['James Liu'], departments: ['Student Government'], programs: [], topics: ['housing', 'affordability', 'student advocacy'] },
  },
  {
    slug: 'student-research-symposium-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'Showcase of Undergraduate Research Features 300 Projects',
    author: 'Office of Undergraduate Research',
    publishedAt: daysAgo(22),
    summary: 'UK\'s annual undergraduate research symposium showcased 300 projects from 14 colleges.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s annual Showcase of Undergraduate Research featured 300 student projects spanning all 14 colleges, making it the largest undergraduate research event in the university\'s history. Projects ranged from analyzing microplastics in Kentucky waterways to developing a mobile app for managing chronic pain without opioids. Top honors went to biochemistry major Sarah Kim for her work identifying a novel antibiotic compound from Kentucky cave bacteria. Director of Undergraduate Research Dr. Ruth Beattie said the growth in participation reflects UK\'s commitment to making research accessible to all students, not just those in STEM fields. "We had projects from music, social work, education, and agriculture alongside chemistry and engineering," Beattie said.',
    entities: { people: ['Sarah Kim', 'Ruth Beattie'], departments: ['Office of Undergraduate Research'], programs: [], topics: ['undergraduate research', 'symposium', 'student scholarship'] },
  },
  {
    slug: 'esports-arena-opening-2026',
    section: 'students',
    sectionLabel: 'Students',
    title: 'UK Opens State-of-the-Art Esports Arena',
    author: 'UK Athletics',
    publishedAt: daysAgo(26),
    summary: 'The new 5,000 sq ft esports arena in the Student Center features 60 gaming stations and a broadcast studio.',
    sentiment: 'positive',
    body: 'The University of Kentucky has opened a state-of-the-art esports arena in the renovated Student Center, featuring 60 high-performance gaming stations, a broadcast studio for live streaming, and a 200-seat spectator area with a 16-foot LED display wall. The facility supports UK\'s competitive esports teams, which compete in League of Legends, Valorant, Rocket League, and Overwatch. The arena is also available for casual gaming and hosts weekly community events. Esports Director Trent Mooring said the facility puts UK among the top esports programs in the country. "Esports is the fastest-growing segment of collegiate athletics, and this arena sends a message that UK is serious about competing at the highest level," Mooring said. The grand opening featured an exhibition match between UK and crosstown rival Transylvania University.',
    entities: { people: ['Trent Mooring'], departments: ['UK Athletics', 'Esports'], programs: ['Esports'], topics: ['esports', 'gaming', 'student life'] },
  },

  // ─── Faculty & Staff (6) ──────────────────────────────────────
  {
    slug: 'faculty-excellence-awards-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'Six Faculty Members Receive 2026 Great Teacher Awards',
    author: 'Office of the Provost',
    publishedAt: daysAgo(5),
    summary: 'UK\'s highest teaching honor goes to faculty in engineering, nursing, English, chemistry, social work, and music.',
    sentiment: 'positive',
    body: 'The University of Kentucky has named six recipients of the 2026 Great Teacher Award, the university\'s most prestigious recognition of teaching excellence. The honorees are Dr. James Park (Mechanical Engineering), Dr. Lisa Chen (Nursing), Dr. Marcus Williams (English), Dr. Priya Sharma (Chemistry), Dr. Robert Jackson (Social Work), and Dr. Maria Gonzalez (Music). Each recipient was nominated by current students and alumni and selected by a committee of previous winners. Provost Robert DiPaola praised the winners for their dedication to student learning. "These six educators represent the very best of what it means to be a teacher at the University of Kentucky," DiPaola said. The awards include a $10,000 stipend and a permanent increase in base salary.',
    entities: { people: ['James Park', 'Lisa Chen', 'Marcus Williams', 'Priya Sharma', 'Robert Jackson', 'Maria Gonzalez', 'Robert DiPaola'], departments: ['Office of the Provost'], programs: [], topics: ['teaching awards', 'faculty excellence', 'Great Teacher Award'] },
  },
  {
    slug: 'staff-professional-development-fund-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'UK Triples Staff Professional Development Fund',
    author: 'Human Resources',
    publishedAt: daysAgo(10),
    summary: 'The professional development fund increases from $500 to $1,500 per staff member annually.',
    sentiment: 'positive',
    body: 'The University of Kentucky has tripled its annual professional development allocation for staff members from $500 to $1,500 per person, effective July 1. The increase, approved by the Board of Trustees, covers conference attendance, certification programs, online courses, and professional memberships. Chief Human Resources Officer Kim Wilson said the investment reflects the university\'s recognition that staff growth benefits the entire institution. "Our staff are the backbone of this university, and investing in their development is investing in our future," Wilson said. The expanded fund also includes a new provision allowing staff to apply for up to $5,000 for degree-related coursework at UK, separate from the existing tuition benefit.',
    entities: { people: ['Kim Wilson'], departments: ['Human Resources'], programs: [], topics: ['professional development', 'staff benefits', 'training'] },
  },
  {
    slug: 'dei-council-annual-report-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'Annual Diversity Report Shows Progress in Faculty Hiring',
    author: 'Office of Institutional Diversity',
    publishedAt: daysAgo(16),
    summary: 'Underrepresented minority faculty hiring increased 18% while overall campus diversity metrics showed steady improvement.',
    sentiment: 'positive',
    body: 'The University of Kentucky\'s Office of Institutional Diversity released its annual report showing an 18% increase in underrepresented minority faculty hiring for the 2025-26 academic year. The report also highlighted a 12% increase in first-generation student enrollment, expansion of the Lyman T. Johnson Fellows program, and the launch of a new staff affinity group for employees with disabilities. Vice President for Institutional Diversity Dr. Sonja Feist-Price noted both progress and challenges. "We\'re moving in the right direction, but we have significant work ahead, particularly in retention of diverse faculty and in closing opportunity gaps for students of color," Feist-Price said.',
    entities: { people: ['Sonja Feist-Price'], departments: ['Office of Institutional Diversity'], programs: ['Lyman T. Johnson Fellows'], topics: ['diversity', 'faculty hiring', 'inclusion'] },
  },
  {
    slug: 'remote-work-policy-update-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'UK Updates Flexible Work Policy for Staff',
    author: 'Human Resources',
    publishedAt: daysAgo(21),
    summary: 'The updated policy allows eligible staff to work remotely up to three days per week with supervisor approval.',
    sentiment: 'neutral',
    body: 'The University of Kentucky has updated its flexible work arrangement policy to allow eligible staff members to work remotely up to three days per week, up from the previous two-day maximum. The change reflects employee feedback and retention data showing that flexible work options are the second most important factor in staff satisfaction after compensation. The updated policy also streamlines the approval process and introduces a 90-day trial period for new arrangements. Executive Vice President for Finance and Administration Eric Monday emphasized that the policy maintains accountability. "Flexibility and accountability aren\'t opposites — when implemented well, they reinforce each other," Monday said. Departments with customer-facing responsibilities will have modified guidelines to ensure coverage.',
    entities: { people: ['Eric Monday'], departments: ['Human Resources', 'Finance and Administration'], programs: [], topics: ['remote work', 'flexible work', 'staff policy'] },
  },
  {
    slug: 'faculty-sabbatical-highlights-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'Sabbatical Spotlight: Faculty Return with Groundbreaking Work',
    author: 'Office of the Provost',
    publishedAt: daysAgo(25),
    summary: 'Five faculty members share outcomes from their sabbatical research, including two book publications and a patent filing.',
    sentiment: 'positive',
    body: 'Five University of Kentucky faculty members shared the outcomes of their recent sabbatical work at the annual Sabbatical Spotlight event hosted by the Office of the Provost. Highlights include Dr. Andrea Roberts (History), who completed a book on civil rights activism in Appalachia now under contract with Oxford University Press; Dr. Kevin Zhang (Computer Science), who developed a patent-pending algorithm for detecting deepfake audio; and Dr. Carmen Aguilar (Public Health), whose sabbatical fieldwork in Guatemala led to a USAID-funded clean water project. Associate Provost for Faculty Affairs Dr. Lisa Cassis said sabbaticals are one of the university\'s most important investments. "The work that comes out of sabbaticals enriches our classrooms, advances our research mission, and serves communities far beyond campus," Cassis said.',
    entities: { people: ['Andrea Roberts', 'Kevin Zhang', 'Carmen Aguilar', 'Lisa Cassis'], departments: ['Office of the Provost'], programs: [], topics: ['sabbatical', 'faculty research', 'book publication'] },
  },
  {
    slug: 'new-employee-orientation-revamp-2026',
    section: 'faculty-staff',
    sectionLabel: 'Faculty & Staff',
    title: 'UK Revamps New Employee Orientation with Immersive Experience',
    author: 'Human Resources',
    publishedAt: daysAgo(29),
    summary: 'The redesigned orientation includes campus tours, peer mentoring, and a 30-day check-in program.',
    sentiment: 'positive',
    body: 'UK Human Resources has redesigned its new employee orientation from a half-day information session to a multi-week immersive onboarding experience. The new program includes a campus-wide walking tour, lunch with university leadership, a peer mentor match, department-specific onboarding modules, and a structured 30-day check-in series. HR Director of Talent Acquisition Rachel Adams said the redesign was informed by exit interview data showing that employees who felt disconnected in their first month were three times more likely to leave within a year. "The first 30 days set the tone for an employee\'s entire career at UK," Adams said. The program also includes a digital welcome package sent to new hires one week before their start date with information about parking, benefits enrollment, and campus resources.',
    entities: { people: ['Rachel Adams'], departments: ['Human Resources'], programs: [], topics: ['onboarding', 'employee experience', 'orientation'] },
  },
]

// ─── Corpus file loading ────────────────────────────────────────────────────

interface CorpusArticle {
  slug: string
  url: string
  title: string
  section: string
  sectionLabel: string
  author: string | null
  publishedAt: string | null
  body: string
  wordCount: number
  summary?: string | null
  sentiment?: string | null
  entities?: Record<string, string[]> | null
}

function loadCorpus(): CorpusArticle[] | null {
  const corpusPath = path.join(__dirname, '..', 'prisma', 'data', 'uknow-corpus.json')
  try {
    if (fs.existsSync(corpusPath)) {
      const data = JSON.parse(fs.readFileSync(corpusPath, 'utf-8')) as CorpusArticle[]
      console.log(`  Found corpus file: ${data.length} articles`)
      return data
    }
  } catch (e) {
    console.warn('  Warning: Could not parse corpus file, using inline fallback')
  }
  return null
}

// ─── Chunking (match the service layer's 2000-char chunks) ──────────────────

const CHUNK_SIZE = 2000
const CHUNK_OVERLAP = 256

function chunkText(text: string): string[] {
  if (!text) return []
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
    start = end - CHUNK_OVERLAP
  }
  return chunks
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding UKNow articles...')

  // Try corpus file first, fall back to inline ARTICLES
  const corpus = loadCorpus()
  const articles: CorpusArticle[] = corpus ?? ARTICLES.map((a) => ({
    slug: a.slug,
    url: `https://uknow.uky.edu/${a.section}/${a.slug}`,
    title: a.title,
    section: a.section,
    sectionLabel: a.sectionLabel,
    author: a.author,
    publishedAt: a.publishedAt.toISOString(),
    body: a.body,
    wordCount: a.body.split(/\s+/).length,
    summary: a.summary,
    sentiment: a.sentiment,
    entities: a.entities,
  }))

  let created = 0
  let skipped = 0
  const batchSize = 100
  const total = articles.length

  for (let i = 0; i < total; i++) {
    const a = articles[i]
    const existing = await prisma.uKNowArticle.findUnique({ where: { slug: a.slug } })
    if (existing) {
      skipped++
      continue
    }

    const article = await prisma.uKNowArticle.create({
      data: {
        slug: a.slug,
        section: a.section,
        sectionLabel: a.sectionLabel,
        url: a.url,
        title: a.title,
        author: a.author,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
        wordCount: a.wordCount || (a.body ? a.body.split(/\s+/).length : 0),
        summary: a.summary ?? null,
        sentiment: a.sentiment ?? null,
        entities: a.entities ?? undefined,
      },
    })

    // Create body chunks (matching service layer chunking)
    const bodyChunks = chunkText(a.body)
    for (let ci = 0; ci < bodyChunks.length; ci++) {
      await prisma.uKNowChunk.create({
        data: {
          articleId: article.id,
          chunkIndex: ci,
          content: bodyChunks[ci],
          tokenCount: Math.ceil(bodyChunks[ci].length / 4),
        },
      })
    }

    created++

    // Progress logging for large corpus
    if (created % batchSize === 0) {
      process.stdout.write(`  ${created + skipped}/${total} processed (${created} created, ${skipped} skipped)\r`)
    }
  }

  console.log(`\n✓ UKNow seed complete: ${created} created, ${skipped} already existed (${total} total)`)
}

main()
  .catch((e) => {
    console.error('❌ UKNow seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
