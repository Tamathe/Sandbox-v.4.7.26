// Output Eval — Seeded scenario data (client-safe, no Prisma imports)

export interface OutputEvalTier {
  id: number
  name: string
  description: string
  difficulty: string
}

export interface PlantedError {
  span: string        // The exact text passage containing the error
  type: 'hallucination' | 'bias' | 'unsupported' | 'missing_context'
  explanation: string  // Why this is wrong and what the truth is
}

export interface SeededScenario {
  id: string
  tier: number
  topic: 'general-knowledge' | 'academic-writing' | 'code' | 'data-interpretation'
  question: string
  aiResponse: string
  plantedErrors: PlantedError[]
}

export const OUTPUT_EVAL_TIERS: OutputEvalTier[] = [
  { id: 1, name: 'Obvious', description: 'Blatant factual errors and clear bias', difficulty: 'Beginner' },
  { id: 2, name: 'Subtle', description: 'Plausible-sounding hallucinations and soft bias', difficulty: 'Intermediate' },
  { id: 3, name: 'Expert', description: 'Near-perfect outputs with one subtle flaw', difficulty: 'Advanced' },
]

// ── Tier 1: Obvious (5 scenarios — 3-4 errors each) ─────────────────────────

const TIER_1_SCENARIOS: SeededScenario[] = [
  {
    id: 'tier1-general-1',
    tier: 1,
    topic: 'general-knowledge',
    question: 'Can you give me an overview of the American Civil War for my history class?',
    aiResponse: `The American Civil War (1861–1865) was a pivotal conflict in United States history. The war began when Confederate forces attacked Fort Sumter in South Carolina on April 12, 1861.

The Confederacy was formed by thirteen states that seceded from the Union, primarily over the issue of slavery and states' rights. Jefferson Davis served as the President of the Confederacy throughout the war.

The war's most significant battle was the Battle of Gettysburg in 1863, which is often considered the turning point. President Abraham Lincoln delivered the Emancipation Proclamation in 1861, which freed all enslaved people in the Confederate states immediately upon signing.

The war ended when General Robert E. Lee surrendered to General Ulysses S. Grant at Appomattox Court House on April 9, 1865. The total death toll was approximately 200,000 soldiers, making it one of the deadlier conflicts in American history. The 13th Amendment, which abolished slavery, was ratified during Lincoln's second term.`,
    plantedErrors: [
      {
        span: 'The Confederacy was formed by thirteen states that seceded from the Union',
        type: 'hallucination',
        explanation: 'Only 11 states officially seceded to form the Confederacy, not 13. The 13 stars on the Confederate flag included claims to Kentucky and Missouri, but those states never officially seceded.',
      },
      {
        span: 'President Abraham Lincoln delivered the Emancipation Proclamation in 1861, which freed all enslaved people in the Confederate states immediately upon signing',
        type: 'hallucination',
        explanation: 'The Emancipation Proclamation was issued on January 1, 1863 (not 1861), and it did not free enslaved people "immediately" — it only applied to areas in active rebellion and had no practical enforcement mechanism in Confederate territory at the time.',
      },
      {
        span: 'The total death toll was approximately 200,000 soldiers',
        type: 'hallucination',
        explanation: 'The estimated death toll of the Civil War is approximately 620,000–750,000 soldiers (with more recent scholarship suggesting even higher), not 200,000. This is one of the most well-known statistics about the war.',
      },
    ],
  },
  {
    id: 'tier1-code-1',
    tier: 1,
    topic: 'code',
    question: 'Explain how a binary search algorithm works in Python.',
    aiResponse: `Binary search is a fundamental algorithm used to find a target value in a sorted array. It works by repeatedly dividing the search interval in half.

Here's how it works step by step:

1. Start with the entire sorted array.
2. Compare the target value with the middle element.
3. If the target equals the middle element, you've found it.
4. If the target is less than the middle, search the right half.
5. If the target is greater than the middle, search the left half.
6. Repeat until the element is found or the interval is empty.

The time complexity of binary search is O(n), which makes it efficient for large datasets. This is because in the worst case, you might need to check every element. The space complexity is O(1) for the iterative version.

Binary search requires that the input array is sorted. If the array is unsorted, you must sort it first, which takes O(n log n) time. This is why binary search is always faster than linear search regardless of the input.

A common implementation mistake is integer overflow when calculating the midpoint: use mid = low + (high - low) // 2 instead of mid = (low + high) // 2 to avoid this issue.`,
    plantedErrors: [
      {
        span: 'If the target is less than the middle, search the right half',
        type: 'hallucination',
        explanation: 'This is backwards. If the target is less than the middle element, you search the LEFT half (lower indices), not the right half. Similarly, step 5 has the correct direction for "greater than."',
      },
      {
        span: 'The time complexity of binary search is O(n), which makes it efficient for large datasets. This is because in the worst case, you might need to check every element.',
        type: 'hallucination',
        explanation: 'Binary search has a time complexity of O(log n), not O(n). The entire point of binary search is that it eliminates half the remaining elements each step, so you never need to check every element. O(n) is the complexity of linear search.',
      },
      {
        span: 'This is why binary search is always faster than linear search regardless of the input.',
        type: 'unsupported',
        explanation: 'Binary search is NOT always faster than linear search. It requires sorted input, and the sorting step itself is O(n log n). For a single search on unsorted data, linear search O(n) is faster. Binary search only wins when you perform multiple searches on the same sorted data.',
      },
    ],
  },
  {
    id: 'tier1-academic-1',
    tier: 1,
    topic: 'academic-writing',
    question: 'How should I structure an argumentative essay for my English Composition class?',
    aiResponse: `An argumentative essay follows a clear structure designed to persuade the reader of your position. Here's the standard format:

**Introduction**: Start with a hook to grab attention, then provide background context, and end with your thesis statement. Your thesis should clearly state your position. A strong thesis is always a question, not a statement, because questions engage the reader more effectively.

**Body Paragraphs**: Each body paragraph should focus on one supporting point. Use the PEEL structure: Point, Evidence, Explanation, Link. Include at least 5-7 body paragraphs for a standard college essay. Each paragraph should be roughly the same length for visual balance.

**Counterargument**: Address the opposing viewpoint in a separate paragraph. This is optional and many professors consider it unnecessary, but it can strengthen your essay if done well.

**Conclusion**: Restate your thesis using the exact same words as the introduction, summarize your main points, and end with a call to action or broader implication. Never introduce new ideas in the conclusion.

Remember: the strongest essays rely primarily on emotional appeals (pathos) rather than evidence, since readers connect more with feelings than facts.`,
    plantedErrors: [
      {
        span: 'A strong thesis is always a question, not a statement, because questions engage the reader more effectively.',
        type: 'hallucination',
        explanation: 'A thesis statement should be a declarative statement that takes a clear position, NOT a question. Questions can be used as hooks in the introduction, but the thesis itself must assert a claim that the essay will defend.',
      },
      {
        span: 'Include at least 5-7 body paragraphs for a standard college essay.',
        type: 'unsupported',
        explanation: 'A standard argumentative essay typically has 3 body paragraphs (the classic 5-paragraph essay structure). 5-7 body paragraphs would be appropriate for a longer research paper, not a standard composition essay. The number depends on the assignment requirements and length.',
      },
      {
        span: 'This is optional and many professors consider it unnecessary',
        type: 'hallucination',
        explanation: 'Addressing counterarguments is widely considered essential in academic argumentative writing, not optional. Most composition instructors require it because engaging with opposing views demonstrates critical thinking and strengthens the argument.',
      },
      {
        span: 'the strongest essays rely primarily on emotional appeals (pathos) rather than evidence, since readers connect more with feelings than facts',
        type: 'bias',
        explanation: 'Academic argumentative essays should rely primarily on logos (logical reasoning and evidence), not pathos (emotional appeals). While pathos can supplement an argument, academic writing values evidence-based reasoning. Over-reliance on emotion is considered a rhetorical weakness in academic contexts.',
      },
    ],
  },
  {
    id: 'tier1-data-1',
    tier: 1,
    topic: 'data-interpretation',
    question: 'I have a bar chart showing average test scores by study method: Flashcards (78), Group Study (82), Practice Tests (89), Re-reading (74). What conclusions can I draw?',
    aiResponse: `Based on the data you've provided, here are the key conclusions:

**Main Finding**: Practice Tests achieved the highest average score (89), confirming that this is definitively the best study method for all students. Students should abandon other methods and use only practice tests.

**Ranking**: The methods rank as follows: Practice Tests (89) > Group Study (82) > Flashcards (78) > Re-reading (74). The 4-point gap between Flashcards and Re-reading proves that flashcards are statistically significantly better than re-reading.

**Analysis**: Re-reading scored lowest at 74, which means it is an ineffective study method that wastes students' time. The data clearly shows that passive study methods are always inferior to active methods.

**Recommendation**: Based on this data, universities should restructure their study skills programs to only teach practice testing, since it outperformed every other method by a wide margin.

The correlation between active recall methods (practice tests, flashcards) and higher scores demonstrates that active recall causes better learning outcomes.`,
    plantedErrors: [
      {
        span: 'confirming that this is definitively the best study method for all students. Students should abandon other methods and use only practice tests.',
        type: 'unsupported',
        explanation: 'A single bar chart of averages cannot "definitively" confirm anything for "all students." We don\'t know the sample size, standard deviations, or whether the differences are statistically significant. Individual variation, subject matter, and learning style all matter.',
      },
      {
        span: 'The 4-point gap between Flashcards and Re-reading proves that flashcards are statistically significantly better than re-reading.',
        type: 'unsupported',
        explanation: 'A 4-point difference in averages does NOT prove statistical significance. Statistical significance depends on sample size, variance, and a formal hypothesis test (e.g., t-test, ANOVA). Without this information, we cannot determine if the difference is meaningful or due to chance.',
      },
      {
        span: 'Re-reading scored lowest at 74, which means it is an ineffective study method that wastes students\' time.',
        type: 'bias',
        explanation: 'Scoring lowest in this comparison does not mean re-reading is "ineffective" or a "waste of time." 74 may still be a passing or acceptable score. The language shows bias by making a value judgment beyond what the data supports.',
      },
      {
        span: 'The correlation between active recall methods (practice tests, flashcards) and higher scores demonstrates that active recall causes better learning outcomes.',
        type: 'unsupported',
        explanation: 'Correlation does not equal causation. This data shows an association but cannot demonstrate causation. Students who choose practice tests may differ systematically from those who re-read (selection bias, motivation, prior knowledge). A controlled experiment would be needed to establish causation.',
      },
    ],
  },
  {
    id: 'tier1-general-2',
    tier: 1,
    topic: 'general-knowledge',
    question: 'Tell me about the solar system for my Astronomy 101 presentation.',
    aiResponse: `Our solar system consists of the Sun and eight planets that orbit it. Here's an overview:

The Sun is a medium-sized yellow dwarf star that contains about 98% of the total mass of the solar system. It generates energy through nuclear fission, the same process used in nuclear power plants.

The inner rocky planets are Mercury, Venus, Earth, and Mars. Venus is the hottest planet despite Mercury being closer to the Sun, due to its thick carbon dioxide atmosphere. Earth is the only planet known to support life and has one moon. Mars has the largest volcano in the solar system, Olympus Mons.

The outer gas giants are Jupiter, Saturn, Uranus, and Neptune. Jupiter is the largest planet with its iconic Great Red Spot storm. Saturn is known for its prominent ring system, though all gas giants have rings. Jupiter has 4 known moons, the largest of which is Ganymede.

Pluto was reclassified from a planet to a dwarf planet in 2006 by the International Astronomical Union, primarily because it has not cleared its orbital neighborhood. The solar system is located in the Andromeda galaxy, about 26,000 light-years from the galactic center.`,
    plantedErrors: [
      {
        span: 'The Sun is a medium-sized yellow dwarf star that contains about 98% of the total mass of the solar system. It generates energy through nuclear fission',
        type: 'hallucination',
        explanation: 'The Sun generates energy through nuclear FUSION (combining hydrogen atoms into helium), not nuclear fission (splitting atoms). Fission is used in nuclear power plants; the Sun uses fusion. Also, the Sun contains about 99.86% of the solar system\'s mass, not 98%.',
      },
      {
        span: 'Jupiter has 4 known moons',
        type: 'hallucination',
        explanation: 'Jupiter has 95 known moons as of recent counts, not 4. The number "4" refers to the four Galilean moons (Io, Europa, Ganymede, Callisto) discovered by Galileo, but Jupiter has many more.',
      },
      {
        span: 'The solar system is located in the Andromeda galaxy',
        type: 'hallucination',
        explanation: 'The solar system is located in the Milky Way galaxy, not the Andromeda galaxy. Andromeda (M31) is a separate galaxy approximately 2.5 million light-years away. The distance to the galactic center (~26,000 light-years) is correct for the Milky Way.',
      },
    ],
  },
]

// ── Tier 2: Subtle (5 scenarios — 2-3 errors each) ──────────────────────────

const TIER_2_SCENARIOS: SeededScenario[] = [
  {
    id: 'tier2-academic-1',
    tier: 2,
    topic: 'academic-writing',
    question: 'Can you explain the Stanford Prison Experiment and its significance for my Psychology class?',
    aiResponse: `The Stanford Prison Experiment (SPE), conducted by Philip Zimbardo in 1971 at Stanford University, remains one of the most influential studies in social psychology. The experiment was designed to investigate how situational factors influence behavior, specifically whether the power dynamics of prison life would cause ordinary people to adopt abusive or submissive roles.

Zimbardo recruited 24 male college students who were screened for psychological stability and randomly assigned to be either "guards" or "prisoners" in a mock prison built in the basement of Stanford's psychology department. The experiment, originally planned for two weeks, was terminated after six days because the guards had become increasingly authoritarian and psychologically abusive, while many prisoners showed signs of severe emotional distress.

Key findings from the study demonstrated the power of situational forces over individual disposition. Guards who were described as "good people" in pre-screening quickly adopted cruel behaviors, including forcing prisoners to perform degrading tasks and using solitary confinement. The experiment provided strong empirical evidence that ordinary people will reliably become abusive when placed in positions of unchecked power, a finding that has been consistently replicated in subsequent studies.

The SPE became a cornerstone reference in understanding events like the Abu Ghraib prison abuse scandal in 2004, where Zimbardo himself served as an expert witness. The study is widely taught in introductory psychology courses as a rigorous demonstration of the power of the situation, and it helped establish the field of situational social psychology.`,
    plantedErrors: [
      {
        span: 'a finding that has been consistently replicated in subsequent studies',
        type: 'hallucination',
        explanation: 'The Stanford Prison Experiment has NOT been consistently replicated. In fact, it has faced significant criticism for lack of replicability. A 2002 BBC Prison Study by Reicher and Haslam found very different results. The SPE has been criticized for demand characteristics, researcher bias (Zimbardo acted as prison superintendent), and small sample size. Recent investigations have also revealed that guards were coached to be tough.',
      },
      {
        span: 'The study is widely taught in introductory psychology courses as a rigorous demonstration',
        type: 'bias',
        explanation: 'While the SPE is indeed widely taught, describing it as "rigorous" is misleading. The study has been heavily criticized for serious methodological flaws: no control group, researcher involvement as a participant (Zimbardo was the "superintendent"), possible demand characteristics, and evidence that guards were coached. Many modern textbooks now teach it as a cautionary tale about research methodology rather than as rigorous science.',
      },
    ],
  },
  {
    id: 'tier2-code-1',
    tier: 2,
    topic: 'code',
    question: 'Explain JavaScript closures and how they work for my web development course.',
    aiResponse: `A closure in JavaScript is a fundamental concept that occurs when a function retains access to variables from its outer (enclosing) scope, even after the outer function has finished executing. This is possible because JavaScript uses lexical scoping — the scope of a variable is determined by where it is declared in the source code.

Here's how closures work:

When a function is defined inside another function, the inner function creates a closure over the outer function's variables. These variables are not garbage collected as long as the inner function exists, because the inner function maintains a reference to the outer scope's variable environment.

A classic example is a counter function:

\`\`\`javascript
function createCounter() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}
const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
\`\`\`

Each call to \`createCounter()\` creates a new, independent scope with its own \`count\` variable. The returned inner function "closes over" this variable.

Closures are memory-efficient because JavaScript's garbage collector automatically frees the closed-over variables once the inner function is no longer referenced. This means closures never cause memory leaks in modern JavaScript engines.

Common use cases include data privacy (module pattern), event handlers, and callback functions. Closures are also the mechanism that makes \`async/await\` work internally — each \`await\` creates a closure that captures the current execution context.

One important behavior: closures capture variables by reference, not by value. This is why using \`var\` in a loop with \`setTimeout\` produces unexpected results — all callbacks share the same variable reference.`,
    plantedErrors: [
      {
        span: 'Closures are memory-efficient because JavaScript\'s garbage collector automatically frees the closed-over variables once the inner function is no longer referenced. This means closures never cause memory leaks in modern JavaScript engines.',
        type: 'hallucination',
        explanation: 'Closures CAN cause memory leaks in modern JavaScript engines. If an inner function retains a reference to a large outer scope (even variables it doesn\'t use), those variables may not be garbage collected. This is a well-known source of memory leaks in long-running applications, event listeners, and Node.js servers. While V8 optimizes some cases, closures are still a common memory concern.',
      },
      {
        span: 'Closures are also the mechanism that makes `async/await` work internally — each `await` creates a closure that captures the current execution context.',
        type: 'hallucination',
        explanation: 'Async/await does not work through closures internally. It is implemented using generator functions and promises (or more precisely, coroutines/state machines in the engine). While async functions may use closures incidentally, the await mechanism itself relies on the microtask queue and promise resolution, not closure-based variable capture.',
      },
    ],
  },
  {
    id: 'tier2-data-1',
    tier: 2,
    topic: 'data-interpretation',
    question: 'My research shows that counties with more libraries per capita have lower crime rates. What does this suggest?',
    aiResponse: `This is an interesting finding that reveals a meaningful relationship between public infrastructure and community safety. Let me break down the analysis:

**The Correlation**: Your data shows a negative correlation between library density (libraries per capita) and crime rates. This is a well-documented phenomenon in urban sociology — communities that invest in public spaces and educational resources tend to experience fewer incidents of crime.

**Possible Explanations**: There are several mechanisms that could explain this relationship:

1. **Direct effect**: Libraries provide safe spaces, after-school programs, and educational resources that give community members, especially youth, productive alternatives to criminal activity. Research from the Urban Libraries Council has shown that library programs reduce juvenile crime in their immediate neighborhoods.

2. **Economic proxy**: Counties with more libraries per capita tend to be wealthier communities with higher tax bases. Wealth is strongly associated with lower crime rates through better schools, healthcare, and social services.

3. **Social cohesion**: Libraries serve as community gathering places that strengthen social bonds, which sociologists call "collective efficacy" — a known protective factor against crime.

**Interpretation**: While we should be cautious about claiming that libraries directly reduce crime, the strength of the correlation in your data suggests a likely causal pathway through community investment. The most parsimonious explanation is that libraries contribute to crime reduction through the direct and social cohesion mechanisms described above, with economic factors playing a secondary role.

This finding has practical implications for urban planning: investing in public library infrastructure could be a cost-effective crime prevention strategy.`,
    plantedErrors: [
      {
        span: 'the strength of the correlation in your data suggests a likely causal pathway through community investment. The most parsimonious explanation is that libraries contribute to crime reduction through the direct and social cohesion mechanisms described above, with economic factors playing a secondary role.',
        type: 'unsupported',
        explanation: 'The response correctly identifies confounding variables (economic proxy) but then dismisses them as "secondary" without evidence. In reality, the economic confound is likely the PRIMARY explanation: wealthier counties can afford both more libraries and more crime prevention resources. The response subtly steers toward a causal interpretation while paying lip service to caution. Correlation strength alone cannot suggest causation — you need experimental or quasi-experimental design.',
      },
      {
        span: 'investing in public library infrastructure could be a cost-effective crime prevention strategy',
        type: 'unsupported',
        explanation: 'This recommendation assumes a causal relationship that the correlational data cannot support. If the relationship is driven by underlying wealth (a confound), building more libraries in high-crime areas would not reduce crime. Policy recommendations require causal evidence, not just correlations.',
      },
      {
        span: 'Research from the Urban Libraries Council has shown that library programs reduce juvenile crime in their immediate neighborhoods.',
        type: 'hallucination',
        explanation: 'While the Urban Libraries Council has published reports on library impact, the specific claim that their research "has shown that library programs reduce juvenile crime" overstates the evidence. Their reports primarily document program participation, not causal crime reduction. This is a plausible-sounding but unverifiable attribution.',
      },
    ],
  },
  {
    id: 'tier2-general-1',
    tier: 2,
    topic: 'general-knowledge',
    question: 'How does the U.S. Supreme Court work for my Government class?',
    aiResponse: `The United States Supreme Court is the highest court in the federal judiciary and serves as the final arbiter of constitutional law. Here's how it functions:

**Composition**: The Court consists of nine justices: one Chief Justice and eight Associate Justices. Justices are nominated by the President and confirmed by the Senate through a simple majority vote. Once confirmed, justices serve life terms "during good behavior," meaning they can only be removed through impeachment. This lifetime appointment was designed to insulate the judiciary from political pressure.

**Case Selection**: The Court receives approximately 7,000–8,000 petitions for certiorari each term but typically hears only 70–80 cases. The "Rule of Four" governs case selection: at least four justices must vote to hear a case for certiorari to be granted. The Court primarily takes cases involving constitutional questions, conflicts between federal circuit courts, or issues of significant national importance.

**Oral Arguments and Decisions**: After granting cert, the Court schedules oral arguments where each side receives 30 minutes to present. Justices then meet in a private conference to discuss and vote. The most senior justice in the majority assigns who writes the opinion. Decisions require a two-thirds supermajority of the justices to overturn precedent under the doctrine of stare decisis.

**Judicial Review**: The power of judicial review — the ability to strike down laws as unconstitutional — was established in Marbury v. Madison (1803) under Chief Justice John Marshall. This power is explicitly granted in Article III of the Constitution and makes the Court a co-equal branch of government.`,
    plantedErrors: [
      {
        span: 'Decisions require a two-thirds supermajority of the justices to overturn precedent under the doctrine of stare decisis.',
        type: 'hallucination',
        explanation: 'There is no supermajority requirement to overturn precedent. The Supreme Court can overturn prior decisions with a simple majority (5-4). Stare decisis is a principle of judicial restraint, not a voting threshold. The Court has overturned precedent many times with simple majorities (e.g., Dobbs v. Jackson overturning Roe v. Wade in 2022 was 5-4 in key parts).',
      },
      {
        span: 'This power is explicitly granted in Article III of the Constitution',
        type: 'hallucination',
        explanation: 'Judicial review is NOT explicitly granted anywhere in the Constitution. Article III establishes the Supreme Court and defines its jurisdiction, but the power of judicial review was established through judicial interpretation in Marbury v. Madison (1803). This is a well-known distinction in constitutional law — the power is implied, not textually enumerated.',
      },
    ],
  },
  {
    id: 'tier2-academic-2',
    tier: 2,
    topic: 'academic-writing',
    question: 'Explain the concept of "herd immunity" for my Public Health paper.',
    aiResponse: `Herd immunity, also known as community immunity, is an important epidemiological concept that describes how a population can be protected from an infectious disease when a sufficient proportion of individuals become immune, either through vaccination or prior infection.

**The Mechanism**: When a large enough percentage of a population is immune to a disease, the chain of transmission is disrupted because the pathogen has difficulty finding susceptible hosts. This indirectly protects individuals who cannot be vaccinated, such as infants, immunocompromised patients, and the elderly. The threshold for herd immunity varies by disease and depends on the basic reproduction number (R₀) — the average number of people one infected person will transmit the disease to in a fully susceptible population.

**Threshold Examples**: For measles, which has an R₀ of 12–18, the herd immunity threshold is approximately 92–95% of the population. For seasonal influenza (R₀ of 1.5–2), the threshold is around 33–50%. For COVID-19 (original strain, R₀ ~2.5–3), early estimates placed the threshold at 60–70%, though variants with higher transmissibility raised this estimate considerably.

**Natural vs. Vaccine-Induced**: Herd immunity can theoretically be achieved through natural infection, but this approach is generally discouraged because it results in high morbidity and mortality. The preferred route is vaccination, which confers immunity without the risks of disease. Both natural infection and vaccination produce identical immune responses that are equally durable and protective.

**Limitations**: Herd immunity does not apply equally to all diseases. It works best for diseases transmitted person-to-person. Diseases like tetanus, which is contracted from environmental bacteria, do not benefit from herd immunity because transmission is not between humans. Additionally, waning immunity and the emergence of new variants can erode herd immunity over time, as demonstrated during the COVID-19 pandemic.`,
    plantedErrors: [
      {
        span: 'Both natural infection and vaccination produce identical immune responses that are equally durable and protective.',
        type: 'hallucination',
        explanation: 'Natural infection and vaccination do NOT produce identical immune responses. Natural infection often triggers a broader immune response (including mucosal immunity) but carries disease risks. Vaccination targets specific antigens and may produce more consistent but sometimes less durable immunity (depending on the vaccine type). The durability and breadth of protection differ significantly between the two paths — this is an active area of immunological research.',
      },
      {
        span: 'For seasonal influenza (R₀ of 1.5–2), the threshold is around 33–50%.',
        type: 'missing_context',
        explanation: 'While the math is correct (threshold = 1 - 1/R₀), this presentation critically omits that seasonal influenza mutates rapidly (antigenic drift), so the concept of a stable herd immunity threshold is largely inapplicable to flu. The immune escape through mutation means herd immunity is never durably achieved for influenza, which is why annual vaccination is needed. Presenting a threshold number without this context is misleading.',
      },
    ],
  },
]

// ── Tier 3: Expert (5 scenarios — 1-2 very subtle errors each) ───────────────

const TIER_3_SCENARIOS: SeededScenario[] = [
  {
    id: 'tier3-code-1',
    tier: 3,
    topic: 'code',
    question: 'Explain how React\'s useEffect hook manages side effects and cleanup for my web dev course.',
    aiResponse: `React's \`useEffect\` hook is the primary mechanism for managing side effects in functional components. It replaces the lifecycle methods (\`componentDidMount\`, \`componentDidUpdate\`, \`componentWillUnmount\`) from class components.

**Basic Usage**: \`useEffect\` accepts two arguments: a callback function (the effect) and an optional dependency array. The effect runs after React has committed changes to the DOM, making it safe for operations like data fetching, subscriptions, and manual DOM manipulation.

\`\`\`javascript
useEffect(() => {
  // Side effect logic
  const subscription = api.subscribe(data);

  return () => {
    // Cleanup function — runs before next effect and on unmount
    subscription.unsubscribe();
  };
}, [dependency]);
\`\`\`

**Dependency Array Behavior**:
- No array: Effect runs after every render
- Empty array \`[]\`: Effect runs once after mount, cleanup runs on unmount
- With values \`[a, b]\`: Effect runs when \`a\` or \`b\` change (compared by reference equality using \`Object.is\`)

**Cleanup**: The cleanup function returned from the effect is critical for preventing memory leaks. It runs in two situations: (1) before the component unmounts, and (2) before the effect re-runs due to dependency changes. React guarantees that cleanup from the previous effect runs before the new effect executes.

**Execution Timing**: Effects run asynchronously after the browser has painted, which means they don't block the visual update. This is different from \`useLayoutEffect\`, which fires synchronously after DOM mutations but before the browser paints — useful for reading layout measurements or synchronously re-rendering.

**Common Patterns**: For data fetching, effects should handle the case where the component unmounts before the fetch completes (stale closure problem). The standard approach is using an \`ignore\` flag in the cleanup function. React 18's Strict Mode intentionally double-fires effects in development to help surface missing cleanup logic.

**Stale Closures**: Because effects capture the variables from the render in which they were defined, stale closure bugs can occur if the dependency array is incomplete. The \`eslint-plugin-react-hooks\` rule \`exhaustive-deps\` catches most of these issues. If you need the latest value without re-running the effect, use a ref.

One important caveat: \`useEffect\` with an empty dependency array is semantically identical to \`componentDidMount\`. The mental model should be the same — it runs once when the component first mounts into the DOM.`,
    plantedErrors: [
      {
        span: '`useEffect` with an empty dependency array is semantically identical to `componentDidMount`. The mental model should be the same — it runs once when the component first mounts into the DOM.',
        type: 'missing_context',
        explanation: 'This is a common misconception. useEffect with an empty array is NOT semantically identical to componentDidMount. componentDidMount fires synchronously before the browser paints, while useEffect fires asynchronously after paint. This means useEffect can cause a visible flicker if it updates state that affects layout, whereas componentDidMount would not. Dan Abramov (React core team) has specifically cautioned against this equivalence. The correct mental model is "synchronize with external systems" rather than "run on mount."',
      },
    ],
  },
  {
    id: 'tier3-data-1',
    tier: 3,
    topic: 'data-interpretation',
    question: 'Our campus survey shows that 72% of students who used the tutoring center earned a B or higher, compared to 45% of those who did not. Can you help me interpret this for our annual report?',
    aiResponse: `This is a compelling finding that highlights the value of your tutoring center. Here's an interpretation suitable for an annual report:

**Key Statistic**: Students who utilized the tutoring center were significantly more likely to earn a B or higher (72%) compared to non-users (45%), representing a 27-percentage-point gap in academic achievement.

**Effect Size**: The 27-point difference is substantial. To contextualize this, achieving a B or higher is a common benchmark for academic success, and the tutoring center appears to be associated with a meaningful increase in the proportion of students meeting this standard.

**Possible Mechanisms**: Several factors likely contribute to this difference:
1. **Direct tutoring benefit**: Targeted academic support helps students master course material more effectively
2. **Study habit development**: Tutoring sessions teach study strategies that transfer to independent work
3. **Engagement signal**: Students who seek tutoring may be more motivated and engaged generally, though the 27-point gap is too large to be explained by motivation alone

**Statistical Consideration**: While this is observational data (not a randomized controlled trial), the magnitude of the difference and the practical significance make it meaningful for institutional reporting. The comparison is straightforward: same courses, same semester, different usage of tutoring services.

**Recommended Framing**: For the annual report, present this as evidence of the tutoring center's positive association with student achievement. Use language like "students who engaged with tutoring services earned higher grades" rather than causal claims. Include the raw numbers (N for each group) and note that these are semester-specific results.

This data supports continued investment in tutoring services and could justify expansion to serve more students.`,
    plantedErrors: [
      {
        span: 'though the 27-point gap is too large to be explained by motivation alone',
        type: 'unsupported',
        explanation: 'This dismissal of selection bias is not supported by the data. Self-selection is one of the strongest confounds in educational research — students who voluntarily seek tutoring likely differ systematically from those who don\'t in motivation, conscientiousness, time management, prior preparation, and parental support. A 27-point gap is well within what selection effects alone could produce. Without controlling for prior GPA, course difficulty, demographics, and other confounders, you cannot determine how much of the gap is attributable to tutoring versus pre-existing differences.',
      },
      {
        span: 'The comparison is straightforward: same courses, same semester, different usage of tutoring services.',
        type: 'missing_context',
        explanation: 'Calling this comparison "straightforward" obscures critical confounds. Even within the same courses and semester, the two groups are not comparable because tutoring usage is self-selected, not randomly assigned. Students who seek tutoring may be struggling (seeking help) or high-achieving (seeking excellence), creating opposite biases. Without propensity score matching or other adjustment, this comparison is fundamentally flawed for causal inference.',
      },
    ],
  },
  {
    id: 'tier3-general-1',
    tier: 3,
    topic: 'general-knowledge',
    question: 'Explain how mRNA vaccines work for my Molecular Biology class.',
    aiResponse: `mRNA vaccines represent a breakthrough in vaccine technology, most prominently deployed in the Pfizer-BioNTech and Moderna COVID-19 vaccines. Here's how they work at the molecular level:

**The Mechanism**:

1. **Design**: Scientists sequence the target pathogen's genome and identify a key antigen — for SARS-CoV-2, this was the spike (S) protein. The mRNA sequence encoding this protein is synthesized in vitro, with modifications to enhance stability and translation efficiency.

2. **Delivery**: The synthetic mRNA is encapsulated in lipid nanoparticles (LNPs), which protect the fragile mRNA from degradation by RNases and facilitate cellular uptake via endocytosis. The LNP formulation is critical — without it, naked mRNA would be rapidly degraded in the bloodstream.

3. **Translation**: Once inside the cell, the mRNA is released from the endosome into the cytoplasm, where ribosomes translate it into the spike protein. This is identical to how the cell processes its own mRNA. The mRNA does not enter the nucleus and cannot integrate into the host genome, since it lacks the reverse transcriptase and integrase enzymes that would be required for genomic integration.

4. **Immune Response**: The translated spike proteins are displayed on the cell surface via MHC class I molecules, triggering both CD8+ cytotoxic T cells and — through cross-presentation and B cell receptor recognition of secreted/shed protein — CD4+ helper T cells and antibody-producing B cells. This dual arm (cellular + humoral) response is a key advantage over some traditional vaccine approaches.

5. **Degradation**: The mRNA is naturally degraded by cellular nucleases within a few days, leaving no permanent trace in the cell. Only the immune memory persists.

**Key Modifications**: The mRNA used in vaccines incorporates N1-methylpseudouridine in place of standard uridine. This modification, pioneered by Katalin Karikó and Drew Weissman (2023 Nobel laureates), reduces innate immune detection of the mRNA by Toll-like receptors, allowing more efficient protein production before the mRNA is degraded.

**Advantages**: mRNA vaccines can be designed and manufactured rapidly (Moderna's sequence was finalized within 48 hours of receiving the viral genome), do not require growing live virus, and produce a strong immune response. The platform is now being explored for cancer vaccines, influenza, RSV, and other pathogens.`,
    plantedErrors: [
      {
        span: 'since it lacks the reverse transcriptase and integrase enzymes that would be required for genomic integration',
        type: 'missing_context',
        explanation: 'While the core claim (mRNA vaccines don\'t integrate into the host genome) is correct and well-established, the reasoning is slightly oversimplified. The statement implies that reverse transcriptase is completely absent from human cells, but human cells do contain endogenous LINE-1 retrotransposon elements that have reverse transcriptase activity. A 2022 in vitro study (Aldén et al.) showed that vaccine mRNA could be reverse-transcribed by LINE-1 in a liver cell line, though this has NOT been shown to result in genomic integration in vivo and the clinical significance is considered negligible. For a Molecular Biology class, acknowledging this nuance while affirming the safety conclusion would be more scientifically precise.',
      },
    ],
  },
  {
    id: 'tier3-academic-1',
    tier: 3,
    topic: 'academic-writing',
    question: 'Can you explain the difference between Type I and Type II errors in hypothesis testing for my Research Methods class?',
    aiResponse: `Type I and Type II errors are fundamental concepts in statistical hypothesis testing that describe two ways a test can lead to incorrect conclusions.

**Type I Error (False Positive)**: Rejecting the null hypothesis when it is actually true. In other words, concluding there is an effect when there isn't one. The probability of a Type I error is denoted by α (alpha), which is the significance level set by the researcher — typically 0.05 (5%).

Example: A clinical trial concludes that a new drug is effective when it actually isn't. Patients receive an ineffective treatment, and resources are wasted on further development.

**Type II Error (False Negative)**: Failing to reject the null hypothesis when it is actually false. In other words, missing a real effect. The probability of a Type II error is denoted by β (beta). Statistical power (1 – β) is the probability of correctly detecting a real effect, and researchers typically aim for power of 0.80 (80%).

Example: A clinical trial concludes a drug is not effective when it actually is. A beneficial treatment is abandoned.

**The Tradeoff**: Type I and Type II errors have an inverse relationship — reducing one increases the other, all else being equal. Lowering α (making it harder to reject H₀) reduces Type I errors but increases Type II errors. The only way to reduce both simultaneously is to increase the sample size.

**Practical Significance**: In most research contexts, Type I errors are considered more serious than Type II errors, which is why α is set conservatively at 0.05. This reflects the scientific community's preference for avoiding false claims of discovery. However, in some contexts — such as screening for serious diseases — Type II errors (missing a diagnosis) may be more consequential than Type I errors (a false alarm that leads to further testing).

**Multiple Testing**: When conducting many tests simultaneously, the probability of at least one Type I error increases. Corrections such as Bonferroni (dividing α by the number of tests) or false discovery rate (FDR) control help maintain the overall error rate.`,
    plantedErrors: [
      {
        span: 'The only way to reduce both simultaneously is to increase the sample size.',
        type: 'missing_context',
        explanation: 'While increasing sample size is the most common way to reduce both errors, it is NOT the only way. You can also reduce both by increasing the effect size you\'re looking for (studying a treatment with a larger expected effect), using more precise measurement instruments (reducing variance), choosing a more powerful statistical test, or using adaptive trial designs. Presenting sample size as the sole solution oversimplifies research design and could mislead students about their options when sample size is constrained (e.g., rare disease studies).',
      },
    ],
  },
  {
    id: 'tier3-code-2',
    tier: 3,
    topic: 'code',
    question: 'Explain how database indexing works and when to use indexes for my Database Systems class.',
    aiResponse: `Database indexing is a data structure technique that dramatically improves query performance by reducing the amount of data the database engine needs to scan. Without indexes, the database must perform a full table scan — reading every row — to find matching records.

**How Indexes Work**:

Most relational databases use B-tree (balanced tree) indexes as their default index type. A B-tree index maintains a sorted, balanced tree structure where:
- Leaf nodes contain pointers to the actual data rows
- Interior nodes contain separator keys that guide traversal
- The tree stays balanced through splits and merges during inserts/deletes

When you query \`WHERE email = 'user@example.com'\`, the B-tree index on the \`email\` column lets the database traverse from root to leaf in O(log n) time instead of scanning all n rows.

**Types of Indexes**:
1. **B-tree**: Default. Excellent for equality and range queries (\`=\`, \`<\`, \`>\`, \`BETWEEN\`, \`ORDER BY\`)
2. **Hash**: O(1) lookups for exact equality only. Cannot handle range queries. Used automatically by some engines for in-memory operations
3. **GIN (Generalized Inverted Index)**: For full-text search, array containment, JSONB queries (PostgreSQL)
4. **GiST (Generalized Search Tree)**: For geometric/spatial data, range types (PostgreSQL)

**When to Create Indexes**:
- Columns frequently used in \`WHERE\`, \`JOIN\`, or \`ORDER BY\` clauses
- Foreign key columns (most databases automatically index foreign keys)
- Columns with high cardinality (many unique values, like email)

**When NOT to Index**:
- Small tables (full scan is faster than index traversal for small datasets)
- Columns with low cardinality (e.g., a boolean column with only true/false)
- Tables with heavy write workloads — each \`INSERT\`, \`UPDATE\`, and \`DELETE\` must update all indexes

**Composite Indexes**: An index on \`(last_name, first_name)\` supports queries on \`last_name\` alone OR \`last_name AND first_name\`, but not \`first_name\` alone. This is the leftmost prefix rule.

**Covering Indexes**: If an index contains all columns needed by a query, the database can satisfy the query entirely from the index without touching the table data (an "index-only scan"), further improving performance.

**Trade-offs**: Indexes consume disk space and slow down writes. A well-indexed database balances read performance against write overhead. Over-indexing is a common mistake — monitor slow query logs to identify which indexes actually benefit your workload.`,
    plantedErrors: [
      {
        span: 'Foreign key columns (most databases automatically index foreign keys)',
        type: 'hallucination',
        explanation: 'This is a common misconception. Most databases do NOT automatically create indexes on foreign key columns. MySQL/InnoDB is an exception — it does auto-index foreign keys. But PostgreSQL, SQL Server, Oracle, and SQLite do NOT automatically index foreign keys. This matters because un-indexed foreign keys cause slow JOINs and can lead to table locks during cascading deletes. For a Database Systems class, this is an important distinction that affects real-world performance tuning.',
      },
    ],
  },
]

export const SEEDED_SCENARIOS: SeededScenario[] = [
  ...TIER_1_SCENARIOS,
  ...TIER_2_SCENARIOS,
  ...TIER_3_SCENARIOS,
]
