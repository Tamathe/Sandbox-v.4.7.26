import type { ScenarioTree } from './judgment-calls-service'

interface SeedScenario {
  title: string
  description: string
  category: 'ETHICS' | 'CITATION' | 'BOUNDARIES' | 'RESPONSIBLE_USE'
  disciplineFamily: 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'HEALTH_SCIENCES' | 'PROFESSIONAL' | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  scenarioTree: ScenarioTree
}

// Helper to build trees more concisely
function tree(startNodeId: string, nodes: ScenarioTree['nodes']): ScenarioTree {
  return { startNodeId, nodes }
}

// ---------- Scenario 1: The Group Project Shortcut ----------

const scenario1: SeedScenario = {
  title: 'The Group Project Shortcut',
  description: 'Your group project is due tomorrow and a teammate suggests using AI to write the entire analysis section. What do you do?',
  category: 'ETHICS',
  disciplineFamily: null,
  difficulty: 'BEGINNER',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'It\'s 11 PM and your group project is due at 8 AM. Your teammate Alex texts the group chat: "I found this AI tool that can write our entire analysis section in 5 minutes. Nobody will know — let\'s just use it and get some sleep."', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'The group is waiting for your response. What do you say?', choices: [
      { id: 'c1a', label: 'Agree to use AI for the whole section', description: 'It\'s late and the deadline is real — just go with it.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Suggest using AI as a brainstorming tool', description: 'Use AI to outline ideas, but write the analysis yourselves.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Push back and divide the work', description: 'Refuse AI help entirely and split remaining work among the group.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The AI generates a polished analysis quickly. Everyone submits and goes to sleep. A week later, the professor flags the section — the writing style is inconsistent with the rest of the paper, and two claims cite sources that don\'t exist.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'The professor asks the group to explain. What do you do?', choices: [
      { id: 'c2a1', label: 'Come clean about using AI', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Claim you wrote it but made mistakes', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'The professor appreciates your honesty. The group gets a chance to redo the section with a 15% penalty. It\'s a lesson learned — but trust is preserved.', nextNodeId: 'r1a', isTerminal: true, scores: { ethical: 45, judgment: 40 } },
    { id: 'con2a2', type: 'consequence', content: 'The professor investigates further and finds AI detection markers. The whole group receives a zero and an academic integrity referral. The cover-up made it worse.', nextNodeId: 'r1a', isTerminal: true, scores: { ethical: 15, judgment: 15 } },
    { id: 'con1b', type: 'consequence', content: 'Alex is skeptical but agrees. You use AI to generate an outline and key themes. Each person takes a theme and writes their portion in their own words, using the AI suggestions as a starting point.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'When citing the AI-assisted brainstorming in your methods section, you:', choices: [
      { id: 'c2b1', label: 'Mention AI was used for brainstorming', description: 'Add a note that AI tools assisted with initial outlining.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Don\'t mention AI at all', description: 'The writing is yours — the brainstorming doesn\'t need disclosure.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'The professor praises the transparency and gives full marks. She uses your approach as a positive example of responsible AI use in class.', nextNodeId: 'r1b', isTerminal: true, scores: { ethical: 95, judgment: 90 } },
    { id: 'con2b2', type: 'consequence', content: 'The paper is solid and gets a good grade. However, you feel uneasy — the course policy asks for AI disclosure, and you technically violated it.', nextNodeId: 'r1b', isTerminal: true, scores: { ethical: 60, judgment: 55 } },
    { id: 'con1c', type: 'consequence', content: 'The group stays up late but each person writes their portion. The analysis isn\'t as polished, but it\'s authentic. You submit at 7:45 AM, exhausted but honest.', nextNodeId: 'r1c', isTerminal: true, scores: { ethical: 85, judgment: 70 } },
    { id: 'r1a', type: 'reflection', content: 'Think about the pressure you felt in this scenario.', reflectionPrompt: 'When academic pressure is high, what strategies can help you make ethical decisions about AI use? How would you handle a similar situation differently?' },
    { id: 'r1b', type: 'reflection', content: 'Consider the balance between efficiency and integrity.', reflectionPrompt: 'Where is the line between using AI as a tool and using it as a shortcut? How does transparency change the ethical equation?' },
    { id: 'r1c', type: 'reflection', content: 'Consider the balance between efficiency and integrity.', reflectionPrompt: 'Was refusing AI entirely the best choice, or could there have been a responsible middle ground? What factors should guide that decision?' },
  ]),
}

// ---------- Scenario 2: The Midnight Essay ----------

const scenario2: SeedScenario = {
  title: 'The Midnight Essay',
  description: 'You have a personal essay due and you\'re stuck staring at a blank page. AI could get you unstuck — but the assignment says "your own voice."',
  category: 'BOUNDARIES',
  disciplineFamily: null,
  difficulty: 'BEGINNER',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You have a 3-page personal reflection essay due for your First Year Experience course. The prompt asks you to "describe a challenge that shaped who you are today, in your own authentic voice." It\'s midnight and you\'ve written one sentence.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'You open an AI chatbot. How do you use it?', choices: [
      { id: 'c1a', label: 'Ask AI to write the essay for you', description: '"Write a personal essay about overcoming a challenge..."', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Ask AI to help you brainstorm', description: '"Help me think of meaningful challenges I could write about"', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Close the chatbot and freewrite', description: 'Just start writing whatever comes to mind without AI.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The AI produces a well-written essay about "overcoming adversity." It\'s generic — about moving to a new city and making friends. It sounds nothing like you and describes an experience you never had.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'The essay is ready but it\'s not yours. You:', choices: [
      { id: 'c2a1', label: 'Submit it anyway', description: 'It\'s well-written and it\'s late.', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Use it as a template and rewrite with your real story', description: 'Keep the structure but replace everything with your actual experience.', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'The instructor reads it and notes it lacks personal depth. During a follow-up conference, she asks you about the "move" — and you can\'t discuss it convincingly. She suspects it\'s not your work.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 10, judgment: 15 } },
    { id: 'con2a2', type: 'consequence', content: 'Using the AI structure as scaffolding, you write about your real experience. The final essay is authentically yours with better organization. You note in a footnote that AI helped with structure.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 75 } },
    { id: 'con1b', type: 'consequence', content: 'The AI suggests several angles: "a time you failed publicly," "a family tradition that shaped your values," "a moment you stood up for someone." One prompt sparks a memory — your grandmother teaching you to cook after your parents\' divorce.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'Now that you have a topic, you:', choices: [
      { id: 'c2b1', label: 'Write the essay yourself from this starting point', description: 'Close the AI and write from your heart.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Ask AI to draft it, then personalize', description: 'Get a draft based on your topic, then edit heavily.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'You write until 2 AM. The essay is raw, imperfect, and completely yours. Your instructor writes "This moved me" in the margin. It becomes your favorite piece of writing that semester.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 90 } },
    { id: 'con2b2', type: 'consequence', content: 'The AI draft captures the facts but not the feeling. You spend an hour rewriting. The final version is okay — better than the AI draft but missing the raw emotion of a fully personal piece.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 55, judgment: 60 } },
    { id: 'con1c', type: 'consequence', content: 'You freewrite for 20 minutes. Most of it is messy, but halfway through, you hit something real — a memory about your first job and the manager who believed in you. You shape it into an essay by 3 AM.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'Personal voice is the core of this assignment.', reflectionPrompt: 'For assignments that ask for "your voice" or personal reflection, where should the line be for AI assistance? Can AI help you find your voice, or does it always replace it?' },
  ]),
}

// ---------- Scenario 3: The Uncited Summary ----------

const scenario3: SeedScenario = {
  title: 'The Uncited Summary',
  description: 'You used AI to summarize research articles for a literature review. Your classmate asks if you need to cite the AI. Do you?',
  category: 'CITATION',
  disciplineFamily: null,
  difficulty: 'BEGINNER',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'For your research methods class, you need to write a literature review summarizing 10 articles. You used an AI tool to generate summaries of each article to help you understand them faster. Now you\'re writing your review using those summaries as a foundation.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'How do you handle the AI-generated summaries in your citations?', choices: [
      { id: 'c1a', label: 'Cite only the original articles', description: 'The AI just helped you read faster — the sources are what matter.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Cite both the articles and the AI tool', description: 'Acknowledge that AI helped you process the sources.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Go back and read the original articles', description: 'Verify the AI summaries against the real papers before writing.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'Your literature review flows well, but you later realize that one of the AI summaries mischaracterized a study\'s findings. Your review now contains an inaccurate claim attributed to the original authors.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'You discover the error before the professor grades it. You:', choices: [
      { id: 'c2a1', label: 'Email the professor to correct it', description: 'Explain you found an error and ask to resubmit.', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Hope nobody notices', description: 'It\'s one small detail in a 10-article review.', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'The professor appreciates your diligence and allows a revision. She notes that this is exactly why verifying AI summaries matters. Your corrected review earns full credit.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 65 } },
    { id: 'con2a2', type: 'consequence', content: 'The professor catches the mischaracterization and marks it as a factual error. She asks if you read the original paper, and you have to admit you relied on AI summaries without verification.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 25, judgment: 20 } },
    { id: 'con1b', type: 'consequence', content: 'You add a methodology note: "AI summarization tools were used to assist in initial article processing. All summaries were verified against original sources." Your professor appreciates the transparency.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 80 } },
    { id: 'con1c', type: 'consequence', content: 'Reading the originals, you catch three inaccuracies in the AI summaries. One study\'s conclusion was completely reversed. Your final review is accurate, well-sourced, and you understand the material deeply.', nextNodeId: 'c2c' },
    { id: 'c2c', type: 'choice', content: 'In your final review, you:', choices: [
      { id: 'c2c1', label: 'Mention AI was used for initial processing', description: 'Transparency about your research process.', nextNodeId: 'con2c1' },
      { id: 'c2c2', label: 'Don\'t mention AI since you verified everything', description: 'The final work is yours — AI was just a reading aid.', nextNodeId: 'con2c2' },
    ] },
    { id: 'con2c1', type: 'consequence', content: 'Your professor highlights your approach as a model for the class: use AI to accelerate reading, verify everything, and disclose your process. Top marks.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 95 } },
    { id: 'con2c2', type: 'consequence', content: 'The review is excellent and accurate. But your course policy requires AI disclosure. You technically violated the policy, even though the intellectual work is yours.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 65, judgment: 70 } },
    { id: 'r1', type: 'reflection', content: 'Consider the role of verification in AI-assisted research.', reflectionPrompt: 'When AI helps you process information faster, what responsibility do you have to verify its output? At what point does using AI summaries without verification become academically dishonest?' },
  ]),
}

// ---------- Scenario 4: The Lab Report Fabrication ----------

const scenario4: SeedScenario = {
  title: 'The Lab Report Fabrication',
  description: 'Your lab partner\'s data got corrupted and they want to use AI to "recreate" plausible results. The report is worth 20% of your grade.',
  category: 'ETHICS',
  disciplineFamily: 'STEM',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re in an organic chemistry lab. Your partner Jamie accidentally deleted the raw spectroscopy data before you could both analyze it. The lab report is due in 48 hours and worth 20% of your grade. Jamie suggests: "Let\'s use AI to generate realistic-looking spectra data based on the expected results. It\'s just recreating what we would have gotten anyway."', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'Jamie is desperate. What do you do?', choices: [
      { id: 'c1a', label: 'Agree to fabricate the data', description: 'It\'s what you would have gotten — no harm done.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Contact the TA to explain and ask to redo the measurement', description: 'Admit the mistake and request lab time to recollect.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Write the report with the data gap acknowledged', description: 'Submit what you have and explain the data loss in your report.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The AI generates plausible spectra. But the data shows peaks that are slightly inconsistent with the actual compound. During the lab discussion, the professor notices your results don\'t match any other group\'s in a way that real experimental error would explain.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'The professor asks to see your raw data files.', choices: [
      { id: 'c2a1', label: 'Admit the data was AI-generated', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Say you lost the files in a computer crash', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'Data fabrication is one of the most serious offenses in science. Both you and Jamie face academic integrity proceedings. The professor is disappointed but notes your honesty in the late confession.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 20, judgment: 25 } },
    { id: 'con2a2', type: 'consequence', content: 'The professor can tell the data is synthetic. Lying about fabrication on top of the fabrication itself results in a course failure and formal disciplinary action for both of you.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 5, judgment: 5 } },
    { id: 'con1b', type: 'consequence', content: 'The TA is understanding — data loss happens. She schedules 30 minutes of lab time for you to redo the measurement. Your report is a day late but based on real data.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 95 } },
    { id: 'con1c', type: 'consequence', content: 'You write: "Due to data loss, we are unable to present full spectroscopy results. We present our methodology and theoretical analysis below." The professor gives partial credit and respects the transparency. Your grade takes a hit but your integrity is intact.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'Data integrity is foundational to science.', reflectionPrompt: 'In science, fabricating data — even "expected" data — is one of the most serious ethical violations. Why is this considered worse than other forms of academic dishonesty? How does this principle apply to AI-generated content in other fields?' },
  ]),
}

// ---------- Scenario 5: The Code Review ----------

const scenario5: SeedScenario = {
  title: 'The Code Review',
  description: 'You\'re stuck on a programming assignment. AI can solve it instantly — but the point of the assignment is learning to think algorithmically.',
  category: 'BOUNDARIES',
  disciplineFamily: 'STEM',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re working on a data structures assignment: implement a balanced binary search tree from scratch. You\'ve been stuck on the rotation logic for 3 hours. You know an AI could generate the solution in seconds. The syllabus says "AI tools may be used for debugging but not for generating solutions."', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'How do you proceed?', choices: [
      { id: 'c1a', label: 'Ask AI to write the rotation functions', description: 'Just get the solution and study it to learn.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Ask AI to explain the concept without code', description: '"Explain how AVL tree rotations work, step by step, without giving me code."', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Ask AI to find the bug in your attempt', description: 'Show your broken code and ask what\'s wrong.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The AI writes clean rotation code. You submit it. On the midterm, there\'s a tree rotation problem — and you can\'t solve it. You realize you never actually learned the concept, just copied a solution.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 20, judgment: 15 } },
    { id: 'con1b', type: 'consequence', content: 'The AI explains left and right rotations with diagrams in text. A lightbulb goes off — you were confusing which child to promote. You write the code yourself, and it works after two more tries.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'In your code comments, you:', choices: [
      { id: 'c2b1', label: 'Note that AI helped you understand the concept', description: 'Add a comment citing the AI explanation.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Don\'t mention AI — the code is yours', description: 'You wrote every line yourself.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'The TA appreciates the disclosure. Your code is correct and clearly shows your understanding. Full marks plus a note: "Good use of AI as a learning tool."', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 95 } },
    { id: 'con2b2', type: 'consequence', content: 'The code is correct and well-written. Technically, using AI for conceptual understanding falls within the policy. But the lack of disclosure feels like a gray area you\'re not entirely comfortable with.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 65 } },
    { id: 'con1c', type: 'consequence', content: 'The AI identifies your bug: you\'re updating the parent pointer before the rotation completes, causing a dangling reference. With this fix, your code works.', nextNodeId: 'c2c' },
    { id: 'c2c', type: 'choice', content: 'The bug fix was exactly what the policy allows (debugging). You:', choices: [
      { id: 'c2c1', label: 'Add a comment noting AI-assisted debugging', description: 'Transparency about your debugging process.', nextNodeId: 'con2c1' },
      { id: 'c2c2', label: 'Submit without mentioning AI', description: 'Debugging assistance is explicitly allowed.', nextNodeId: 'con2c2' },
    ] },
    { id: 'con2c1', type: 'consequence', content: 'The TA sees your comment and marks it as an excellent example of policy-compliant AI use. Full marks.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 90 } },
    { id: 'con2c2', type: 'consequence', content: 'Your code works and you used AI within policy bounds. Full marks. No issues — though you might have missed a chance to demonstrate good habits.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 80, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'Consider the purpose behind the assignment.', reflectionPrompt: 'When an assignment is designed to build a specific skill, how does using AI to skip the struggle affect your learning? Where is the line between "AI as tutor" and "AI as shortcut"?' },
  ]),
}

// ---------- Scenario 6: The Literature Analysis ----------

const scenario6: SeedScenario = {
  title: 'The Literature Analysis',
  description: 'You\'re analyzing a novel for English class. AI offers a compelling interpretation — but is it your interpretation, or a borrowed one?',
  category: 'CITATION',
  disciplineFamily: 'HUMANITIES',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re writing a literary analysis of Toni Morrison\'s "Beloved" for your American Literature class. You ask an AI to "discuss the symbolism of water in Beloved." The AI produces a nuanced analysis connecting water to rebirth, the Middle Passage, and Sethe\'s guilt. Several of these ideas hadn\'t occurred to you.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'The AI\'s analysis is genuinely insightful. How do you use it?', choices: [
      { id: 'c1a', label: 'Incorporate the AI\'s analysis as your own', description: 'Rewrite the ideas in your words without attribution.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Use it as a springboard for your own analysis', description: 'Take one AI idea and develop it in a direction the AI didn\'t go.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Cite the AI as a secondary source', description: 'Treat the AI interpretation like you would a published critic\'s argument.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'Your essay is well-argued but contains an interpretation about the Middle Passage that closely mirrors a published literary critic\'s work — because the AI was trained on it. Your professor recognizes the uncredited argument.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 20, judgment: 20 } },
    { id: 'con1b', type: 'consequence', content: 'The AI\'s mention of water and rebirth triggers your own idea: water in the novel is not just rebirth but also drowning — the characters are reborn but never fully free. You develop a 5-page argument that is entirely original.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'In your essay, you:', choices: [
      { id: 'c2b1', label: 'Acknowledge AI sparked the initial direction', description: 'A footnote noting your starting point.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Present the analysis as entirely independent', description: 'Your argument went far beyond anything the AI said.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'Your professor values the disclosure and is impressed by how you extended well beyond the AI\'s generic observation into original literary criticism. This is the kind of AI-augmented thinking she hopes to see.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 90 } },
    { id: 'con2b2', type: 'consequence', content: 'The analysis is strong and genuinely original. But in a humanities context where intellectual provenance matters, the omission of your AI-assisted starting point feels like an incomplete account of your research process.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 65, judgment: 70 } },
    { id: 'con1c', type: 'consequence', content: 'Your professor notes that while citing AI is technically acceptable, the real question in literary analysis is: "What do YOU think?" Using AI as a source is less valuable than developing your own reading. The essay gets average marks.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 75, judgment: 50 } },
    { id: 'r1', type: 'reflection', content: 'In humanities, original thought is the product.', reflectionPrompt: 'In literary analysis, the assignment is testing YOUR ability to interpret texts. How is borrowing an AI\'s interpretation different from or similar to borrowing a published critic\'s interpretation? What makes an idea "yours"?' },
  ]),
}

// ---------- Scenario 7: The Clinical Case Study ----------

const scenario7: SeedScenario = {
  title: 'The Clinical Case Study',
  description: 'You\'re a nursing student writing up a clinical case study. AI could help you write the care plan — but patient safety demands accuracy.',
  category: 'RESPONSIBLE_USE',
  disciplineFamily: 'HEALTH_SCIENCES',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re a second-year nursing student writing a clinical case study about a patient with Type 2 diabetes and hypertension. You need to develop a comprehensive care plan including medications, monitoring, and patient education. The AI gives you a detailed care plan — but you notice it recommends a medication combination that your pharmacology textbook warns about.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'The AI\'s care plan is detailed but contains a potentially dangerous drug interaction. What do you do?', choices: [
      { id: 'c1a', label: 'Submit the AI care plan with minor edits', description: 'It\'s mostly right and you\'re running short on time.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Use the AI plan as a starting template and verify every recommendation', description: 'Cross-reference each medication and intervention with your textbook and clinical guidelines.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Write the care plan from scratch using your clinical knowledge', description: 'Don\'t risk AI errors in a health sciences context.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'Your instructor catches the drug interaction error. She explains: "In clinical practice, this mistake could harm a patient. AI tools don\'t understand patient-specific contraindications." You fail the assignment and must retake it.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 15, judgment: 10 } },
    { id: 'con1b', type: 'consequence', content: 'Checking the AI plan against Davis\'s Drug Guide, you find the interaction error and two dosing recommendations that are outdated. You correct these and add current evidence-based interventions. Your final plan is thorough and accurate.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'In your submission, you:', choices: [
      { id: 'c2b1', label: 'Disclose AI was used as a starting point with full verification', description: 'Include a note about your verification process.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Submit without mentioning AI', description: 'Everything has been verified and corrected.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'Your instructor is impressed by your critical evaluation of the AI output and your systematic verification. She uses your approach as a teaching example: "This is what AI literacy looks like in healthcare."', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 95 } },
    { id: 'con2b2', type: 'consequence', content: 'The care plan is clinically accurate and well-cited. However, your program\'s policy requires AI disclosure for clinical work. Not disclosing is a policy violation even when the final work is correct.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 55, judgment: 65 } },
    { id: 'con1c', type: 'consequence', content: 'You spend 4 hours writing the care plan from your pharmacology notes and clinical guidelines. It\'s solid work and you deeply understand every recommendation. The process reinforced your clinical reasoning skills.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'Healthcare has uniquely high stakes for AI errors.', reflectionPrompt: 'In health sciences, AI errors can directly impact patient safety. How should the stakes of a field change your approach to AI assistance? What verification habits should become automatic for you?' },
  ]),
}

// ---------- Scenario 8: The Data Analysis Dilemma ----------

const scenario8: SeedScenario = {
  title: 'The Data Analysis Dilemma',
  description: 'Your survey results don\'t support your hypothesis. AI suggests a different statistical test that gives "better" results. Is this p-hacking or good analysis?',
  category: 'ETHICS',
  disciplineFamily: 'SOCIAL_SCIENCES',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re analyzing survey data for your research methods class. Your hypothesis was that social media use correlates with anxiety in college students. Your planned t-test shows p = 0.12 — not statistically significant. You ask an AI to "suggest statistical approaches for analyzing the relationship between social media and anxiety." The AI suggests running an ANCOVA controlling for sleep hours, which yields p = 0.03.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'The AI-suggested analysis gives you a significant result. What do you do?', choices: [
      { id: 'c1a', label: 'Use the ANCOVA result and report it as your primary analysis', description: 'The AI suggested a valid statistical technique.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Report both analyses transparently', description: 'Show the original t-test and the ANCOVA, explaining why you explored the covariate.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Stick with your pre-planned t-test', description: 'Report the non-significant result as planned.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'Your professor asks why you used ANCOVA instead of the t-test in your pre-registration. You explain the AI suggested it. She explains this is a form of p-hacking — running multiple tests until you find significance.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 25, judgment: 20 } },
    { id: 'con1b', type: 'consequence', content: 'Your professor commends the transparency. She explains that exploratory analysis is fine when clearly labeled. Your report becomes a class example of honest data analysis — showing both the null result and the exploratory finding.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 95 } },
    { id: 'con1c', type: 'consequence', content: 'Your non-significant result is perfectly valid science. Your professor appreciates that you didn\'t fish for significance. In your discussion section, you note the limitation and suggest future work could control for sleep.', nextNodeId: 'c2c' },
    { id: 'c2c', type: 'choice', content: 'In your future research directions section, you:', choices: [
      { id: 'c2c1', label: 'Mention that AI suggested the covariate approach', description: 'Note that AI-assisted analysis suggested a potential confound.', nextNodeId: 'con2c1' },
      { id: 'c2c2', label: 'Suggest the covariate without mentioning AI', description: 'Present it as your own insight for future research.', nextNodeId: 'con2c2' },
    ] },
    { id: 'con2c1', type: 'consequence', content: 'Your professor sees this as excellent methodology — using AI to generate hypotheses for future testing, not to mine current data. She suggests you actually run a follow-up study.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 90 } },
    { id: 'con2c2', type: 'consequence', content: 'The suggestion is sound and your report is honest. Not mentioning AI here is a minor omission since you\'re proposing future work, not claiming the insight was pre-planned.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 75, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'Statistical integrity is the backbone of social science.', reflectionPrompt: 'When AI suggests a different analytical approach that gives "better" results, how do you distinguish between legitimate exploratory analysis and p-hacking? What safeguards should you put in place when using AI for data analysis?' },
  ]),
}

// ---------- Scenario 9: The Design Brief ----------

const scenario9: SeedScenario = {
  title: 'The Design Brief',
  description: 'You\'re creating a logo for a design class. AI can generate stunning options — but the assignment assesses YOUR creative process.',
  category: 'BOUNDARIES',
  disciplineFamily: 'ARTS',
  difficulty: 'INTERMEDIATE',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'Your graphic design professor assigns a logo design project for a fictional sustainable coffee brand. The rubric explicitly grades creative process (sketches, iterations, rationale) equally with the final design. You know AI image generators can produce professional-quality logos in seconds.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'How do you approach the project?', choices: [
      { id: 'c1a', label: 'Generate AI logos and trace/refine the best one', description: 'Use AI for the concept and polish it yourself.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Use AI for mood boarding and inspiration only', description: 'Generate visual references but sketch and design everything yourself.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Skip AI entirely and work from hand sketches', description: 'Pure creative process from blank page to final design.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'Your final logo looks professional but your "process documentation" is thin — you have to reverse-engineer sketches to make it look organic. During the critique, a classmate notices your style is inconsistent with your previous work.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'The professor asks about your process. You:', choices: [
      { id: 'c2a1', label: 'Admit you started with AI generation', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Claim it was all hand-designed', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'The professor explains the assignment was designed to build your visual thinking skills — AI bypassed the learning. You get credit for honesty but need to redo the project from scratch.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 40, judgment: 30 } },
    { id: 'con2a2', type: 'consequence', content: 'The professor can see the AI aesthetic and the manufactured process docs. Attempting to deceive in a creative discipline damages your reputation in a small department where trust matters.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 10, judgment: 10 } },
    { id: 'con1b', type: 'consequence', content: 'You use AI to generate mood boards: "sustainable coffee brand aesthetics, earth tones, minimal." The visual references inspire a direction you wouldn\'t have found on Pinterest alone. Your sketches evolve from these inspirations into something distinctly yours.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 90 } },
    { id: 'con1c', type: 'consequence', content: 'Your design process is documented authentically from thumbnail sketches to final vector art. The result is less polished than AI-generated options but shows clear creative growth. Your professor gives high marks for process and originality.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 80 } },
    { id: 'r1', type: 'reflection', content: 'In creative fields, the process IS the product.', reflectionPrompt: 'When an assignment grades your creative process, how does AI-generated starting points change the nature of the work? Is there a meaningful difference between AI-generated inspiration and looking at other designers\' work for inspiration?' },
  ]),
}

// ---------- Scenario 10: The Whistleblower ----------

const scenario10: SeedScenario = {
  title: 'The Whistleblower',
  description: 'You discover a classmate is selling AI-generated assignments. Reporting feels right but could ruin their scholarship. What do you do?',
  category: 'ETHICS',
  disciplineFamily: null,
  difficulty: 'ADVANCED',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You discover that Marcus, a classmate and friend, has been selling AI-generated essays and problem sets to other students through a private Discord server. He charges $50 per assignment and has at least 15 regular customers. Marcus is on a need-based scholarship — if reported, he could lose it and drop out. But his service is undermining the integrity of degrees everyone is earning.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'This is a complex situation with no easy answer. What do you do first?', choices: [
      { id: 'c1a', label: 'Report it to the academic integrity office', description: 'The rules are clear and the scale is large.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Talk to Marcus privately first', description: 'Give him a chance to stop before you escalate.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Stay out of it — it\'s not your problem', description: 'You didn\'t participate and it\'s not your responsibility.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The integrity office investigates. Marcus and 8 buyers face proceedings. Marcus loses his scholarship. Some students who bought essays were also first-generation students struggling with the workload. The situation is messier than you expected.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'You learn about the consequences and feel conflicted. You:', choices: [
      { id: 'c2a1', label: 'Advocate for restorative justice approaches', description: 'Push for educational consequences rather than punitive ones.', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Accept that consequences are consequences', description: 'They made their choices; the system is working as intended.', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'You speak to the Dean of Students about alternative approaches. The university creates an AI literacy workshop as part of the resolution process. Marcus completes it and keeps his scholarship on probation. The experience leads to a campus-wide conversation about AI and equity.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 90 } },
    { id: 'con2a2', type: 'consequence', content: 'The standard process plays out. Marcus loses his scholarship. Two other students are suspended. The issue is resolved by the rules, but you wonder if there was a better way to handle the systemic problem that led to this.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 60 } },
    { id: 'con1b', type: 'consequence', content: 'You confront Marcus. He says: "I know it\'s wrong, but I need the money and these students need the help. The university isn\'t giving us the support we need." He asks for time to wind it down.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'Marcus promises to stop. You:', choices: [
      { id: 'c2b1', label: 'Give him two weeks, then check in', description: 'Trust but verify.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Tell him if he doesn\'t stop, you\'ll report it', description: 'Set a clear boundary with consequences.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'Two weeks later, the Discord is still active. Marcus didn\'t stop. Now you face the same dilemma but with the added weight of having waited. You report it, and the delay makes your own position more complicated.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 55, judgment: 45 } },
    { id: 'con2b2', type: 'consequence', content: 'Marcus shuts down the server within a week. He\'s angry but the operation stops. The students who were buying still haven\'t learned to do their own work, and the underlying problem — students needing support — remains unaddressed.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 70 } },
    { id: 'con1c', type: 'consequence', content: 'Six months later, the operation is discovered anyway. 30 students are affected. During the investigation, Discord logs show you knew. You\'re called in for questioning about your awareness and inaction.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 30, judgment: 25 } },
    { id: 'r1', type: 'reflection', content: 'Ethical decisions often involve competing values.', reflectionPrompt: 'This scenario involves competing values: integrity, loyalty, empathy, and systemic fairness. When there\'s no "clean" answer, what framework do you use to decide? How do systemic issues (like inequitable support) change the ethical calculus?' },
  ]),
}

// ---------- Scenario 11: The Thesis Advisor ----------

const scenario11: SeedScenario = {
  title: 'The Thesis Advisor',
  description: 'Your thesis advisor is unavailable and your defense is in two weeks. AI offers to review your draft and suggest improvements. How far do you go?',
  category: 'RESPONSIBLE_USE',
  disciplineFamily: null,
  difficulty: 'ADVANCED',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'Your thesis defense is in two weeks. Your advisor, Dr. Park, had a family emergency and is unreachable. Your 80-page thesis draft needs revision — literature review gaps, methodology questions, and writing polish. A fellow grad student suggests: "Just use AI to review it. It can catch everything Dr. Park would."', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'How do you use AI assistance for your thesis?', choices: [
      { id: 'c1a', label: 'Have AI do a comprehensive review and implement all suggestions', description: 'Let AI be your temporary advisor — review, edit, restructure.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Use AI for specific, bounded tasks', description: 'Proofreading, citation format checking, and identifying potential gaps — but make all revision decisions yourself.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Ask the department for a temporary advisor', description: 'Don\'t rely on AI for something this important.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The AI suggests restructuring your argument, adding literature you haven\'t read, and changing your theoretical framework. You implement everything. At the defense, a committee member asks about a source the AI suggested — you can\'t discuss it because you never actually read it.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 25, judgment: 15 } },
    { id: 'con1b', type: 'consequence', content: 'AI catches 12 citation formatting errors, identifies two spots where your argument jumps without transitions, and flags a section where your methodology description is unclear. You fix each issue using your own judgment about HOW to fix them.', nextNodeId: 'c2b' },
    { id: 'c2b', type: 'choice', content: 'In your thesis acknowledgments, you:', choices: [
      { id: 'c2b1', label: 'Note AI tools assisted with proofreading and formatting', description: 'Standard disclosure for editorial assistance.', nextNodeId: 'con2b1' },
      { id: 'c2b2', label: 'Don\'t mention AI — it was just a proofreading tool', description: 'No different from using Grammarly.', nextNodeId: 'con2b2' },
    ] },
    { id: 'con2b1', type: 'consequence', content: 'Your committee appreciates the transparency. They note that using AI for bounded editorial tasks while maintaining intellectual ownership is a mature approach to AI use in academic research. Strong defense.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 95 } },
    { id: 'con2b2', type: 'consequence', content: 'Your defense goes well. The AI assistance was genuinely limited to what a copyeditor would do. Most programs don\'t require disclosure for proofreading tools, so this is defensible — but norms are shifting.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 70, judgment: 75 } },
    { id: 'con1c', type: 'consequence', content: 'The department chair assigns Dr. Kim as a temporary reader. She catches two significant methodology issues the AI might have missed because they require domain expertise. Your defense is postponed one week but much stronger.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 85, judgment: 85 } },
    { id: 'r1', type: 'reflection', content: 'AI assistance exists on a spectrum.', reflectionPrompt: 'Where is the line between AI as an editorial tool (proofreading, formatting) and AI as an intellectual collaborator (restructuring arguments, suggesting sources)? For a thesis specifically, why does this distinction matter more than for a class paper?' },
  ]),
}

// ---------- Scenario 12: The Job Application ----------

const scenario12: SeedScenario = {
  title: 'The Job Application',
  description: 'You\'re applying for a competitive internship. AI can write a perfect cover letter — but the employer explicitly asks for your authentic voice.',
  category: 'BOUNDARIES',
  disciplineFamily: 'PROFESSIONAL',
  difficulty: 'ADVANCED',
  scenarioTree: tree('s1', [
    { id: 's1', type: 'situation', content: 'You\'re applying for a summer internship at a top firm. The application states: "Write a cover letter in your own voice explaining why you\'re passionate about this field. We value authenticity — we\'re hiring a person, not a portfolio." You have 12 applications to submit this week and this one matters most.', nextNodeId: 'c1' },
    { id: 'c1', type: 'choice', content: 'How do you approach the cover letter?', choices: [
      { id: 'c1a', label: 'Have AI write it and make minor personal edits', description: 'AI writes better cover letters than you do — just personalize a few details.', nextNodeId: 'con1a' },
      { id: 'c1b', label: 'Write it yourself, use AI to polish grammar and flow', description: 'Your ideas and voice, AI for the final editing pass.', nextNodeId: 'con1b' },
      { id: 'c1c', label: 'Use AI to help organize your thoughts, then write from scratch', description: 'Brainstorm with AI but write every word yourself.', nextNodeId: 'con1c' },
    ] },
    { id: 'con1a', type: 'consequence', content: 'The cover letter is polished and professional. It opens with "I am writing to express my keen interest in..." — the same opening 200 other AI-assisted applicants used. The hiring manager, who reads 500 applications, puts yours in the generic pile.', nextNodeId: 'c2a' },
    { id: 'c2a', type: 'choice', content: 'You don\'t hear back. For your next application, you:', choices: [
      { id: 'c2a1', label: 'Write authentically, even if less polished', description: 'Let your personality show through.', nextNodeId: 'con2a1' },
      { id: 'c2a2', label: 'Use AI again but with better prompting', description: 'The problem was the prompt, not the approach.', nextNodeId: 'con2a2' },
    ] },
    { id: 'con2a1', type: 'consequence', content: 'Your next cover letter is messier but memorable. You write about a specific moment that made you fall in love with the field. The hiring manager calls you for an interview the next day — "Your letter stood out."', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 75, judgment: 80 } },
    { id: 'con2a2', type: 'consequence', content: 'Better prompting produces a better letter, but it still reads like AI. Hiring managers are increasingly able to spot AI-generated content. You continue to struggle to get interviews, missing the core issue: authenticity can\'t be prompted.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 40, judgment: 30 } },
    { id: 'con1b', type: 'consequence', content: 'Your letter has genuine personality — the story about building a weather station in high school is uniquely yours. AI smooths a few awkward sentences and catches a typo. The final product is authentically you, well-presented.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 90, judgment: 90 } },
    { id: 'con1c', type: 'consequence', content: 'Brainstorming with AI helps you realize your strongest story isn\'t the one you first thought of. The AI asks: "What specific moment made you choose this path?" and your answer becomes the opening paragraph. Every word is yours, but AI helped you find the right thread.', nextNodeId: 'r1', isTerminal: true, scores: { ethical: 95, judgment: 95 } },
    { id: 'r1', type: 'reflection', content: 'Authenticity is a professional skill.', reflectionPrompt: 'When someone explicitly asks for your authentic voice, what does it mean to use AI assistance? Is there a difference between AI helping you find your voice vs. AI replacing your voice? How does this apply beyond cover letters — to interviews, presentations, and professional relationships?' },
  ]),
}

// ---------- Export all scenarios ----------

export const JUDGMENT_CALL_SCENARIOS: SeedScenario[] = [
  scenario1, scenario2, scenario3, scenario4, scenario5, scenario6,
  scenario7, scenario8, scenario9, scenario10, scenario11, scenario12,
]
