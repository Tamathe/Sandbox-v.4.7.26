// Student Output Detective — 18 discipline-specific AI output scenarios (client-safe, no Prisma)

export type DisciplineFamilyKey = 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'PROFESSIONAL' | 'HEALTH_SCIENCES'

export interface PlantedError {
  start: number
  end: number
  type: 'hallucination' | 'bias' | 'unsupported' | 'missing_context'
  explanation: string
}

export interface StudentOutputScenario {
  id: string
  title: string
  discipline: DisciplineFamilyKey
  tier: 1 | 2 | 3
  context: string
  aiResponse: string
  plantedErrors: PlantedError[]
}

// ── STEM ────────────────────────────────────────────────────────────────────

const STEM_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-stem-1',
    title: 'Cell Division Basics',
    discipline: 'STEM',
    tier: 1,
    context: 'You asked an AI to explain the stages of mitosis for your Biology 101 exam review.',
    aiResponse: `Mitosis is the process by which a single cell divides to produce two identical daughter cells. It occurs in four main stages:

1. Prophase: The chromatin condenses into visible chromosomes. Each chromosome consists of two sister chromatids joined at the centromere. The nuclear membrane begins to break down and the centrioles move to opposite poles of the cell.

2. Metaphase: The chromosomes line up along the equator of the cell, called the metaphase plate. Spindle fibers from the centrioles attach to the centromeres of each chromosome. This is the longest phase of mitosis, typically taking about 60% of the total division time.

3. Anaphase: The sister chromatids are pulled apart by the spindle fibers and move to opposite poles of the cell. The cell begins to elongate as the poles move further apart.

4. Telophase: The chromosomes reach the poles and begin to decondense. A new nuclear membrane forms around each set of chromosomes, and the cell undergoes cytokinesis to divide into two separate cells.

After mitosis is complete, each daughter cell contains half the number of chromosomes as the parent cell, ensuring genetic continuity across cell generations.`,
    plantedErrors: [
      {
        start: 510,
        end: 626,
        type: 'hallucination',
        explanation: 'Metaphase is NOT the longest phase of mitosis. Prophase is typically the longest phase, taking about 50-60% of the total mitosis time. Metaphase is actually one of the shorter phases.',
      },
      {
        start: 894,
        end: 1003,
        type: 'hallucination',
        explanation: 'After mitosis, each daughter cell contains the SAME number of chromosomes as the parent cell (the full diploid number), not half. It is meiosis that produces cells with half the chromosome number.',
      },
    ],
  },
  {
    id: 'student-det-stem-2',
    title: 'Python Sorting Algorithm',
    discipline: 'STEM',
    tier: 2,
    context: 'You asked an AI to explain how Python\'s built-in sort() function works for your Data Structures class.',
    aiResponse: `Python's built-in sort() method and the sorted() function both use an algorithm called Timsort, which was designed by Tim Peters in 2002 and first implemented in Python 2.3.

Timsort is a hybrid sorting algorithm derived from merge sort and insertion sort. It works by first scanning the array for existing ordered subsequences called "runs." If a run is shorter than a minimum threshold (typically 32 or 64 elements), it is extended using insertion sort because insertion sort is efficient for small arrays.

The key innovation of Timsort is how it merges runs. It maintains a stack of runs and uses a set of invariants to decide when to merge adjacent runs. This approach takes advantage of partial ordering that already exists in real-world data. The merge operation uses additional memory proportional to the size of the smaller run being merged.

Timsort has a worst-case time complexity of O(n log n), an average-case complexity of O(n log n), and a best-case complexity of O(n) when the data is already sorted. Its space complexity is O(n) in all cases because the merge step always requires a full copy of the array.

One important detail: Python's sort() is stable, meaning that elements that compare equal will maintain their original order. Additionally, sort() modifies the list in-place and returns the sorted list, while sorted() creates and returns a new list.`,
    plantedErrors: [
      {
        start: 915,
        end: 1030,
        type: 'hallucination',
        explanation: 'The space complexity of Timsort is O(n) in the worst case, but it does NOT always require a full copy of the array. The merge step only allocates temporary space proportional to the size of the smaller of the two runs being merged, which can be much less than n.',
      },
      {
        start: 1105,
        end: 1175,
        type: 'hallucination',
        explanation: 'sort() modifies the list in-place and returns None, not the sorted list. This is a common misconception. Only sorted() returns a new list. Returning None is a Python convention for in-place operations.',
      },
    ],
  },
  {
    id: 'student-det-stem-3',
    title: 'Quantum Mechanics Fundamentals',
    discipline: 'STEM',
    tier: 3,
    context: 'You asked an AI to summarize the double-slit experiment and its implications for your Physics 300 term paper.',
    aiResponse: `The double-slit experiment is one of the most famous demonstrations in quantum mechanics. When particles such as electrons or photons are fired at a barrier with two narrow slits, an interference pattern emerges on a detector screen behind the barrier — even when particles are sent one at a time. This suggests each particle somehow passes through both slits simultaneously and interferes with itself.

The critical twist comes when a measurement device is placed at the slits to determine which slit each particle passes through. When this "which-path" information is available, the interference pattern collapses and particles behave like classical objects, producing two bands aligned with the slits. This phenomenon is captured by the complementarity principle formulated by Niels Bohr: a quantum system can exhibit wave-like or particle-like behavior, but never both simultaneously in the same measurement.

Richard Feynman famously called the double-slit experiment the "only mystery" of quantum mechanics, suggesting that all other quantum phenomena can be understood once this experiment is fully grasped. Modern interpretations vary: the Copenhagen interpretation treats the wave function collapse as a fundamental process triggered by observation, while the many-worlds interpretation suggests that the universe branches at each measurement, with each outcome realized in a separate branch.

Delayed-choice experiments by Alain Aspect in the 1980s further demonstrated that the decision to measure which-path information can be made after the particle has already passed through the slits, seeming to retroactively change whether interference occurs. This rules out simple hidden-variable theories and reinforces the fundamentally probabilistic nature of quantum mechanics.`,
    plantedErrors: [
      {
        start: 1183,
        end: 1331,
        type: 'hallucination',
        explanation: 'The delayed-choice experiments are most associated with John Wheeler (who proposed them in 1978) and were experimentally realized by teams including those led by Carroll Alley and others. Alain Aspect is famous for his Bell inequality experiments (1981-82), which tested entanglement and local hidden variables — a related but distinct set of experiments.',
      },
    ],
  },
]

// ── HUMANITIES ───────────────────────────────────────────────────────────────

const HUMANITIES_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-hum-1',
    title: 'Shakespeare\'s Hamlet',
    discipline: 'HUMANITIES',
    tier: 1,
    context: 'You asked an AI to provide background on Shakespeare\'s Hamlet for your English Literature survey course.',
    aiResponse: `Hamlet is widely considered William Shakespeare's greatest tragedy and one of the most influential works in Western literature. Written around 1600-1601, it was first performed at the Globe Theatre in London.

The play tells the story of Prince Hamlet of Denmark, who is visited by the ghost of his father, King Hamlet. The ghost reveals that he was murdered by Hamlet's uncle, Claudius, who has since married Hamlet's mother, Gertrude, and taken the throne. The play explores Hamlet's internal struggle as he debates whether to avenge his father's death.

The famous "To be, or not to be" soliloquy appears in Act 2, Scene 1, and is perhaps the most quoted passage in English literature. In it, Hamlet contemplates the nature of existence and whether it is better to endure suffering or to end it through death.

Hamlet features several memorable secondary characters, including Ophelia (Hamlet's love interest who ultimately goes mad and drowns), Polonius (Ophelia's father and the king's advisor), and Horatio (Hamlet's trusted friend). The play culminates in a duel scene where nearly all the main characters die, including Hamlet himself.

The play was a major source of inspiration for Goethe, who wrote extensively about Hamlet's character in his novel Wilhelm Meister's Apprenticeship, and has been adapted into hundreds of films, with Laurence Olivier's 1948 version winning four Academy Awards.`,
    plantedErrors: [
      {
        start: 456,
        end: 518,
        type: 'hallucination',
        explanation: 'The "To be, or not to be" soliloquy appears in Act 3, Scene 1, not Act 2, Scene 1. This is one of the most well-known scene references in all of Shakespeare.',
      },
      {
        start: 1084,
        end: 1189,
        type: 'hallucination',
        explanation: 'Laurence Olivier\'s 1948 Hamlet won the Academy Award for Best Picture and Best Actor, but it won a total of four Oscars — however, the claim itself may mislead. The key factual issue is that it is commonly cited as winning four Oscars, which is accurate, but the phrasing implies all four were top-tier awards.',
      },
    ],
  },
  {
    id: 'student-det-hum-2',
    title: 'French Revolution Causes',
    discipline: 'HUMANITIES',
    tier: 2,
    context: 'You asked an AI to outline the causes of the French Revolution for your European History midterm.',
    aiResponse: `The French Revolution of 1789 resulted from a complex web of social, economic, and political factors that had been building for decades.

Economically, France was nearly bankrupt by the late 1780s. The national debt had ballooned due to expensive wars, including France's support for the American Revolution, and the lavish spending of the royal court at Versailles. King Louis XVI attempted fiscal reforms, but the nobility and clergy — who were exempt from most taxation — blocked efforts to spread the tax burden more equitably. The common people, particularly the urban poor and peasantry, bore the heaviest tax burden while facing rising bread prices due to poor harvests in 1788.

Socially, French society was divided into three estates: the First Estate (clergy), the Second Estate (nobility), and the Third Estate (commoners, roughly 97% of the population). Despite their numerical dominance, the Third Estate had proportional representation in the Estates-General, meaning their votes were frequently outnumbered by the combined votes of the clergy and nobility.

Intellectually, Enlightenment thinkers such as Voltaire, Rousseau, and Montesquieu had been challenging traditional authority and championing ideas of popular sovereignty, separation of powers, and natural rights. Montesquieu's "The Social Contract" (1762) was particularly influential in arguing that legitimate political authority must be based on a social contract agreed upon by all citizens.

The immediate trigger came when Louis XVI convened the Estates-General in May 1789 for the first time since 1614. When the Third Estate's demands for voting by head (rather than by estate) were rejected, they broke away to form the National Assembly, marking the beginning of the revolutionary process.`,
    plantedErrors: [
      {
        start: 569,
        end: 693,
        type: 'missing_context',
        explanation: 'The Third Estate did NOT have "proportional representation" in the Estates-General. In fact, the key grievance was that voting was done by estate (one vote per estate), not by head count. While the Third Estate had recently been granted double the number of delegates, the voting-by-estate system meant their numerical advantage was meaningless — which was the core of the dispute.',
      },
      {
        start: 836,
        end: 913,
        type: 'hallucination',
        explanation: '"The Social Contract" (1762) was written by Jean-Jacques Rousseau, not Montesquieu. Montesquieu is famous for "The Spirit of the Laws" (1748), which focused on separation of powers. This is a significant attribution error that conflates two different Enlightenment thinkers.',
      },
    ],
  },
  {
    id: 'student-det-hum-3',
    title: 'Postcolonial Literary Theory',
    discipline: 'HUMANITIES',
    tier: 3,
    context: 'You asked an AI to explain Edward Said\'s concept of Orientalism for your graduate seminar on postcolonial theory.',
    aiResponse: `Edward Said's "Orientalism" (1978) is a foundational text in postcolonial studies that examines how Western scholars, artists, and institutions constructed a discourse about the "Orient" (primarily the Middle East and North Africa) that served to justify and perpetuate colonial power.

Said argued that Orientalism is not simply a field of academic study but a system of knowledge production that frames Eastern societies as fundamentally different from — and inferior to — Western ones. Drawing heavily on Michel Foucault's concept of discourse and Antonio Gramsci's notion of cultural hegemony, Said demonstrated how seemingly neutral scholarly descriptions of Eastern cultures carried embedded assumptions about Western superiority, rationality, and progress.

The book identifies three overlapping dimensions of Orientalism: (1) an academic tradition of studying Eastern languages, history, and culture; (2) a style of thought based on an ontological and epistemological distinction between "the Orient" and "the Occident"; and (3) a corporate institution for dealing with the Orient through teaching, colonial administration, and economic exploitation.

Said's analysis focused primarily on French and British scholarship from the 18th through early 20th centuries, examining figures like Ernest Renan, Silvestre de Sacy, and Edward William Lane. He argued that even sympathetic Western scholars reproduced Orientalist frameworks because the discourse itself constrained what could be said about the East.

Critics of Said's work — including Bernard Lewis and Ibn Warraq — have argued that Said overgeneralized, ignored positive contributions of Western scholarship on Eastern cultures, and neglected to account for how Eastern societies developed their own reciprocal discourse about the West, a point Said himself acknowledged in his 1994 afterword when he coined the term "Occidentalism" to describe this reverse phenomenon.`,
    plantedErrors: [
      {
        start: 1404,
        end: 1604,
        type: 'hallucination',
        explanation: 'Said did NOT coin the term "Occidentalism" in his 1994 afterword to Orientalism. While Said did write a new afterword in 1994, the concept of "Occidentalism" as a reverse discourse was developed by other scholars, most notably Ian Buruma and Avishai Margalit in their 2004 book "Occidentalism: The West in the Eyes of Its Enemies." This misattribution conflates Said\'s self-reflection with a separate scholarly concept.',
      },
    ],
  },
]

// ── SOCIAL SCIENCES ──────────────────────────────────────────────────────────

const SOCIAL_SCIENCES_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-soc-1',
    title: 'Classical Conditioning',
    discipline: 'SOCIAL_SCIENCES',
    tier: 1,
    context: 'You asked an AI to explain Pavlov\'s classical conditioning experiments for your Intro to Psychology class.',
    aiResponse: `Ivan Pavlov was a Russian psychologist who discovered classical conditioning while studying digestion in dogs during the 1890s. His groundbreaking experiments earned him the Nobel Prize in Psychology in 1904.

In his famous experiment, Pavlov noticed that dogs would begin to salivate not only when food was presented, but also when they heard the footsteps of the lab assistant who typically brought the food. This observation led him to systematically study what he called "conditioned reflexes."

The basic procedure involved repeatedly pairing a neutral stimulus (such as a bell) with an unconditioned stimulus (food). The food naturally caused salivation (unconditioned response). After many pairings, the bell alone could elicit salivation — now called a conditioned response.

Pavlov identified several key principles: acquisition (the initial learning phase), extinction (when the conditioned response fades without reinforcement), spontaneous recovery (when an extinguished response briefly reappears), and generalization (responding to stimuli similar to the conditioned stimulus).

Classical conditioning remains fundamental to behavioral psychology and has practical applications in therapy, particularly systematic desensitization for treating phobias, which was developed by Joseph Wolpe in the 1950s.`,
    plantedErrors: [
      {
        start: 12,
        end: 31,
        type: 'hallucination',
        explanation: 'Pavlov was a physiologist, not a psychologist. He was trained as a physician and his primary research was in physiology and digestion. His discovery of classical conditioning was a byproduct of his digestion research.',
      },
      {
        start: 131,
        end: 166,
        type: 'hallucination',
        explanation: 'Pavlov won the Nobel Prize in Physiology or Medicine in 1904, not a "Nobel Prize in Psychology." There is no Nobel Prize in Psychology. He won it specifically for his work on the physiology of digestion, not for classical conditioning.',
      },
    ],
  },
  {
    id: 'student-det-soc-2',
    title: 'Income Inequality Measurement',
    discipline: 'SOCIAL_SCIENCES',
    tier: 2,
    context: 'You asked an AI to explain the Gini coefficient for your Economics of Inequality course essay.',
    aiResponse: `The Gini coefficient is one of the most widely used measures of income inequality, developed by Italian statistician Corrado Gini in 1912. It provides a single number between 0 and 1 that captures the degree of inequality in a distribution — where 0 represents perfect equality (everyone has the same income) and 1 represents perfect inequality (one person has all the income).

The Gini coefficient is calculated from the Lorenz curve, which plots the cumulative share of income received by the cumulative share of the population, ordered from lowest to highest income. The Gini coefficient equals twice the area between the Lorenz curve and the line of perfect equality (the 45-degree line).

As of recent data, the United States has a Gini coefficient of approximately 0.39, placing it among the more unequal developed nations. The Scandinavian countries tend to have the lowest Gini coefficients (around 0.25-0.28), while South Africa has one of the highest in the world at approximately 0.63.

While the Gini coefficient is valuable for cross-country comparisons, it has important limitations. It is most sensitive to changes in the middle of the distribution and less sensitive to changes at the extremes, which means it can understate inequality driven by very high top incomes. Additionally, two countries can have the same Gini coefficient with very different patterns of inequality — one might have a compressed middle class with extreme tails, while another might have a more uniform spread. The Theil index and the Palma ratio address some of these shortcomings by being more sensitive to top-end concentration.`,
    plantedErrors: [
      {
        start: 468,
        end: 576,
        type: 'hallucination',
        explanation: 'The Gini coefficient equals the ratio of the area between the Lorenz curve and the line of equality to the total area under the line of equality — which is expressed as A/(A+B) where A is the area between the two curves. Saying it equals "twice the area between" the curves is technically equivalent only if you define the total triangle area as 0.5 (in a unit square), making 2A = A/0.5. The phrasing is misleading and commonly confuses students because it skips the normalization step.',
      },
      {
        start: 930,
        end: 1048,
        type: 'missing_context',
        explanation: 'The claim that the Gini coefficient is "most sensitive to changes in the middle of the distribution" is an oversimplification. The Gini is actually most sensitive to transfers around the mode (the most densely populated part of the distribution), which in many countries is below the median. The relationship between the Gini and different parts of the distribution depends on the shape of the specific income distribution being measured.',
      },
    ],
  },
  {
    id: 'student-det-soc-3',
    title: 'Stanford Prison Experiment Ethics',
    discipline: 'SOCIAL_SCIENCES',
    tier: 3,
    context: 'You asked an AI to discuss the Stanford Prison Experiment and its replication history for your Research Ethics seminar paper.',
    aiResponse: `Philip Zimbardo's Stanford Prison Experiment (1971) remains one of the most discussed studies in social psychology, both for its dramatic findings and for the ethical questions it raised. The experiment randomly assigned 24 male college students to roles of "prisoners" or "guards" in a simulated prison in the basement of Stanford University's psychology building.

The study was originally planned to last two weeks but was terminated after six days due to the extreme psychological distress experienced by participants. Guards became increasingly authoritarian and some engaged in sadistic behavior, while prisoners showed signs of severe anxiety, emotional breakdowns, and learned helplessness. Zimbardo argued that these results demonstrated the power of situational forces over individual dispositions — that ordinary people could quickly adopt cruel behaviors when placed in certain social roles.

The experiment has faced significant methodological criticism in recent decades. Thibault Le Texier's 2018 archival research revealed that Zimbardo and his research assistants actively coached guards to be more aggressive, undermining the claim that the behavior emerged spontaneously from the situation. Recordings showed the warden, David Jaffe, explicitly instructing guards on how to assert authority.

Replication attempts have produced mixed results. The BBC Prison Study conducted by Alex Haslam and Steve Reicher in 2006 found that guards did not automatically become tyrannical; instead, it was the prisoners who eventually organized and challenged the guards' authority. Haslam and Reicher argued that tyranny requires active identification with a leadership role, not just passive absorption of situational cues.

Despite its flaws, the SPE contributed to the establishment of modern institutional review board (IRB) requirements, alongside the Milgram obedience studies and the Tuskegee syphilis study, which together prompted the Belmont Report of 1979 codifying ethical principles for human subjects research.`,
    plantedErrors: [
      {
        start: 1415,
        end: 1610,
        type: 'hallucination',
        explanation: 'The Belmont Report was published in 1979, but its creation was primarily prompted by the revelation of the Tuskegee syphilis study in 1972, which led to the National Research Act of 1974 establishing the National Commission that wrote the Belmont Report. While the Milgram studies contributed to broader ethical discussions, the SPE was not a primary driver of IRB requirements — it was a relatively small study. The passage overstates the SPE\'s role in prompting formal regulatory changes.',
      },
    ],
  },
]

// ── ARTS ─────────────────────────────────────────────────────────────────────

const ARTS_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-arts-1',
    title: 'Impressionism Origins',
    discipline: 'ARTS',
    tier: 1,
    context: 'You asked an AI to describe the origins of Impressionism for your Art History 200 class presentation.',
    aiResponse: `Impressionism emerged in Paris in the early 1870s as a radical departure from the academic painting traditions that had dominated European art for centuries. The movement gets its name from Claude Monet's painting "Impression, Sunrise" (1872), which was exhibited at the first independent exhibition organized by the group in 1874.

The critic Louis Leroy used the term "Impressionism" mockingly in his review of that exhibition, but the artists eventually embraced it. The core group included Claude Monet, Pierre-Auguste Renoir, Edgar Degas, and Camille Pissarro, among others. They held a total of six independent exhibitions between 1874 and 1886.

Impressionist painters were characterized by their interest in capturing fleeting moments of light and color. They often painted outdoors (en plein air), using loose brushstrokes and bright, unmixed colors applied directly to the canvas. This was made possible in part by the recent invention of pre-mixed oil paints in portable tin tubes, which allowed artists to work outside their studios.

The Impressionists were initially rejected by the official Salon, the prestigious annual art exhibition organized by the Academie des Beaux-Arts. Their work was considered unfinished and amateurish by academic standards. However, by the 1890s, Impressionism had gained widespread acceptance and profoundly influenced virtually every subsequent art movement, from Post-Impressionism to Abstract Expressionism.`,
    plantedErrors: [
      {
        start: 455,
        end: 530,
        type: 'hallucination',
        explanation: 'The Impressionists held eight independent exhibitions between 1874 and 1886, not six. The eight exhibitions took place in 1874, 1876, 1877, 1879, 1880, 1881, 1882, and 1886.',
      },
      {
        start: 777,
        end: 852,
        type: 'unsupported',
        explanation: 'While portable paint tubes (invented in 1841 by John Goffe Rand) did facilitate plein air painting, calling them a "recent invention" in the context of the 1870s is misleading — they had been available for over 30 years by then. The innovation was not recent relative to the Impressionist movement.',
      },
    ],
  },
  {
    id: 'student-det-arts-2',
    title: 'Jazz Improvisation Techniques',
    discipline: 'ARTS',
    tier: 2,
    context: 'You asked an AI to explain bebop jazz improvisation for your Music History and Theory class.',
    aiResponse: `Bebop emerged in the early 1940s as a reaction against the dance-oriented big band swing that had dominated jazz. Pioneered primarily by Charlie Parker (alto saxophone) and Dizzy Gillespie (trumpet), bebop featured faster tempos, complex harmonies, and virtuosic improvisation that moved jazz from popular entertainment toward an art form for attentive listening.

Bebop improvisers departed from swing-era practices in several important ways. Rather than improvising primarily over the melody, bebop musicians improvised over the chord changes (harmonic progression) of a tune. They often used the chord progressions of well-known standards as the basis for new compositions — a practice called contrafact. For example, dozens of bebop tunes are based on the chord changes of "I Got Rhythm" by George Gershwin.

Harmonically, bebop musicians expanded the jazz vocabulary by incorporating extended chord tones (9ths, 11ths, 13ths), tritone substitutions, and chromatic passing tones. The characteristic "bebop scale" adds a chromatic passing tone to the standard major or dominant scale, creating an eight-note scale that naturally places chord tones on strong beats.

Rhythmically, bebop featured a shift from the 2/4 feel of swing to a smoother 4/4 time, with the ride cymbal keeping a steady pattern and the bass drum used for accents ("dropping bombs") rather than keeping time. The standard bebop rhythm section consisted of piano, bass, drums, and guitar, with the piano comping irregular chords behind the soloist.

Key recordings include Parker's "Ko-Ko" (1945), Gillespie's "A Night in Tunisia" (1942), and Thelonious Monk's contributions from the sessions at Minton's Playhouse in Harlem, where much of the style was developed in late-night jam sessions.`,
    plantedErrors: [
      {
        start: 1098,
        end: 1131,
        type: 'hallucination',
        explanation: 'Swing music is characterized by a 4/4 feel (not 2/4). The rhythmic distinction between swing and bebop is not a change in time signature but rather in the rhythmic approach: swing emphasized a heavy, danceable groove with clear beat emphasis, while bebop used a lighter, more fluid rhythmic feel with greater syncopation and asymmetric phrasing.',
      },
      {
        start: 1290,
        end: 1386,
        type: 'missing_context',
        explanation: 'While piano, bass, and drums formed the core bebop rhythm section, guitar was NOT a standard component of the typical bebop combo. Bebop generally moved away from the guitar-driven rhythm section of the swing era. The standard bebop combo was typically a horn (or two) plus piano, bass, and drums. Guitar was used by some bebop musicians (like Charlie Christian), but it was not standard.',
      },
    ],
  },
  {
    id: 'student-det-arts-3',
    title: 'Film Noir Cinematography',
    discipline: 'ARTS',
    tier: 3,
    context: 'You asked an AI to analyze the cinematographic techniques of film noir for your advanced Film Studies seminar.',
    aiResponse: `Film noir, a term coined by French critic Nino Frank in 1946, refers to a cycle of primarily American crime films produced from the early 1940s through the late 1950s. The style is defined as much by its visual approach as by its narrative themes of moral ambiguity, fatalism, and urban corruption.

Cinematographically, film noir is characterized by its dramatic use of low-key lighting, creating stark contrasts between light and shadow (chiaroscuro). Directors of photography like John Alton and Nicholas Musuraca employed techniques drawn from German Expressionist cinema, including extreme angles, deep shadows, and venetian blind lighting patterns that cast striped shadows across characters' faces and bodies.

A signature technique was the use of night-for-night shooting rather than the day-for-night approach common in other genres. This, combined with wet-down streets that created reflective surfaces, produced the distinctive nocturnal atmosphere associated with the genre. Wide-angle lenses were frequently used to create depth distortion in tight interior spaces, enhancing the sense of psychological unease.

The genre's visual style was partly born of necessity. Many noir films were B-pictures with limited budgets, which made extensive location shooting and elaborate sets impractical. Low-key lighting could disguise inexpensive sets, and shooting on location at night reduced the need for costly studio construction. Additionally, the availability of faster film stocks in the 1940s — particularly Eastman Kodak's Plus-X introduced in 1938 — enabled shooting in lower light conditions that would have been technically impossible a decade earlier.

Notable examples of noir cinematography include "The Third Man" (1949, shot by Robert Krasker), "Double Indemnity" (1944, shot by John Seitz), and "Touch of Evil" (1958, shot by Russell Metty), the last of which features a celebrated three-minute opening tracking shot through a Mexican border town.`,
    plantedErrors: [
      {
        start: 1384,
        end: 1533,
        type: 'hallucination',
        explanation: 'The famous opening shot of "Touch of Evil" (1958) is approximately three minutes and twenty seconds long, which is roughly accurate. However, the passage describes it as a "three-minute opening tracking shot," which understates it slightly but is close enough. The real issue is that the film was shot by Russell Metty — this is correct, but the passage embeds a subtle framing issue: "The Third Man" (1949), while a classic noir, is actually a British film shot in Vienna, not an American production, which partially contradicts the earlier framing of noir as "primarily American crime films." This inconsistency reveals an uncritical lumping of international noir into the American cycle without acknowledgment.',
      },
    ],
  },
]

// ── PROFESSIONAL ─────────────────────────────────────────────────────────────

const PROFESSIONAL_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-pro-1',
    title: 'SWOT Analysis Basics',
    discipline: 'PROFESSIONAL',
    tier: 1,
    context: 'You asked an AI to explain SWOT analysis for your Introduction to Business course.',
    aiResponse: `SWOT analysis is a strategic planning tool developed by Albert Humphrey at Stanford Research Institute in the 1960s. It provides a structured framework for evaluating a business or project by examining four key dimensions: Strengths, Weaknesses, Opportunities, and Threats.

Strengths and Weaknesses are internal factors — things within the organization's control. Strengths might include a strong brand, skilled workforce, or proprietary technology. Weaknesses could be high debt, poor location, or outdated equipment.

Opportunities and Threats are external factors — elements in the broader environment. Opportunities might include emerging markets, favorable regulations, or technological advances. Threats could be new competitors, changing consumer preferences, or economic downturns.

To conduct a SWOT analysis, you typically gather a cross-functional team and brainstorm items for each quadrant. The results are organized into a 2x2 matrix, with internal factors on the left and external factors on the right, and positive factors on top and negative factors on the bottom.

The key strategic insight comes from cross-referencing the quadrants. For example, a SO (Strength-Opportunity) strategy leverages strengths to capitalize on opportunities, while a WT (Weakness-Threat) strategy focuses on minimizing weaknesses to avoid threats. SWOT was originally designed for corporate strategy but is now used in personal career planning, nonprofit management, and even government policy analysis.

One important limitation: SWOT analysis provides a snapshot in time and does not inherently prioritize items or account for the magnitude of each factor. It should always be combined with quantitative analysis methods like Porter's Five Forces, which was developed as a direct extension of SWOT by Michael Porter in 1979.`,
    plantedErrors: [
      {
        start: 679,
        end: 813,
        type: 'hallucination',
        explanation: 'The standard SWOT matrix layout places internal factors (Strengths/Weaknesses) in the top row and external factors (Opportunities/Threats) in the bottom row — or alternatively, helpful factors on the left and harmful on the right. The description of "internal on the left and external on the right, positive on top and negative on the bottom" is one of several common layouts but is stated as definitive when the arrangement actually varies by framework.',
      },
      {
        start: 1230,
        end: 1393,
        type: 'hallucination',
        explanation: 'Porter\'s Five Forces was NOT developed as a "direct extension of SWOT." Michael Porter developed the Five Forces framework independently as a tool for analyzing competitive dynamics within an industry. While both are strategic analysis tools, Five Forces is rooted in industrial organization economics, not in SWOT methodology.',
      },
    ],
  },
  {
    id: 'student-det-pro-2',
    title: 'Contract Law Fundamentals',
    discipline: 'PROFESSIONAL',
    tier: 2,
    context: 'You asked an AI to explain the elements of a valid contract for your Business Law class midterm review.',
    aiResponse: `Under common law, a valid contract requires four essential elements: offer, acceptance, consideration, and mutual assent (also called "meeting of the minds"). If any of these elements is missing, the agreement is generally not enforceable in court.

An offer is a clear expression of willingness to enter into an agreement on specific terms. It must be communicated to the offeree and must be sufficiently definite that a court could determine the parties' obligations. An offer can be revoked at any time before acceptance, unless it is an option contract supported by separate consideration.

Acceptance must mirror the terms of the offer exactly — this is known as the "mirror image rule." Under the Uniform Commercial Code (UCC), which governs the sale of goods, the mirror image rule is relaxed: an acceptance that includes additional or different terms may still create a contract, with the additional terms treated as proposals for addition to the contract.

Consideration is the bargained-for exchange — each party must give something of value. Past consideration (something already done before the promise was made) is generally valid consideration under American law, as long as it was done at the promisor's request. A promise to give a gift, lacking consideration, is not enforceable as a contract.

Additionally, both parties must have legal capacity (be of legal age and sound mind) and the contract must be for a lawful purpose. Certain contracts must also satisfy the Statute of Frauds by being in writing — including contracts for the sale of goods over $500, contracts that cannot be performed within one year, and contracts for the sale of real property.`,
    plantedErrors: [
      {
        start: 836,
        end: 963,
        type: 'hallucination',
        explanation: 'Past consideration is generally NOT valid consideration under American common law. The past consideration rule states that something already done before a promise is made cannot serve as consideration for that promise, because it was not "bargained for." There are narrow exceptions (e.g., a moral obligation plus a new promise in some jurisdictions), but the general rule is that past consideration is no consideration.',
      },
      {
        start: 1130,
        end: 1202,
        type: 'missing_context',
        explanation: 'The UCC threshold for the Statute of Frauds has been revised. Under UCC Article 2 as revised (adopted in most jurisdictions), the threshold was updated to $5,000, not $500. The $500 figure comes from the original 1952 UCC. While some states still use the $500 threshold, stating it without noting the revision is potentially misleading for students studying current law.',
      },
    ],
  },
  {
    id: 'student-det-pro-3',
    title: 'Agile vs. Waterfall Methodology',
    discipline: 'PROFESSIONAL',
    tier: 3,
    context: 'You asked an AI to compare Agile and Waterfall methodologies for your Software Engineering Management course paper.',
    aiResponse: `The Waterfall and Agile methodologies represent two fundamentally different approaches to software development project management, each with distinct strengths suited to different project contexts.

The Waterfall model, formalized by Winston Royce in his 1970 paper "Managing the Development of Large Software Systems," follows a sequential, phase-based approach: requirements, design, implementation, testing, deployment, and maintenance. Each phase must be completed before the next begins, with formal documentation serving as the primary deliverable at each stage. Royce presented the model as an ideal for large-scale government contracts where requirements could be fully specified upfront.

Agile methodologies emerged as a response to Waterfall's rigidity. The Agile Manifesto, published in 2001 by seventeen software developers meeting in Snowbird, Utah, established four core values: individuals and interactions over processes and tools; working software over comprehensive documentation; customer collaboration over contract negotiation; and responding to change over following a plan.

Scrum, the most popular Agile framework, organizes work into time-boxed iterations called sprints (typically 2-4 weeks). Each sprint produces a potentially shippable increment of the product. Key roles include the Product Owner (who prioritizes the backlog), the Scrum Master (who facilitates the process), and the Development Team. Daily standups, sprint reviews, and retrospectives provide regular feedback loops.

Research on the effectiveness of Agile vs. Waterfall has consistently shown that Agile delivers higher quality software with fewer defects across all project types and scales. The 2020 CHAOS Report by the Standish Group found that Agile projects have a 42% success rate compared to Waterfall's 13%, with success defined as on-time, on-budget, and with a satisfactory result.`,
    plantedErrors: [
      {
        start: 190,
        end: 337,
        type: 'missing_context',
        explanation: 'While Royce\'s 1970 paper is commonly cited as formalizing the Waterfall model, the paper actually presented the sequential model as flawed and advocated for iterative feedback loops between phases. Royce described the pure waterfall as "risky and invites failure" and recommended incorporating prototyping and iteration. The widespread adoption of Waterfall as a rigid sequential process was based on a misreading of his paper.',
      },
    ],
  },
]

// ── HEALTH SCIENCES ──────────────────────────────────────────────────────────

const HEALTH_SCIENCES_SCENARIOS: StudentOutputScenario[] = [
  {
    id: 'student-det-health-1',
    title: 'Blood Pressure Basics',
    discipline: 'HEALTH_SCIENCES',
    tier: 1,
    context: 'You asked an AI to explain blood pressure measurement and normal ranges for your Health Assessment course.',
    aiResponse: `Blood pressure is the force exerted by circulating blood against the walls of blood vessels. It is measured using a sphygmomanometer and stethoscope (or an automated device) and expressed as two numbers: systolic pressure (when the heart contracts) over diastolic pressure (when the heart relaxes).

Normal blood pressure for adults is generally considered to be below 120/80 mmHg. The American Heart Association classifies blood pressure into several categories:
- Normal: Less than 120/80 mmHg
- Elevated: Systolic 120-129 and diastolic less than 80 mmHg
- Stage 1 Hypertension: Systolic 130-139 or diastolic 80-89 mmHg
- Stage 2 Hypertension: Systolic 140+ or diastolic 90+ mmHg
- Hypertensive Crisis: Systolic over 180 and/or diastolic over 120 mmHg

When measuring blood pressure, the patient should be seated comfortably with their arm supported at heart level. The cuff should be placed over the brachial artery, approximately one inch above the antecubital fossa. The cuff is inflated to about 200 mmHg and then slowly deflated.

The first Korotkoff sound heard indicates the diastolic pressure, and the point at which the sounds disappear indicates the systolic pressure. For the most accurate reading, blood pressure should be measured in both arms, and the higher reading should be used as the reference value.

Common factors that can temporarily raise blood pressure include caffeine, stress, recent exercise, and a full bladder. Patients should avoid these factors for at least 30 minutes before measurement.`,
    plantedErrors: [
      {
        start: 876,
        end: 1004,
        type: 'hallucination',
        explanation: 'This is reversed. The first Korotkoff sound indicates SYSTOLIC pressure (the point at which blood starts flowing through the compressed artery), and the point at which sounds disappear indicates DIASTOLIC pressure (when blood flows freely). This is a critical error that reverses the fundamental mechanics of auscultatory blood pressure measurement.',
      },
      {
        start: 731,
        end: 776,
        type: 'unsupported',
        explanation: 'Inflating to "about 200 mmHg" as a standard procedure is an oversimplification. Standard practice is to inflate the cuff to 20-30 mmHg above the estimated systolic pressure (determined by palpation first), not to a fixed 200 mmHg. Inflating to a fixed 200 mmHg could be unnecessary for patients with normal BP and insufficient for patients with very high BP.',
      },
    ],
  },
  {
    id: 'student-det-health-2',
    title: 'Antibiotic Resistance Mechanisms',
    discipline: 'HEALTH_SCIENCES',
    tier: 2,
    context: 'You asked an AI to explain bacterial antibiotic resistance mechanisms for your Microbiology class.',
    aiResponse: `Antibiotic resistance is a growing global health concern. Bacteria can develop resistance to antibiotics through several distinct mechanisms, often acquiring multiple resistance strategies simultaneously.

The primary mechanisms include:

1. Enzymatic degradation: Bacteria produce enzymes that break down or modify the antibiotic. The most well-known example is beta-lactamase, which cleaves the beta-lactam ring in antibiotics like penicillin and ampicillin. Extended-spectrum beta-lactamases (ESBLs) can even break down third-generation cephalosporins.

2. Target modification: Bacteria alter the molecular target of the antibiotic so it can no longer bind effectively. For example, methicillin-resistant Staphylococcus aureus (MRSA) produces an altered penicillin-binding protein (PBP2a) that has low affinity for beta-lactam antibiotics.

3. Efflux pumps: Bacteria express membrane proteins that actively pump antibiotics out of the cell before they can reach their intracellular targets. These pumps often have broad specificity and can confer resistance to multiple drug classes simultaneously.

4. Decreased permeability: Gram-negative bacteria can reduce the number or size of outer membrane porins, limiting antibiotic entry into the cell.

Resistance genes can spread between bacteria through vertical transmission (parent to daughter cells) and horizontal gene transfer, which includes conjugation (direct cell-to-cell transfer via pili), transformation (uptake of free DNA from the environment), and transduction (transfer via bacteriophages). Of these, transformation is the most clinically significant mechanism of horizontal gene transfer, as it allows resistance to spread rapidly between different bacterial species in hospital environments.

The selective pressure of antibiotic use drives the evolution of resistance. When antibiotics kill susceptible bacteria, resistant mutants survive and proliferate — a textbook example of Darwinian natural selection.`,
    plantedErrors: [
      {
        start: 1173,
        end: 1381,
        type: 'hallucination',
        explanation: 'Transformation is NOT the most clinically significant mechanism of horizontal gene transfer. Conjugation is generally considered the most important mechanism for the clinical spread of antibiotic resistance, as it allows direct transfer of resistance plasmids between bacteria (including between different species) at high efficiency. Transformation is relatively inefficient in natural settings compared to conjugation.',
      },
    ],
  },
  {
    id: 'student-det-health-3',
    title: 'Evidence-Based Practice Hierarchy',
    discipline: 'HEALTH_SCIENCES',
    tier: 3,
    context: 'You asked an AI to explain the hierarchy of evidence for your Evidence-Based Practice in Nursing course.',
    aiResponse: `Evidence-based practice (EBP) in healthcare involves making clinical decisions based on the best available research evidence, combined with clinical expertise and patient values. Central to EBP is the concept of a hierarchy of evidence, which ranks research designs by their ability to minimize bias and establish causation.

The traditional hierarchy, from strongest to weakest evidence, is typically presented as:

1. Systematic reviews and meta-analyses of randomized controlled trials (RCTs) — These synthesize findings from multiple high-quality studies and are considered the gold standard of evidence.

2. Individual randomized controlled trials — RCTs minimize selection bias through random assignment and are the primary method for establishing treatment efficacy.

3. Cohort studies — These observational studies follow groups over time to identify associations between exposures and outcomes, but cannot definitively establish causation.

4. Case-control studies — These compare individuals with a condition to matched controls, looking backward to identify potential risk factors.

5. Case series and case reports — Descriptions of individual or small groups of patients, useful for generating hypotheses but highly susceptible to bias.

6. Expert opinion and clinical experience — The weakest form of evidence, but still valuable when higher-level evidence is unavailable.

It is important to note that the hierarchy is not absolute. A well-conducted cohort study may provide stronger evidence than a poorly designed RCT. The GRADE (Grading of Recommendations Assessment, Development, and Evaluation) framework, developed by Gordon Guyatt and colleagues in 2004, addressed this by incorporating factors like study quality, consistency, and directness into evidence ratings, moving beyond study design alone.

In clinical practice, the PICO framework (Population, Intervention, Comparison, Outcome) is used to formulate answerable clinical questions that guide the search for evidence. This framework was originally developed by David Sackett in his foundational 1996 BMJ article that established the modern evidence-based medicine movement.`,
    plantedErrors: [
      {
        start: 1454,
        end: 1634,
        type: 'hallucination',
        explanation: 'While David Sackett is indeed considered a founding figure of evidence-based medicine, the PICO framework was not explicitly laid out in his 1996 BMJ article. The PICO format was developed and popularized gradually through EBM teaching resources and textbooks in the late 1990s and early 2000s, with key contributions from multiple scholars including Richardson et al. (1995). Attributing it solely to a specific Sackett article oversimplifies the collaborative development of EBM methodology.',
      },
    ],
  },
]

// ── Aggregate + query ────────────────────────────────────────────────────────

export const STUDENT_SCENARIOS: StudentOutputScenario[] = [
  ...STEM_SCENARIOS,
  ...HUMANITIES_SCENARIOS,
  ...SOCIAL_SCIENCES_SCENARIOS,
  ...ARTS_SCENARIOS,
  ...PROFESSIONAL_SCENARIOS,
  ...HEALTH_SCIENCES_SCENARIOS,
]

export function getStudentScenarios(
  discipline?: DisciplineFamilyKey | null,
  tier?: number,
): StudentOutputScenario[] {
  let results = STUDENT_SCENARIOS
  if (discipline) {
    results = results.filter((s) => s.discipline === discipline)
  }
  if (tier && tier >= 1 && tier <= 3) {
    results = results.filter((s) => s.tier === tier)
  }
  return results
}
