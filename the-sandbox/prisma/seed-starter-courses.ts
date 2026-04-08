// Starter course seed data for the UK demo.
// One course per UK college — loaded via the "one-click starter" feature.
// Built by the build-starter-courses-agent. Do not hand-edit the STARTER_COURSES array;
// use the agent loop in Blueprints/build-starter-courses-agent.md instead.
//
// To add a new course: run the build agent.
// To load into DB: npm run db:seed (imports and runs seedStarterCourses from seed.ts)

import { PrismaClient } from '../app/generated/prisma'

export interface StarterCourseMaterial {
  moduleNumber: number
  title: string
  materialType: string
  content: string
  isVisible?: boolean
}

export interface StarterCourse {
  courseCode: string
  title: string
  description: string
  college: string
  semester: string
  materials: StarterCourseMaterial[]
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTER COURSES — built by build-starter-courses-agent
// ─────────────────────────────────────────────────────────────────────────────

export const STARTER_COURSES: StarterCourse[] = [

  // ────────────────────────────────────────────────
  // PSY-100-STARTER — Introduction to Psychology
  // College of Arts & Sciences
  // ────────────────────────────────────────────────
  {
    courseCode: 'PSY-100-STARTER',
    title: 'Introduction to Psychology',
    description: 'A broad survey of the scientific study of human behavior and mental processes, covering biological bases, perception, learning, memory, social influences, and psychological disorders. Designed for students with no prior background in psychology.',
    college: 'College of Arts & Sciences',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `PSY 100 — Introduction to Psychology
College of Arts & Sciences, University of Kentucky
Spring 2026 | MWF 10:00–10:50 AM | Classroom Building 110

INSTRUCTOR
Dr. Katie Thompson, Department of Psychology
Office: Kastle Hall 205
Office Hours: Monday & Wednesday 11:00 AM–12:30 PM, Friday 11:00 AM–12:00 PM
Zoom Office Hours (by appointment): https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu (responses within 48 hours on weekdays)

COURSE DESCRIPTION
PSY 100 introduces students to the scientific study of behavior and mental processes. Topics range from neuroscience and sensation to memory, development, social influence, and clinical disorders. No prerequisites required.

REQUIRED TEXTBOOK
Myers, D. G., & DeWall, C. N. (2021). Psychology (13th ed.). Worth Publishers. ISBN: 978-1319190040. The e-book version is acceptable.

GRADING BREAKDOWN
Midterm Exam (Week 7)             20%
Final Exam (Week 15, cumulative)  25%
Research Paper (due Week 12)      15%
Chapter Quizzes (14 total, drop 2) 20%
Discussion Participation           10%
In-Class Activities                10%
TOTAL                             100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM INFORMATION
There are two exams in this course: a Midterm Exam in Week 7 (covering Modules 1–4) and a cumulative Final Exam in Week 15 (covering all modules with emphasis on Modules 5–6). Both exams are 75-minute in-person exams consisting of 50 multiple-choice questions and 2 short-answer questions worth 25 points each.

WEEKLY SCHEDULE
Week 1  — Introduction: What Is Psychology? History and schools of thought (behaviorism, psychoanalysis, humanism, cognitive, biological, sociocultural)
Week 2  — Research Methods: Scientific method, experimental design, ethics in research
Week 3  — Biological Bases of Behavior: Neurons, neurotransmitters, nervous system overview
Week 4  — Brain Structures and Functions: Lobes of the cortex, limbic system, neuroplasticity
Week 5  — Sensation and Perception: Sensory thresholds, visual and auditory processing, perceptual illusions
Week 6  — States of Consciousness: Sleep stages, dreams, hypnosis, psychoactive drugs
Week 7  — MIDTERM EXAM (covers Weeks 1–6 content) + Introduction to Learning
Week 8  — Learning: Classical conditioning, operant conditioning, observational learning
Week 9  — Memory: Encoding, storage, retrieval; short-term vs. long-term memory; forgetting
Week 10 — Cognition and Language: Problem solving, heuristics, biases, language development
Week 11 — Motivation and Emotion: Drive theories, Maslow's hierarchy, emotion theories
Week 12 — Social Psychology: Conformity, obedience, persuasion, group dynamics (Research Paper due end of Week 12)
Week 13 — Developmental Psychology: Piaget, Erikson, lifespan development
Week 14 — Psychological Disorders: DSM overview, anxiety, mood disorders, schizophrenia, personality disorders
Week 15 — Treatment of Disorders + Review; FINAL EXAM during finals period

ASSIGNMENTS AND DUE DATES
Chapter Quizzes: 14 online quizzes on Canvas, due by 11:59 PM Sunday of the week assigned. Lowest 2 scores dropped. Each quiz = 10 questions, 10 points.
Research Paper: 5–7 pages (APA format) analyzing a psychological concept of your choice using a minimum of 5 peer-reviewed sources. Topic approval due Week 9, paper due end of Week 12 (Sunday 11:59 PM on Canvas).
Discussion Participation: Weekly in-class discussions; graded on quality of contribution (not just attendance). Three lowest participation days dropped.

LATE POLICY
Late assignments lose 10 points per day late (including weekends). No assignments accepted more than 3 days after the deadline. Exams cannot be made up without documented medical or family emergency submitted within 48 hours of the missed exam.

ATTENDANCE POLICY
Attendance is not formally graded but in-class activities cannot be made up. More than 4 absences may result in a grade reduction at the instructor's discretion. Arrive on time; late arrivals disrupt peers and miss activity instructions.

ACADEMIC INTEGRITY
All work must be your own. Plagiarism, unauthorized collaboration, and use of AI tools to generate submitted text violate UK's Academic Integrity Policy and will result in a zero for the assignment and possible course failure. See Student Code of Conduct at www.uky.edu/studentconduct.

ACCESSIBILITY
Students with disabilities requiring accommodations should contact the Disability Resource Center (257-2754) and provide accommodation letters within the first two weeks of class.`
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Science of Psychology',
        materialType: 'lecture',
        content: `MODULE 1: THE SCIENCE OF PSYCHOLOGY
History, Schools of Thought, and Research Methods

WHAT IS PSYCHOLOGY?
Psychology is the scientific study of behavior and mental processes. This definition has two critical components: (1) it is scientific — meaning psychologists use systematic, empirical methods to test hypotheses — and (2) it encompasses both observable behavior (what people do) and internal mental processes (thoughts, feelings, perceptions, memories).

A BRIEF HISTORY
Psychology formally began in 1879 when Wilhelm Wundt opened the first experimental psychology laboratory in Leipzig, Germany. Early psychologists debated the proper subject matter and methods of the new science:

- Structuralism (Wundt, Titchener): Used introspection to break conscious experience into its basic elements. Criticized for being too subjective and unreliable.
- Functionalism (William James): Focused on how mental processes help organisms adapt and function. Influenced by Darwin's evolutionary theory. Led to applied and educational psychology.
- Psychoanalysis (Sigmund Freud): Emphasized unconscious drives, repressed memories, and childhood experiences as determinants of behavior. Influential but difficult to test empirically.
- Behaviorism (Watson, Skinner): Rejected the study of the mind entirely; focused only on observable, measurable behavior and environmental stimuli. Dominated psychology from the 1920s–1960s.
- Humanistic Psychology (Maslow, Rogers): Reaction against behaviorism and psychoanalysis; emphasized human dignity, free will, and the drive toward self-actualization.
- Cognitive Revolution (1960s–present): Returned attention to mental processes — perception, memory, language, problem-solving — using information-processing models.
- Biological/Neuroscience Approach: Modern emphasis on brain mechanisms, genetics, and neurotransmitters underlying behavior.
- Sociocultural Approach: Examines how culture, society, gender, race, and social context shape behavior and mental processes.

CONTEMPORARY PSYCHOLOGY
Today's psychology is pluralistic — most psychologists adopt a biopsychosocial perspective that integrates biological, psychological, and social factors. The field has dozens of sub-disciplines including clinical, developmental, social, cognitive, industrial-organizational, and forensic psychology.

RESEARCH METHODS
Because psychology is a science, claims must be tested empirically:

Descriptive Methods: Case studies (in-depth study of one individual), surveys (self-report questionnaires), and naturalistic observation describe behavior without manipulating variables. They establish "what" but not "why."

Correlational Research: Measures the relationship between two variables. A positive correlation means variables increase together; negative means one increases as the other decreases. Important: correlation does NOT imply causation. A classic example — ice cream sales correlate with drowning rates, but ice cream doesn't cause drowning (both are caused by hot weather).

Experimental Research: The gold standard for establishing causation. Researchers manipulate an independent variable (IV) and measure its effect on a dependent variable (DV) while controlling extraneous variables. Random assignment to experimental and control groups eliminates pre-existing group differences.

Ethics in Research: The APA Ethics Code requires informed consent, right to withdraw, debriefing, and confidentiality. The Tuskegee Syphilis Study and Milgram Obedience experiments illustrate what happens when ethical protections are absent or insufficient.

KEY TERMS: empiricism, hypothesis, theory, variable, random assignment, replication, peer review, meta-analysis

DISCUSSION QUESTIONS
1. Why wasn't psychology accepted as a science immediately? What made behaviorism so appealing to early 20th-century researchers?
2. Can you think of a popular belief about human behavior that sounds plausible but hasn't been scientifically tested? How would you design a study to test it?
3. What are the ethical limits of psychological research? Should participants ever be deceived? Under what conditions?`
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Biological Bases of Behavior',
        materialType: 'lecture',
        content: `MODULE 2: BIOLOGICAL BASES OF BEHAVIOR
Neurons, Brain Structures, and Neurotransmitters

THE NEURON: THE BASIC UNIT OF THE NERVOUS SYSTEM
The human brain contains approximately 86 billion neurons — specialized cells that transmit information through electrical and chemical signals. Understanding neuron structure is foundational to understanding all psychology.

Neuron Anatomy:
- Dendrites: Branch-like extensions that receive signals from other neurons or sensory receptors.
- Cell Body (Soma): Contains the nucleus; integrates incoming signals.
- Axon: Long fiber that carries electrical impulses away from the cell body toward other neurons or muscles.
- Myelin Sheath: Fatty insulating layer around the axon that speeds signal transmission. Damage to myelin causes diseases like multiple sclerosis.
- Axon Terminals (Synaptic Knobs): Release neurotransmitters into the synapse.

The Action Potential: When a neuron receives sufficient stimulation it "fires," generating an all-or-none electrical impulse (action potential) that travels down the axon. Stronger stimuli produce more frequent firing, not bigger impulses.

Synaptic Transmission: At the synapse, the electrical signal triggers release of neurotransmitters from vesicles in the axon terminal. These chemicals cross the synaptic gap and bind to receptors on the next neuron's dendrites. Reuptake recycles unused neurotransmitters back into the sending neuron. Most antidepressants (SSRIs) work by blocking reuptake, leaving more serotonin in the synapse.

KEY NEUROTRANSMITTERS
- Acetylcholine (ACh): Muscle movement, memory formation. Low ACh is linked to Alzheimer's disease.
- Dopamine: Movement, reward, motivation, and attention. Parkinson's disease involves dopamine-producing cell death; schizophrenia involves excess dopamine activity in some pathways.
- Serotonin: Mood regulation, sleep, appetite. Low serotonin linked to depression.
- Norepinephrine: Alertness and arousal; fight-or-flight response.
- GABA (gamma-aminobutyric acid): Primary inhibitory neurotransmitter; reduces neural activity. Alcohol enhances GABA activity.
- Glutamate: Primary excitatory neurotransmitter; involved in learning and memory.
- Endorphins: Natural opiates released during pain or vigorous exercise; produce feelings of well-being ("runner's high").

THE BRAIN: MAJOR STRUCTURES AND FUNCTIONS
The brain is organized in an evolutionary hierarchy from oldest to newest structures:

Brainstem (oldest):
- Medulla: Controls automatic survival functions — breathing, heart rate, blood pressure.
- Pons: Coordinates movement and relays signals between cerebrum and cerebellum.
- Reticular Formation: Arousal and alertness; filters sensory input.

Cerebellum: Coordinates balance and fine motor movements; also involved in procedural memory. Alcohol impairs cerebellum function, causing stumbling.

Limbic System (emotional brain):
- Thalamus: The brain's "switchboard" — relays sensory information to the cortex (except smell).
- Hypothalamus: Regulates hunger, thirst, body temperature, sexual behavior, and the endocrine system. Controls the pituitary gland.
- Amygdala: Processes fear and aggression; links memories to emotions. Stimulation causes fear responses; damage causes fearlessness.
- Hippocampus: Critical for forming new long-term memories. Patient H.M. (Henry Molaison), who had his hippocampus removed to treat epilepsy, could no longer form new explicit memories — a landmark case in neuroscience.

Cerebral Cortex (newest, most human):
- Frontal Lobe: Planning, decision-making, impulse control, language production (Broca's area). Damage causes personality changes (Phineas Gage case).
- Parietal Lobe: Sensory processing (touch, position, pain). Contains the somatosensory cortex.
- Occipital Lobe: Visual processing. Damage can cause blindness even with intact eyes.
- Temporal Lobe: Hearing, language comprehension (Wernicke's area), memory.

NEUROPLASTICITY
The brain can reorganize itself by forming new neural connections — especially following injury. London taxi drivers develop larger hippocampi from learning complex street maps, demonstrating that experience physically changes the brain.

DISCUSSION QUESTIONS
1. How does understanding neurotransmitter function help explain why certain drugs are addictive?
2. What does the case of Phineas Gage (frontal lobe injury changed his personality) tell us about the relationship between brain and identity?
3. If the brain is plastic and changeable, what does this imply about the nature vs. nurture debate in psychology?`
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Sensation and Perception',
        materialType: 'lecture',
        content: `MODULE 3: SENSATION AND PERCEPTION
How We Process Sensory Input and Construct Reality

SENSATION VS. PERCEPTION
These two concepts are related but distinct. Sensation is the process by which sensory receptors detect physical stimuli from the environment — light waves, sound waves, chemicals, pressure. Perception is the brain's process of organizing and interpreting that raw sensory data into meaningful experiences. The same sensory input can be perceived differently by different people or by the same person in different contexts.

SENSORY THRESHOLDS
- Absolute Threshold: The minimum stimulus intensity detectable 50% of the time. Below this level, we don't consciously register the stimulus.
- Difference Threshold (Just Noticeable Difference / JND): The minimum change in stimulus intensity needed to detect a difference 50% of the time.
- Weber's Law: The JND is a constant proportion of the original stimulus. To notice a weight increase, you must add about 2% regardless of whether the original weight is 1 kg or 100 kg.
- Signal Detection Theory: Our ability to detect a weak stimulus is influenced not just by its intensity but by our psychological state — expectations, motivation, fatigue. A radiologist who is tired may miss a tumor (signal) that would be obvious when alert.

VISION
Light enters the eye through the cornea, is focused by the lens onto the retina at the back of the eye. The retina contains two types of photoreceptors:
- Rods: 120 million per eye; detect light/dark and movement; used in dim light and peripheral vision. No color.
- Cones: 6 million per eye; concentrated in the fovea (central area); detect color and fine detail; require bright light.

Feature detectors in the visual cortex (discovered by Hubel and Wiesel) respond to specific features — edges, angles, movement — and feed information to two visual pathways: the "what" pathway (temporal lobe, identifies objects) and the "where/how" pathway (parietal lobe, locates objects in space and guides movement).

Color Vision: The trichromatic theory proposes three types of cones sensitive to red, green, and blue. The opponent-process theory explains why we see color afterimages — opponent pairs (red-green, blue-yellow, black-white) work in opposition. Both theories together explain human color vision fully.

HEARING
Sound waves (variations in air pressure) enter the ear canal, vibrate the eardrum, move three ossicles (malleus, incus, stapes), and create waves in the fluid-filled cochlea. Hair cells on the basilar membrane convert these waves into neural signals sent to the auditory cortex via the auditory nerve.

- Frequency (Hz) = pitch perception. Place theory: different areas of the basilar membrane respond to different frequencies. Frequency theory: for low tones, the whole membrane vibrates at the frequency of the sound.
- Amplitude (decibels) = loudness. Prolonged exposure above 85 dB causes permanent hair cell damage.

PERCEPTUAL ORGANIZATION
The brain actively organizes sensation according to Gestalt principles:
- Figure-Ground: We perceive objects (figure) against a background (ground).
- Proximity: Things close together are perceived as groups.
- Similarity: Similar items are grouped together.
- Closure: We fill in gaps to see complete objects.
- Continuity: We follow smooth lines rather than abrupt changes.

Depth Perception relies on binocular cues (retinal disparity between two eyes) and monocular cues (linear perspective, relative size, interposition, texture gradient, motion parallax).

Perceptual Set: Our expectations, experiences, and context shape what we perceive. A blur in a medical image may be perceived as an anomaly by an expert but ignored by a novice — the same sensation, different perception.

DISCUSSION QUESTIONS
1. What is the practical implication of signal detection theory for professions like air traffic control or medical diagnosis?
2. How do Gestalt principles explain why optical illusions fool us even when we know what's happening?
3. Describe a situation in your own experience where your perceptual set led you to misinterpret something.`
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Learning and Memory',
        materialType: 'lecture',
        content: `MODULE 4: LEARNING AND MEMORY
Classical Conditioning, Operant Conditioning, and Memory Models

LEARNING DEFINED
Learning is a relatively permanent change in behavior or mental processes due to experience. Psychologists distinguish between:
- Behavioral learning: Changes in observable behavior through conditioning
- Cognitive learning: Changes in mental representations, including observational learning

CLASSICAL CONDITIONING (Ivan Pavlov)
Pavlov discovered classical conditioning accidentally while studying dog digestion. He noticed that dogs began salivating before food was presented — in response to cues associated with food (the sound of a metronome).

Key Terms:
- Unconditioned Stimulus (UCS): Stimulus that naturally triggers a response (food).
- Unconditioned Response (UCR): Natural, unlearned response to UCS (salivation to food).
- Conditioned Stimulus (CS): Neutral stimulus that, after repeated pairing with UCS, comes to trigger a response (metronome sound).
- Conditioned Response (CR): Learned response to the CS (salivation to metronome alone).

Processes:
- Acquisition: The initial learning phase when CS–UCS pairings are reinforced.
- Extinction: The CR weakens when CS is presented repeatedly without UCS. The association is suppressed, not erased.
- Spontaneous Recovery: After extinction, the CR can reappear after a rest period.
- Generalization: Responding to stimuli similar to the CS (Watson's "Little Albert" experiment — fear generalized from white rat to all white fluffy objects).
- Discrimination: Learned distinction between stimuli — responding only to the CS, not similar stimuli.

Classical conditioning explains many emotional responses: phobias, food aversions, advertising associations (product paired with attractive people), and PTSD triggers.

OPERANT CONDITIONING (B.F. Skinner)
Unlike classical conditioning (which involves reflexive responses), operant conditioning involves voluntary behaviors shaped by consequences. Thorndike's Law of Effect: behaviors followed by satisfying consequences are repeated; behaviors followed by unpleasant consequences are not.

Reinforcement strengthens behavior:
- Positive Reinforcement: Adding a desirable stimulus (praise, money, food) after a behavior.
- Negative Reinforcement: Removing an aversive stimulus (taking aspirin removes headache pain, reinforcing aspirin-taking). Note: negative reinforcement is NOT punishment — it INCREASES behavior.

Punishment weakens behavior:
- Positive Punishment: Adding an aversive stimulus (detention, a scolding).
- Negative Punishment: Removing a desirable stimulus (taking away video games).

Schedules of Reinforcement determine how often behavior is reinforced:
- Continuous Reinforcement: Every response is reinforced. Fastest acquisition, fastest extinction.
- Fixed Ratio: Reinforcement after a set number of responses (piecework pay). High response rates with pauses after reinforcement.
- Variable Ratio: Reinforcement after an unpredictable number of responses (slot machines). Highest, most persistent response rates. Most resistant to extinction.
- Fixed Interval: Reinforcement after a set time period (weekly paycheck). Slow responding early, fast near the interval end.
- Variable Interval: Reinforcement after unpredictable time intervals (checking email). Moderate, steady responding.

MEMORY MODELS
The Atkinson-Shiffrin Three-Stage Model proposes that information flows through three memory stores:
1. Sensory Memory: Briefly holds exact sensory impressions (iconic memory for vision ~0.5 sec; echoic memory for sound ~3-4 sec). High capacity, very brief duration.
2. Short-Term Memory (Working Memory): Holds 7 ± 2 chunks of information for about 20 seconds without rehearsal. Baddeley's working memory model adds a central executive, phonological loop, visuospatial sketchpad, and episodic buffer.
3. Long-Term Memory: Essentially unlimited capacity and very long duration. Divided into explicit (declarative) memory — episodic (personal events) and semantic (facts) — and implicit (non-declarative) memory — procedural skills and conditioned responses.

Encoding: Information moves from working to long-term memory via elaborative rehearsal (connecting new information to existing knowledge), spaced practice (distributed learning beats massed cramming), and the testing effect (self-testing improves retention more than re-reading).

Forgetting: Ebbinghaus's forgetting curve shows rapid initial forgetting that levels off over time. Causes include decay (fading), interference (proactive: old memories disrupt new; retroactive: new memories disrupt old), and retrieval failure (tip-of-tongue states).

DISCUSSION QUESTIONS
1. A student only studies the night before an exam (massed practice). Based on memory research, what should she do differently to improve retention?
2. How could a therapist use principles of classical conditioning to treat a specific phobia?
3. Why are variable ratio schedules so powerful and potentially problematic (think: social media notifications, gambling)?`
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Social Psychology',
        materialType: 'lecture',
        content: `MODULE 5: SOCIAL PSYCHOLOGY
Conformity, Persuasion, and Group Dynamics

WHAT IS SOCIAL PSYCHOLOGY?
Social psychology examines how the presence, behavior, and thoughts of others (real, imagined, or implied) influence our behavior, attitudes, and cognitions. It bridges individual psychology and sociology.

SOCIAL INFLUENCE: CONFORMITY
Solomon Asch's Line Studies (1951) demonstrated the power of conformity. Participants were shown a reference line and asked to match it to one of three comparison lines — an obvious task. When confederates unanimously gave the wrong answer, 75% of real participants conformed at least once, and 37% of responses overall were conforming. Conformity was reduced when even one other dissenter was present.

Normative Social Influence: Conforming to gain approval and avoid rejection. We want to fit in (informational). Informational Social Influence: Conforming because we believe others have more accurate information. In ambiguous situations, we look to others for guidance.

OBEDIENCE TO AUTHORITY
Stanley Milgram's Obedience Experiments (1961) remain the most influential and controversial studies in psychology. Participants believed they were delivering escalating electric shocks (15–450 V, labeled "Danger: Severe Shock") to a learner who made errors. The learner was a confederate; no shocks were actually delivered. Despite protests and apparent pain from the learner, 65% of participants delivered the maximum 450 V shock when an authority figure (experimenter in lab coat) told them to continue.

Factors increasing obedience: authority figure present and perceived as legitimate, victim not visible, prestige of institution, gradual escalation (foot-in-the-door).

ATTITUDES AND PERSUASION
Attitudes are evaluations of people, objects, or ideas that have cognitive (beliefs), affective (emotional), and behavioral components.

Cognitive Dissonance (Leon Festinger): When our behaviors and attitudes are inconsistent, we experience psychological discomfort. We resolve it by changing the attitude to match the behavior. Classic study: participants paid $1 (vs. $20) to lie about a boring task rated the task more favorably afterward — the $1 group needed to justify their behavior.

Elaboration Likelihood Model of Persuasion:
- Central Route: Careful, thoughtful consideration of arguments. Used when motivation and ability to process are high. Attitude change is durable.
- Peripheral Route: Relies on surface cues — attractiveness of speaker, length of message, background music. Used when motivation or ability is low. Attitude change is shallow and temporary.

Persuasion techniques: Foot-in-the-door (small request leads to bigger request compliance), door-in-the-face (large request refused, then smaller request accepted), and scarcity appeals.

GROUP DYNAMICS
Social Facilitation: The presence of others improves performance on well-learned tasks but impairs performance on novel or complex tasks. Explanation: arousal from others' presence enhances the dominant response.

Social Loafing: In group tasks, individuals reduce effort when their contributions are not individually evaluated. This is reduced by assigning identifiable individual roles.

Groupthink: Desire for harmony in a cohesive group overrides realistic appraisal of alternatives. Symptoms include illusion of invulnerability, collective rationalization, self-censorship, and pressure on dissenters. Classic examples: Bay of Pigs invasion, Challenger launch decision.

Deindividuation: Loss of self-awareness and restraint in groups or crowds, often facilitated by anonymity. People behave in ways inconsistent with their personal values (riots, online harassment).

Group Polarization: Deliberation in like-minded groups pushes attitudes toward more extreme positions — discussion amplifies the initial leaning.

PROSOCIAL BEHAVIOR AND THE BYSTANDER EFFECT
John Darley and Bibb Latané's bystander experiments showed that the probability of helping decreases as the number of bystanders increases. Two processes explain this:
- Diffusion of Responsibility: Each person feels less personally responsible when others are present.
- Pluralistic Ignorance: Each person looks to others for cues; seeing others not helping, everyone assumes the situation is not an emergency.

DISCUSSION QUESTIONS
1. The Milgram study has been criticized on ethical grounds but also praised for revealing important truths. Should this research have been conducted? What safeguards would make similar research acceptable today?
2. Have you ever experienced cognitive dissonance? How did you resolve it — by changing your attitude or your behavior?
3. How can understanding groupthink help organizations make better decisions?`
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Psychological Disorders',
        materialType: 'lecture',
        content: `MODULE 6: PSYCHOLOGICAL DISORDERS
DSM Overview, Anxiety, Mood, and Personality Disorders

DEFINING PSYCHOLOGICAL DISORDERS
A psychological disorder is a syndrome characterized by clinically significant disturbance in cognition, emotion regulation, or behavior that reflects a dysfunction in the psychological, biological, or developmental processes underlying mental functioning. The "4 Ds" framework helps define disorder: Deviance (unusual), Distress (causes suffering), Dysfunction (impairs daily life), Danger (risk to self or others). Behavior must be considered in cultural context — what is deviant in one culture may be normative in another.

THE DIAGNOSTIC AND STATISTICAL MANUAL (DSM)
The DSM-5-TR (Text Revision, 2022) is the primary diagnostic reference in the United States, published by the American Psychiatric Association. It lists criteria for over 300 disorders organized by category. Important features:
- Categorical, symptom-based diagnosis (not etiological)
- Multi-axial structure replaced by dimensional specifiers in DSM-5
- Cultural considerations integrated throughout
- ICD-11 (International Classification of Diseases) is the WHO counterpart used globally

ANXIETY DISORDERS
Anxiety disorders share excessive fear (response to immediate threat) and anxiety (anticipation of future threat). They are the most prevalent mental health category.

- Generalized Anxiety Disorder (GAD): Persistent, uncontrollable worry about multiple domains (work, health, finances) for 6+ months. Physical symptoms include muscle tension and sleep disturbance.
- Panic Disorder: Recurrent unexpected panic attacks — intense surges of fear with physical symptoms (pounding heart, shortness of breath, chest pain). Followed by persistent worry about more attacks.
- Specific Phobia: Intense fear of a specific object/situation (spiders, heights, blood) disproportionate to actual danger. Avoidance behavior maintains the phobia.
- Social Anxiety Disorder: Fear of social scrutiny and humiliation in social situations. Distinct from normal shyness by its severity and impairment.
- Obsessive-Compulsive Disorder (OCD): Intrusive, unwanted obsessions (contamination, harm) paired with compulsive rituals (handwashing, checking) performed to reduce anxiety. Now in its own DSM chapter.
- Post-Traumatic Stress Disorder (PTSD): Following exposure to actual/threatened death, serious injury, or sexual violence. Symptoms: intrusive memories/flashbacks, avoidance, negative cognitions, hyperarousal. Persists 1+ month.

MOOD DISORDERS
- Major Depressive Disorder (MDD): 5+ symptoms for 2+ weeks including depressed mood or loss of interest plus changes in sleep, appetite, energy, concentration, self-worth, and possible suicidal ideation. Leading cause of disability worldwide. Diathesis-stress model: genetic vulnerability + environmental stressors.
- Persistent Depressive Disorder (Dysthymia): Chronic, less severe depressed mood for 2+ years.
- Bipolar I Disorder: At least one manic episode (elevated/irritable mood, inflated self-esteem, decreased need for sleep, racing thoughts, impulsive behavior) lasting 7+ days, severe enough to impair functioning or require hospitalization. Depressive episodes also common.
- Bipolar II: Hypomanic episodes (less severe than mania) plus depressive episodes. No full manic episodes.

SCHIZOPHRENIA SPECTRUM DISORDERS
Schizophrenia is characterized by positive symptoms (excesses — hallucinations, delusions, disorganized speech/behavior) and negative symptoms (deficits — flat affect, alogia, avolition). Onset typically in late adolescence/early adulthood. Strong genetic component; dopamine hypothesis: excess dopamine activity in mesolimbic pathway.

PERSONALITY DISORDERS
Enduring, inflexible patterns of inner experience and behavior deviating markedly from cultural expectations, causing distress or impairment. Three clusters:
- Cluster A (Odd/Eccentric): Paranoid, Schizoid, Schizotypal
- Cluster B (Dramatic/Emotional): Antisocial, Borderline, Histrionic, Narcissistic
- Cluster C (Anxious/Fearful): Avoidant, Dependent, Obsessive-Compulsive

Borderline Personality Disorder: Marked instability in relationships, self-image, and emotions; impulsivity; intense fear of abandonment. DBT (Dialectical Behavior Therapy) is the evidence-based treatment.
Antisocial Personality Disorder: Pervasive disregard for others' rights; deceitfulness, impulsivity, lack of remorse. Diagnosed only in adults 18+; conduct disorder precedes it in childhood.

TREATMENT OVERVIEW
- Psychotherapy: CBT (cognitive-behavioral therapy) is evidence-based for anxiety and depression. Exposure therapy for phobias. DBT for BPD. Psychodynamic therapy for insight.
- Biological treatments: Antidepressants (SSRIs, SNRIs), antipsychotics (block dopamine), mood stabilizers (lithium for bipolar), anxiolytics (benzodiazepines — short-term), ECT and TMS for treatment-resistant depression.

DISCUSSION QUESTIONS
1. Why is it important to consider cultural context when diagnosing psychological disorders? Give an example where cultural norms could affect diagnosis.
2. What is the difference between the fear experienced in a specific phobia vs. the anxiety in GAD?
3. How does the diathesis-stress model explain why not everyone who experiences trauma develops PTSD?`
      },
      {
        moduleNumber: 8,
        title: 'Research Paper Rubric',
        materialType: 'rubric',
        content: `PSY 100 RESEARCH PAPER RUBRIC
Assignment: Research Paper (15% of course grade)
Total Points: 100 points
Length: 5–7 pages, APA format, minimum 5 peer-reviewed sources

GRADING CRITERIA

1. THESIS AND ARGUMENT CLARITY (20 points)
- 18–20 pts (Excellent): Thesis is specific, arguable, and consistently supported throughout the paper. The central argument is clear from introduction to conclusion.
- 14–17 pts (Good): Thesis is present and mostly clear; occasional drift from central argument.
- 10–13 pts (Adequate): Thesis is vague or overly broad; paper partially addresses the topic.
- 0–9 pts (Inadequate): No clear thesis; paper is a summary without argument.

2. USE OF PSYCHOLOGICAL EVIDENCE (25 points)
- 22–25 pts (Excellent): Integrates 5+ peer-reviewed sources skillfully; evidence directly supports claims; accurately represents study findings and limitations.
- 17–21 pts (Good): Uses required sources; most evidence is relevant; minor inaccuracies in representing research.
- 12–16 pts (Adequate): Sources are present but weakly integrated; some evidence is tangential or misrepresented.
- 0–11 pts (Inadequate): Fewer than 5 peer-reviewed sources; heavy reliance on websites or textbook alone.

3. APPLICATION OF COURSE CONCEPTS (25 points)
- 22–25 pts (Excellent): Demonstrates deep understanding of relevant psychological theory/concepts; applies them accurately to the paper's topic with original insight.
- 17–21 pts (Good): Applies course concepts correctly; some depth lacking.
- 12–16 pts (Adequate): Concepts mentioned but surface-level; definitions without application.
- 0–11 pts (Inadequate): Psychological concepts absent, incorrect, or irrelevant.

4. APA FORMAT AND CITATIONS (15 points)
- 13–15 pts (Excellent): Correct APA 7th edition throughout — in-text citations, reference list, title page, running head if required. No formatting errors.
- 10–12 pts (Good): Minor APA errors (punctuation, formatting); reference list mostly correct.
- 7–9 pts (Adequate): Multiple APA errors; some sources missing from reference list or cited inconsistently.
- 0–6 pts (Inadequate): APA largely ignored; no reference list or pervasive citation errors.

5. WRITING QUALITY AND ORGANIZATION (15 points)
- 13–15 pts (Excellent): Clear paragraph structure; logical flow from introduction through conclusion; professional academic tone; minimal grammatical errors.
- 10–12 pts (Good): Generally well-organized; a few transitions weak; minor grammar issues.
- 7–9 pts (Adequate): Organization problems affect readability; frequent grammar/spelling errors.
- 0–6 pts (Inadequate): Difficult to follow; pervasive errors undermine communication.

PENALTIES
- Late submissions: –10 points per day (including weekends)
- Papers not submitted on Canvas: not accepted
- Evidence of plagiarism or AI-generated text: automatic zero; academic integrity referral

Topic approval must be submitted by end of Week 9 for feedback before writing begins.`
      }
    ]
  },

  // ────────────────────────────────────────────────
  // ACC-201-STARTER — Financial Accounting
  // Gatton College of Business and Economics
  // ────────────────────────────────────────────────
  {
    courseCode: 'ACC-201-STARTER',
    title: 'Financial Accounting',
    description: 'An introduction to financial accounting principles and the preparation of financial statements. Students learn the accounting equation, double-entry bookkeeping, and how to read and analyze income statements, balance sheets, and cash flow statements.',
    college: 'Gatton College of Business and Economics',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `ACC 201 — Financial Accounting
Gatton College of Business and Economics, University of Kentucky
Spring 2026 | TR 9:30–10:45 AM | Gatton Business & Economics Building 101

INSTRUCTOR
Dr. Katie Thompson, Department of Accountancy
Office: Gatton B&E 340
Office Hours: Tuesday & Thursday 11:00 AM–12:30 PM; Monday 2:00–3:00 PM (Zoom)
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
ACC 201 introduces financial accounting — the language of business. Students learn to record economic events using double-entry bookkeeping, prepare and interpret the four primary financial statements, and apply basic financial analysis. Prerequisite: None (MTH 109 recommended).

REQUIRED MATERIALS
- Kimmel, P. D., Weygandt, J. J., & Kieso, D. E. (2022). Financial Accounting: Tools for Business Decision Making (10th ed.). Wiley. ISBN: 978-1119493631
- Scientific or financial calculator (NOT programmable; cell phones not permitted on exams)
- Access to WileyPLUS online homework system (access code bundled with new textbook or purchased separately)

GRADING BREAKDOWN
Exam 1 (Week 5)                   20%
Exam 2 (Week 10)                  20%
Final Exam (Week 15, cumulative)  20%
Homework via WileyPLUS (14 sets)  20%
Group Financial Analysis Project  20%
TOTAL                            100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM INFORMATION
There are three exams in this course:
- Exam 1 (Week 5, Tuesday): Covers Modules 1–2 (accounting equation, journal entries, T-accounts, trial balance)
- Exam 2 (Week 10, Tuesday): Covers Modules 3–4 (income statement, balance sheet, adjusting entries, closing entries)
- Final Exam (Week 15, Tuesday of finals week): Comprehensive, covering all modules, with emphasis on Modules 5–6 (cash flows, internal controls)

Exam Format: Each exam is 75 minutes, closed-book, closed-note. Problems include journal entries, T-account preparation, and a multi-part financial statement problem. A scientific or financial calculator (non-programmable) is permitted. Cell phones and smartwatches are NOT permitted as calculators. Any student using an electronic device other than an approved calculator during an exam will receive a zero.

WEEKLY SCHEDULE
Week 1  — Introduction: The role of accounting, the accounting equation (Assets = Liabilities + Equity), types of business entities
Week 2  — Recording Transactions: Debits and credits, journal entries, posting to T-accounts
Week 3  — The Trial Balance: Preparing and using trial balance; types of accounts; normal balances
Week 4  — Adjusting Entries: Accruals and deferrals; prepaid expenses, unearned revenue, accrued revenues and expenses
Week 5  — EXAM 1 (Tuesday) + The Adjusted Trial Balance: preparing financial statements from adjusted trial balance
Week 6  — The Income Statement: Revenue recognition, expense matching, gross profit, operating income, net income
Week 7  — The Balance Sheet: Current vs. non-current assets and liabilities; stockholders' equity section
Week 8  — Closing Entries and the Post-Closing Trial Balance; completing the accounting cycle
Week 9  — Merchandising Operations: Inventory systems, cost of goods sold, gross profit analysis
Week 10 — EXAM 2 (Tuesday) + Cash Flow Statements: Introduction and purpose
Week 11 — Cash Flow Statements: Operating (indirect method), investing, financing activities
Week 12 — Financial Statement Analysis: Liquidity, profitability, and solvency ratios (Group Project work session)
Week 13 — Internal Controls: Control environment, COSO framework, Sarbanes-Oxley basics
Week 14 — Ethics in Accounting: Fraud triangle, Enron/WorldCom case studies; whistleblower protections (Group Project due end of Week 14)
Week 15 — Review for Final Exam; FINAL EXAM during finals period

HOMEWORK
Fourteen WileyPLUS homework sets correspond to each week's reading. Each set is due by 11:59 PM on Sunday of the assigned week. No late homework accepted; the lowest two scores are dropped from the final calculation.

CALCULATOR POLICY
A scientific or financial calculator is required and permitted on all exams. Programmable calculators, graphing calculators, and any device that can store text or access the internet are NOT permitted. You must bring your own calculator; sharing calculators during exams is not allowed.

GROUP FINANCIAL ANALYSIS PROJECT (20%)
Students form groups of 3–4 in Week 2. Groups select a publicly traded company from an approved list, analyze 3 years of financial statements, compute financial ratios, and present findings. Written report due end of Week 14; 10-minute group presentation in Week 14 lab section. See separate Project Guidelines handout on Canvas.

LATE HOMEWORK POLICY
WileyPLUS homework cannot be submitted after the deadline — the system closes automatically. No exceptions. Two lowest scores are dropped to account for emergencies.

OFFICE HOURS
Tuesday & Thursday 11:00 AM–12:30 PM in Gatton B&E 340
Monday 2:00–3:00 PM via Zoom: https://uky.zoom.us/j/placeholder
Additional appointment hours available by email request.

ACADEMIC INTEGRITY
All exam work must be entirely your own. Sharing exam content with students who have not yet taken the exam is an honor code violation. Group project work must represent genuine group contribution; each member signs an individual contribution statement.`
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Accounting Equation',
        materialType: 'lecture',
        content: `MODULE 1: THE ACCOUNTING EQUATION
Assets, Liabilities, and Equity — The Foundation of All Accounting

THE PURPOSE OF ACCOUNTING
Financial accounting exists to provide decision-useful information to external users — investors, creditors, regulators, and the public. The primary outputs are financial statements that summarize an entity's economic activity. Management accounting (a separate course) focuses on internal decision-making. This course covers financial accounting as governed by Generally Accepted Accounting Principles (GAAP) in the U.S., set by the Financial Accounting Standards Board (FASB).

THE FUNDAMENTAL ACCOUNTING EQUATION
Every transaction in accounting traces back to one foundational equation:

  ASSETS = LIABILITIES + STOCKHOLDERS' EQUITY

This equation must always balance. It is not a formula you memorize and forget — it is the logical structure underlying every journal entry, every financial statement, and every auditor's check.

Definitions:
- Assets: Economic resources owned or controlled by the entity that are expected to provide future economic benefit. Examples: cash, accounts receivable, inventory, equipment, land, patents.
- Liabilities: Obligations of the entity to transfer assets or provide services to others in the future. Examples: accounts payable, notes payable (loans), wages payable, unearned revenue, bonds payable.
- Stockholders' Equity: The owners' residual interest in the assets after all liabilities are paid. For a corporation: Common Stock + Additional Paid-in Capital + Retained Earnings (cumulative profits not distributed as dividends).

The Equity Equation:
Stockholders' Equity = Paid-in Capital + Retained Earnings
Retained Earnings = Beginning Retained Earnings + Net Income – Dividends

TYPES OF BUSINESS TRANSACTIONS
Transactions are economic events that affect the accounting equation. Each transaction affects at least two elements (double-entry accounting). Types:
1. Asset Exchange: One asset increases, another decreases (buy equipment with cash). Totals unchanged.
2. Asset/Liability Change: Asset increases AND liability increases (buy inventory on credit).
3. Asset/Equity Change: Asset increases AND equity increases (issue stock for cash); or asset decreases AND equity decreases (pay dividends).
4. Liability/Equity Change: Liability decreases AND equity increases (pay off a loan using earnings).

WORKED EXAMPLE: Transaction Analysis
Scenario: Wildcat Consulting, Inc. is formed on January 1.
Transaction 1: Owners invest $50,000 cash for common stock.
  → Cash (Asset) +$50,000 | Common Stock (Equity) +$50,000
  → Equation: $50,000 = $0 + $50,000 ✓

Transaction 2: Borrow $20,000 from First Bank.
  → Cash (Asset) +$20,000 | Notes Payable (Liability) +$20,000
  → Equation: $70,000 = $20,000 + $50,000 ✓

Transaction 3: Purchase office equipment for $15,000 cash.
  → Equipment (Asset) +$15,000 | Cash (Asset) –$15,000
  → Equation: $70,000 = $20,000 + $50,000 ✓ (total assets unchanged)

Transaction 4: Provide consulting services for $8,000 cash.
  → Cash (Asset) +$8,000 | Revenue → Retained Earnings (Equity) +$8,000
  → Equation: $78,000 = $20,000 + $58,000 ✓

Transaction 5: Pay $3,000 for rent expense.
  → Cash (Asset) –$3,000 | Expenses → Retained Earnings (Equity) –$3,000
  → Equation: $75,000 = $20,000 + $55,000 ✓

Notice: The equation always balances. If it doesn't, an error has been made.

TYPES OF ACCOUNTS
Permanent (Balance Sheet) Accounts: Assets, Liabilities, Equity — carry forward from period to period.
Temporary (Income Statement) Accounts: Revenues, Expenses — reset to zero each period by closing entries; their net effect flows into Retained Earnings.

GAAP AND BUSINESS ENTITY ASSUMPTION
The Business Entity Assumption states that a business's financial records must be kept separate from the owner's personal finances. Other foundational GAAP concepts: Going Concern Assumption (entity will continue operating), Monetary Unit Assumption (record only items measurable in dollars), and the Time Period Assumption (economic activity reported in regular periods).

KEY TERMS: asset, liability, equity, retained earnings, transaction, GAAP, FASB, business entity assumption, going concern

DISCUSSION QUESTIONS
1. A sole proprietor uses her personal car 40% for business and 60% for personal use. How should the car be treated in the business's accounting records?
2. If the accounting equation always has to balance, does that mean a company with equal assets and liabilities is in good financial shape? Why or why not?
3. Why do accountants record unearned revenue (cash received before services are delivered) as a liability?`
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Recording Transactions',
        materialType: 'lecture',
        content: `MODULE 2: RECORDING TRANSACTIONS
Debits, Credits, Journal Entries, and T-Accounts

THE DOUBLE-ENTRY SYSTEM
Every transaction affects at least two accounts and the total debits must equal total credits. This is double-entry bookkeeping, developed in 15th-century Italy (Luca Pacioli, 1494) and still the universal system today. The beauty of double-entry is error detection: if debits ≠ credits, something is wrong.

DEBITS AND CREDITS DEFINED
Debit (Dr.): An entry on the LEFT side of an account.
Credit (Cr.): An entry on the RIGHT side of an account.

The effect of debits and credits depends on the account type:

Account Type       | Normal Balance | Debit Effect      | Credit Effect
-------------------|----------------|-------------------|---------------
Assets             | Debit          | Increase          | Decrease
Liabilities        | Credit         | Decrease          | Increase
Common Stock       | Credit         | Decrease          | Increase
Retained Earnings  | Credit         | Decrease          | Increase
Revenues           | Credit         | Decrease          | Increase
Expenses           | Debit          | Increase          | Decrease
Dividends          | Debit          | Increase          | Decrease

Memory aid: "DEAD CLIC" — Debits increase Expenses, Assets, Dividends; Credits increase Liabilities, Income (revenue), and Capital (equity).

T-ACCOUNTS
A T-account is a visual representation of a ledger account — left side for debits, right side for credits. The running balance is computed after all entries.

Example T-Account for Cash:
        Cash
  Debit | Credit
  ------+-------
  50,000| 15,000
  20,000|  3,000
   8,000|
  ------+-------
  Balance: 60,000 (debit balance)

THE JOURNAL ENTRY FORMAT
Transactions are first recorded in the general journal in chronological order, then posted to individual ledger accounts (T-accounts).

Standard journal entry format:
Date | Account Title | Debit | Credit

The debited account is listed first; the credited account is indented below.

WORKED EXAMPLES

Example 1: Provide services on account (not yet paid)
Jan 10: Services provided to client on credit, $5,000

  Accounts Receivable    5,000
    Service Revenue              5,000
  (To record services provided on account)

Analysis: Asset (Accounts Receivable) increases → debit. Revenue increases → credit.

Example 2: Collect cash on the account
Jan 25: Received $5,000 from client in Example 1

  Cash                   5,000
    Accounts Receivable          5,000
  (To record collection of accounts receivable)

Analysis: Cash (asset) increases → debit. Accounts Receivable (asset) decreases → credit. No revenue recorded here — revenue was already recognized in Example 1.

Example 3: Pay employee wages
Jan 31: Paid wages of $4,000

  Wages Expense          4,000
    Cash                         4,000
  (To record payment of wages)

Analysis: Expense increases → debit. Cash (asset) decreases → credit.

POSTING TO THE LEDGER
After journalizing, each debit and credit is posted to the corresponding T-account. The trial balance lists all account balances and verifies debits = credits.

COMPOUND ENTRIES
Some transactions affect more than two accounts. A compound entry can have multiple debits or multiple credits, as long as total debits = total credits.

Example: Wildcat Corp purchases $10,000 of equipment, paying $4,000 cash and financing the rest with a note.
  Equipment              10,000
    Cash                          4,000
    Notes Payable                 6,000

COMMON ERRORS IN JOURNALIZING
1. Transposition error: Writing $3,600 as $6,300 (divisible by 9 — dividing the difference by 9 and checking whether the result is a whole number often reveals transpositions).
2. Slide error: Writing $350 as $35 (also divisible by 9).
3. Wrong account: Debiting "Cash" when the transaction was on credit.
4. Missing entry: Recording only one side of the transaction.

DISCUSSION QUESTIONS
1. Why must every journal entry have equal debits and credits? What logical principle does this reflect?
2. A student memorized "debits are good, credits are bad." Why is this memorization strategy dangerous?
3. A company collects $12,000 cash in January for a 12-month service contract. Write the journal entry on collection day. Which accounts are affected?`
      },
      {
        moduleNumber: 4,
        title: 'Module 3: The Income Statement',
        materialType: 'lecture',
        content: `MODULE 3: THE INCOME STATEMENT
Revenues, Expenses, and Net Income

PURPOSE OF THE INCOME STATEMENT
The income statement (also called the statement of operations or profit and loss statement) reports a company's financial performance over a specific period of time — typically a quarter or a year. It answers the question: "Did the company earn a profit or suffer a loss during this period?"

Unlike the balance sheet (a snapshot at a point in time), the income statement covers a span of time: "For the year ended December 31, 2025" or "For the three months ended March 31, 2026."

KEY ACCOUNTING PRINCIPLES GOVERNING THE INCOME STATEMENT
Revenue Recognition Principle (ASC 606): Revenue is recognized when (or as) a company satisfies a performance obligation by transferring a promised good or service to a customer — not necessarily when cash is collected. A five-step model: (1) identify the contract, (2) identify performance obligations, (3) determine transaction price, (4) allocate price to obligations, (5) recognize revenue when obligation is satisfied.

Matching Principle (Expense Recognition): Expenses are recorded in the same period as the revenues they helped generate. Paying an employee wage in January that relates to January's revenue should be recorded in January — not in February when the check clears. This is the foundation of accrual accounting.

INCOME STATEMENT STRUCTURE (Multi-Step Format)
Net Sales (Revenues)
  – Cost of Goods Sold (COGS)
= Gross Profit
  – Operating Expenses (Selling, General & Administrative)
= Operating Income (EBIT — Earnings Before Interest and Taxes)
  – Interest Expense
  + Other Income/Expense
= Income Before Taxes
  – Income Tax Expense
= NET INCOME

Single-step format (simpler, less informative): Total Revenues – Total Expenses = Net Income

WORKED EXAMPLE
Wildcat Retail, Inc. — Income Statement for Year Ended December 31, 2025

Net Sales                              $500,000
Cost of Goods Sold                    (320,000)
                                      ---------
Gross Profit                           180,000
  Selling Expenses           45,000
  Administrative Expenses    30,000   (75,000)
                                      ---------
Operating Income                       105,000
  Interest Expense                     (8,000)
                                      ---------
Income Before Tax                       97,000
  Income Tax Expense (25%)            (24,250)
                                      ---------
Net Income                            $ 72,750

Gross Profit Margin = Gross Profit / Net Sales = $180,000 / $500,000 = 36%
Operating Profit Margin = Operating Income / Net Sales = $105,000 / $500,000 = 21%
Net Profit Margin = Net Income / Net Sales = $72,750 / $500,000 = 14.6%

EARNINGS PER SHARE (EPS)
Publicly traded companies must report EPS on the income statement.
Basic EPS = Net Income – Preferred Dividends / Weighted Average Common Shares Outstanding

If Wildcat Retail has 100,000 shares outstanding: EPS = $72,750 / 100,000 = $0.73 per share

ACCRUAL VS. CASH BASIS
Accrual basis: Revenue recognized when earned; expenses when incurred. Required by GAAP for public companies.
Cash basis: Revenue recognized when cash is received; expenses when cash is paid. Simpler but less accurate picture of economic performance. Allowed for small private companies.

Key Difference Example: A law firm does $50,000 of work in December 2025 but is paid in January 2026.
- Accrual basis: $50,000 revenue in December 2025 (when earned)
- Cash basis: $50,000 revenue in January 2026 (when collected)

DISCUSSION QUESTIONS
1. A software company receives $120,000 in January for a 12-month subscription (Jan–Dec). Under GAAP revenue recognition, how much revenue is recognized each month? Why?
2. Why might investors prefer the multi-step income statement over the single-step format?
3. If two companies have identical net income but different gross profit margins, what might that signal about their business models?`
      },
      {
        moduleNumber: 5,
        title: 'Module 4: The Balance Sheet',
        materialType: 'lecture',
        content: `MODULE 4: THE BALANCE SHEET
Reading and Interpreting Financial Position

PURPOSE AND STRUCTURE
The balance sheet (statement of financial position) reports a company's assets, liabilities, and stockholders' equity at a specific point in time. It is a snapshot, not a period report. The heading reads: "As of December 31, 2025."

The balance sheet reflects the fundamental accounting equation: Assets = Liabilities + Stockholders' Equity.

CLASSIFIED BALANCE SHEET STRUCTURE

ASSETS
Current Assets (expected to be converted to cash or used within one year):
  - Cash and Cash Equivalents
  - Short-term Investments (marketable securities)
  - Accounts Receivable (net of allowance for doubtful accounts)
  - Inventory
  - Prepaid Expenses

Non-Current Assets (held for longer than one year):
  - Long-Term Investments
  - Property, Plant & Equipment (PP&E) — listed at cost minus accumulated depreciation
  - Intangible Assets — patents, trademarks, goodwill (from acquisitions)
  - Other Long-Term Assets

LIABILITIES
Current Liabilities (due within one year):
  - Accounts Payable
  - Accrued Liabilities (wages payable, taxes payable, interest payable)
  - Unearned Revenue (cash received before service delivered)
  - Current Portion of Long-Term Debt

Non-Current Liabilities (due beyond one year):
  - Notes Payable (long-term)
  - Bonds Payable
  - Lease Liabilities
  - Deferred Tax Liabilities

STOCKHOLDERS' EQUITY
  - Common Stock (par value × shares issued)
  - Additional Paid-in Capital (APIC) — amount received above par value
  - Retained Earnings — cumulative net income less dividends since inception
  - Treasury Stock (deducted) — own shares repurchased

KEY FINANCIAL RATIOS FROM THE BALANCE SHEET
Working Capital = Current Assets – Current Liabilities
  Measures short-term liquidity. Positive = can meet short-term obligations.

Current Ratio = Current Assets / Current Liabilities
  Rule of thumb: 2:1 is healthy; below 1:1 is concerning.
  Example: CA = $200,000, CL = $80,000 → Current Ratio = 2.5

Quick Ratio (Acid-Test) = (Cash + Short-term Investments + Net Receivables) / Current Liabilities
  Stricter than current ratio; excludes inventory (less liquid).

Debt-to-Equity Ratio = Total Liabilities / Total Stockholders' Equity
  Measures financial leverage. Higher ratio = more debt financing = higher risk.

DEPRECIATION
Long-lived assets are not expensed immediately; their cost is allocated over their useful life through depreciation.
Straight-Line Method: (Cost – Salvage Value) / Useful Life = Annual Depreciation
Example: Equipment costing $50,000, salvage value $5,000, 5-year life:
  Annual depreciation = ($50,000 – $5,000) / 5 = $9,000/year
  On balance sheet: Equipment $50,000 less Accumulated Depreciation $9,000 = Net Book Value $41,000

INTERPRETING THE BALANCE SHEET — RED FLAGS
- Accounts receivable growing faster than sales: collection problems
- Inventory growing faster than sales: excess inventory, possible obsolescence
- Retained earnings deficit: accumulated losses since inception
- Very high debt-to-equity: risk of financial distress
- Goodwill impairment: acquired business worth less than paid

DISCUSSION QUESTIONS
1. A company has $500,000 in assets and $450,000 in liabilities. What is stockholders' equity? Is this company in good shape? What additional information would you want?
2. Why is accumulated depreciation subtracted on the balance sheet rather than reducing the original cost directly?
3. What does a current ratio below 1.0 mean? Is it always a sign of trouble?`
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Cash Flow Statements',
        materialType: 'lecture',
        content: `MODULE 5: CASH FLOW STATEMENTS
Operating, Investing, and Financing Activities

WHY CASH FLOW MATTERS
A profitable company (positive net income) can still fail if it runs out of cash. Enron reported strong profits for years before its collapse — its cash flows told a different story. The statement of cash flows reports cash inflows and outflows during a period, providing a more complete picture of liquidity than net income alone.

Key distinction: Net income (accrual basis) ≠ Cash flow from operations. A company that makes a large sale on credit recognizes revenue but has no cash yet.

THREE SECTIONS
Operating Activities: Cash flows from the company's core business activities — selling goods, providing services, paying employees and suppliers.
Investing Activities: Cash flows from acquiring/selling long-term assets (PP&E, investments in other companies).
Financing Activities: Cash flows from borrowing, repaying debt, issuing stock, paying dividends, and buying back stock.

INDIRECT METHOD (most common for operating activities)
Starts with net income and adjusts for:
1. Non-cash expenses added back: Depreciation, amortization (these reduced net income but required no cash outflow)
2. Changes in working capital:
   - Increase in current assets (except cash): subtract (used cash)
   - Decrease in current assets: add (freed up cash)
   - Increase in current liabilities: add (received cash or delayed payment)
   - Decrease in current liabilities: subtract (paid cash)

WORKED EXAMPLE — Indirect Method Operating Section
Net Income                                    $72,750
Adjustments:
  + Depreciation expense                       12,000
  + Decrease in accounts receivable             5,000
  – Increase in inventory                      (8,000)
  + Increase in accounts payable                3,000
  – Decrease in accrued liabilities            (2,000)
                                              --------
Net Cash Provided by Operating Activities    $82,750

INVESTING ACTIVITIES (direct method — actual cash flows)
  Purchase of equipment                      ($40,000)
  Sale of long-term investment                 15,000
Net Cash Used in Investing Activities        ($25,000)

FINANCING ACTIVITIES (direct method)
  Proceeds from issuing common stock           20,000
  Repayment of notes payable                 (30,000)
  Payment of dividends                       (10,000)
Net Cash Used in Financing Activities        ($20,000)

NET CHANGE IN CASH: $82,750 – $25,000 – $20,000 = $37,750
Beginning Cash Balance: $22,250
Ending Cash Balance: $60,000 (matches balance sheet cash)

INTERPRETING CASH FLOWS
Healthy Pattern: Positive operating cash flows, negative investing (growing), mixed financing.
Warning Signs:
- Consistently negative operating cash flows (core business isn't generating cash)
- Financing cash flows used to fund operations long-term (borrowing to cover operations)
- Large gap between net income and operating cash flows without explanation

Free Cash Flow = Operating Cash Flow – Capital Expenditures
= $82,750 – $40,000 = $42,750
Free cash flow represents cash available for dividends, debt repayment, or growth investments.

DISCUSSION QUESTIONS
1. A company reports net income of $100,000 but operating cash flow of only $10,000. What might explain this large discrepancy?
2. A startup has negative investing cash flows but positive operating and financing cash flows. Is this a good or bad sign? Explain.
3. Why do investors sometimes look at free cash flow rather than net income as a measure of company performance?`
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Internal Controls and Ethics',
        materialType: 'lecture',
        content: `MODULE 6: INTERNAL CONTROLS AND ETHICS
Fraud, the Sarbanes-Oxley Act, and Professional Responsibility

THE FRAUD TRIANGLE
The fraud triangle, developed by criminologist Donald Cressey, identifies three elements that must be present for occupational fraud to occur:
1. Pressure (Incentive): Financial or personal pressure motivating fraud — excessive debt, gambling addiction, pressure to meet earnings targets.
2. Opportunity: Weak internal controls that allow fraud to go undetected — lack of segregation of duties, poor oversight, excessive access.
3. Rationalization: The perpetrator's mental justification — "I'll pay it back," "I deserve this after they passed me over for promotion," "Everyone does it."

Remove any one element and fraud becomes far less likely. Internal controls primarily target opportunity.

TYPES OF OCCUPATIONAL FRAUD
The Association of Certified Fraud Examiners (ACFE) classifies fraud in three categories:
- Asset Misappropriation (85% of cases): Stealing cash, inventory, or other assets. Most common but typically lower dollar losses. Examples: skimming (cash stolen before recorded), larceny (cash stolen after recorded), fictitious vendor schemes.
- Financial Statement Fraud (10% of cases): Deliberately misrepresenting financial statements to mislead users — overstating revenues, understating expenses, hiding liabilities. Least common but highest median loss ($800,000+). Enron, WorldCom, Wirecard.
- Corruption (15% of cases): Bribery, conflicts of interest, bid rigging.

INTERNAL CONTROLS — COSO FRAMEWORK
The Committee of Sponsoring Organizations (COSO) Internal Control Framework identifies five components:
1. Control Environment: Tone at the top — management's attitude toward ethics and internal control.
2. Risk Assessment: Identifying and analyzing risks to financial reporting.
3. Control Activities: Specific policies and procedures that reduce risk. Key activities:
   - Segregation of Duties: Separating authorization, custody, and recordkeeping so no single person can commit and conceal fraud. A person who records cash receipts should not also have custody of cash.
   - Authorization Requirements: Supervisory approval for significant transactions.
   - Physical Controls: Safes, locks, access restrictions on IT systems.
   - Independent Verification: Reconciliations, audits, surprise counts.
   - Documentation Procedures: Pre-numbered documents, audit trail.
4. Information and Communication: Reliable financial reporting systems and open communication channels.
5. Monitoring: Ongoing assessment of control effectiveness; internal audit function.

SARBANES-OXLEY ACT (SOX, 2002)
Passed in response to Enron, WorldCom, and other accounting scandals, SOX dramatically changed corporate accountability:
- Section 302: CEO and CFO must personally certify the accuracy of financial reports. Criminal penalties (up to $5 million, 20 years imprisonment) for knowingly false certification.
- Section 404: Public companies must include management's assessment of internal control effectiveness in the annual report. External auditors must attest to this assessment. Compliance is expensive (millions of dollars annually for large companies) but provides assurance.
- PCAOB: Public Company Accounting Oversight Board created to oversee auditors of public companies. Before SOX, the accounting profession was self-regulated.
- Audit Committee Independence: Board audit committee must consist entirely of independent directors; at least one must be a financial expert.
- Whistleblower Protections: Employees who report fraud are protected from retaliation.

ETHICAL REASONING IN ACCOUNTING
The AICPA Code of Professional Conduct governs CPAs. Core principles:
- Integrity: Be honest and straightforward.
- Objectivity: No conflicts of interest.
- Independence: In fact and in appearance (auditors cannot have financial interests in audit clients).
- Due Care: Professional competence and diligence.

The Enron case illustrates what happens when all three fraud triangle elements converge at scale and when auditors (Arthur Andersen) fail their independence obligations.

DISCUSSION QUESTIONS
1. A small business owner handles all accounting herself and also signs all checks. What fraud risks does this create? What controls would you recommend?
2. Why did SOX include criminal penalties for CEOs and CFOs specifically, even if they didn't personally commit fraud?
3. Can strong internal controls prevent all fraud? What limitations exist even in well-controlled organizations?`
      },
      {
        moduleNumber: 8,
        title: 'Group Financial Analysis Project Rubric',
        materialType: 'rubric',
        content: `ACC 201 GROUP FINANCIAL ANALYSIS PROJECT RUBRIC
Assignment: Group Financial Analysis Project (20% of course grade)
Total Points: 100 points
Groups: 3–4 students, formed by Week 2

PROJECT REQUIREMENTS
Groups select one publicly traded company from the approved list on Canvas. The written report analyzes 3 years of financial statements (income statement, balance sheet, cash flow statement) and includes a financial ratio analysis with interpretation. A 10-minute group presentation is delivered in Week 14 lab section.

GRADING CRITERIA

1. FINANCIAL STATEMENT ANALYSIS — ACCURACY (30 points)
- 27–30 pts: All three financial statements correctly read and summarized; key line items accurately identified; no arithmetic errors in ratio calculations.
- 21–26 pts: Statements mostly accurate; minor errors in one ratio or line item identification.
- 15–20 pts: Several errors in financial data or ratio calculations; some misidentification of account types.
- 0–14 pts: Significant errors in financial data; ratios incorrectly computed or statements misunderstood.

2. RATIO ANALYSIS AND INTERPRETATION (25 points)
- 22–25 pts: Computes all required ratios (liquidity, profitability, solvency) correctly for all 3 years; provides meaningful trend analysis and benchmarks against industry averages; insightful interpretation of what ratios reveal about company health.
- 17–21 pts: Most ratios correct; trend analysis present but limited; interpretation partially addresses business implications.
- 12–16 pts: Some ratios computed; trend analysis missing or superficial; interpretation is vague.
- 0–11 pts: Fewer than half of required ratios computed; no meaningful interpretation.

3. WRITTEN REPORT QUALITY (20 points)
- 18–20 pts: Professional format; clear headings; well-written analysis; appropriate accounting terminology used correctly; free of major grammatical errors; cites data sources.
- 14–17 pts: Generally clear; some terminology issues; minor grammar problems.
- 10–13 pts: Organization unclear; terminology errors; writing impedes understanding.
- 0–9 pts: Report is incomplete, poorly organized, or fails to follow assignment format.

4. ORAL PRESENTATION (15 points)
- 13–15 pts: All members contribute; clear delivery; well-organized slides; answers audience questions confidently; stays within 10-minute limit.
- 10–12 pts: Most members contribute; some organizational issues; mostly answers questions.
- 7–9 pts: Uneven participation; disorganized; struggles with audience questions.
- 0–6 pts: Minimal presentation effort; members unprepared; significantly over or under time limit.

5. INDIVIDUAL CONTRIBUTION STATEMENT (10 points)
- 9–10 pts: Each member submits a detailed, specific description of their contribution; descriptions are consistent across the group.
- 7–8 pts: Contributions described but vaguely; minor inconsistencies.
- 5–6 pts: Contribution statements vague or significantly inconsistent across group.
- 0–4 pts: Statement missing or indicates lack of genuine participation.

LATE PENALTY: Written report loses 10 points per day late. Presentations cannot be rescheduled except for documented emergencies.`
      }
    ]
  },

  // ────────────────────────────────────────────────
  // EGR-101-STARTER — Introduction to Engineering
  // Stanley and Karen Pigman College of Engineering
  // ────────────────────────────────────────────────
  {
    courseCode: 'EGR-101-STARTER',
    title: 'Introduction to Engineering',
    description: 'An introductory survey of engineering disciplines, the engineering design process, technical communication, and professional ethics. Students gain hands-on experience with MATLAB and complete a team design project, preparing them for subsequent engineering coursework.',
    college: 'Stanley and Karen Pigman College of Engineering',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `EGR 101 — Introduction to Engineering
Stanley and Karen Pigman College of Engineering, University of Kentucky
Spring 2026 | MWF 9:00–9:50 AM | Engineering Building 265
Lab Section: Wednesday 2:00–4:50 PM | Engineering Building Lab 110

INSTRUCTOR
Dr. Katie Thompson, Department of Electrical & Computer Engineering
Office: Engineering Building 327
Office Hours: Monday & Wednesday 10:00–11:00 AM; Friday 10:00 AM–12:00 PM
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
EGR 101 introduces students to the engineering profession and its disciplines. Students practice the engineering design process, learn technical communication standards, develop MATLAB programming skills, and consider sustainability and ethics in engineering. The course culminates in a team design project. No prerequisites.

REQUIRED SOFTWARE (FREE FOR UK STUDENTS)
- MATLAB R2025b — download via IT.uky.edu with your LinkBlue credentials
- AutoCAD 2025 (free student license via Autodesk Education) — download at autodesk.com/education
- Microsoft Office Suite — available via UK IT at no cost
Students must have software installed by Week 3. Contact the Engineering Help Desk (257-1000) for installation assistance.

REQUIRED MATERIALS
- Kosky, P., Balmer, R., Keat, W., & Wise, G. (2021). Exploring Engineering: An Introduction to Engineering and Design (5th ed.). Academic Press. ISBN: 978-0128150733
- Engineering lab notebook (quad-ruled, bound, not spiral) — available at UK Bookstore
- Engineering scale ruler (1/8", 1/4", 1/2" scales)
- USB flash drive (8 GB minimum) for lab files

GRADING BREAKDOWN
Design Project (team, due Week 13)      30%
Laboratory Reports (6 labs)             30%
Exams (2 exams)                         25%
Participation & Professionalism         15%
TOTAL                                  100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM INFORMATION
Exam 1 (Week 6): Covers Modules 1–3 (engineering disciplines, design process, ethics, technical communication). 50 minutes, closed-book, in-class.
Exam 2 (Week 12): Covers Modules 4–6 (MATLAB fundamentals, estimation, sustainability). 50 minutes, closed-book, in-class. MATLAB syntax sheet provided.

WEEKLY SCHEDULE
Week 1  — Introduction to Engineering: What engineers do; tour of engineering disciplines
Week 2  — The Engineering Design Process: Phases, iteration, design constraints
Week 3  — Engineering Ethics: NSPE Code of Ethics; professional responsibility; case studies
Week 4  — Technical Communication: Engineering reports; the memo format; technical drawings basics
Week 5  — Technical Drawings: Orthographic projection; title blocks; AutoCAD introduction (lab)
Week 6  — EXAM 1 + Problem Solving: Dimensional analysis; unit conversion; estimation
Week 7  — Estimation and Fermi Problems: Order-of-magnitude; back-of-envelope calculations
Week 8  — MATLAB Introduction: Variables, vectors, matrices; scripts vs. functions
Week 9  — MATLAB Programming: Control flow (loops, conditionals); plotting data
Week 10 — MATLAB Applications: Data analysis; fitting; engineering problem solving in MATLAB
Week 11 — Sustainability in Engineering: Life cycle analysis; environmental impact assessment; SDGs
Week 12 — EXAM 2 + Design Project work sessions
Week 13 — Design Project Presentations (all lab sections); Project reports due end of Week 13
Week 14 — Professional Development: Career paths; graduate school; engineering licensure (PE exam)
Week 15 — Review; innovation and the future of engineering

DESIGN PROJECT (30%)
Teams of 3–4 students complete a structured design project following the full engineering design process. Teams identify a problem, research existing solutions, generate multiple concepts, select and build/model a solution, test it, and present results. Teams form in Week 2; topic proposal due Week 4; progress report due Week 9; final report and presentation due Week 13. See separate Design Project Handbook on Canvas.

CITATION FORMAT
IEEE citation format is used in all written work in this course. See the IEEE Reference Guide on Canvas for examples. In-text citations use numbered brackets: [1], [2].

LAB SAFETY POLICY (READ CAREFULLY)
1. Safety glasses must be worn at ALL times in the engineering lab — from the moment you enter to the moment you leave. No exceptions. Students without safety glasses will be asked to leave and will receive a zero for that lab.
2. Closed-toe shoes required in lab. No sandals, flip-flops, or open-toed footwear.
3. No food or drink in the lab at any time.
4. Report all injuries, spills, and equipment malfunctions to the instructor or TA immediately. Do not attempt to fix equipment yourself.
5. Lab notebooks must be kept in the lab — do not remove bound lab notebooks from the lab building.
6. Students who exhibit unsafe behavior may be removed from the lab and receive a zero.

GROUP/TEAM POLICY
The design project is a group effort; however, all lab reports are submitted individually. Copying another student's lab report is plagiarism. Group members receive the same project grade unless the team submits a peer evaluation indicating unequal contribution — in which case individual adjustments may be applied.

LATE POLICY
Lab reports: 10% deduction per calendar day late; not accepted after 5 days. Design project: 5% per day late. No late submissions for exams.

PROFESSIONALISM (15%)
Attendance at all labs is required. Three or more unexcused absences from labs results in an automatic letter-grade reduction. Professionalism includes: timely participation in team meetings, meeting project deadlines, respectful conduct in class and lab, and contributing substantively to group work.`
      },
      {
        moduleNumber: 2,
        title: 'Module 1: What Engineers Do',
        materialType: 'lecture',
        content: `MODULE 1: WHAT ENGINEERS DO
Engineering Disciplines, the Design Process, and the Engineering Mindset

DEFINING ENGINEERING
Engineering is the application of scientific and mathematical principles to design, build, and maintain structures, machines, systems, and processes that solve human problems and improve quality of life. Engineers transform scientific knowledge into useful products — the bridge, the smartphone, the insulin pump, the water treatment plant, the search algorithm. The distinction from science: scientists ask "why does this happen?" Engineers ask "how do we make this work?"

MAJOR ENGINEERING DISCIPLINES AT UK
- Civil Engineering: Design and construction of infrastructure — roads, bridges, buildings, dams, water systems. Civil engineers must balance structural integrity, cost, environmental impact, and aesthetics. The Interstate Highway System, Hoover Dam, and the Golden Gate Bridge are civil engineering achievements.
- Mechanical Engineering: Design of machines and mechanical systems — engines, robots, HVAC, biomedical devices. MEs apply thermodynamics, fluid mechanics, and materials science.
- Electrical & Computer Engineering: Circuits, electronics, power systems, signal processing, and computing systems. Everything from power grids to smartphones to autonomous vehicles.
- Chemical Engineering: Transform raw materials into useful products through chemical processes — pharmaceuticals, fuels, polymers, food processing. ChemEs apply thermodynamics, reaction kinetics, and mass/energy transfer.
- Biomedical Engineering: Apply engineering principles to healthcare — medical devices (pacemakers, prosthetics), imaging systems (MRI, CT), tissue engineering, drug delivery systems.
- Mining Engineering, Agricultural & Biosystems Engineering, and Materials Engineering round out UK's offerings.

Interdisciplinary Reality: Modern engineering problems rarely fit neatly into one discipline. A self-driving car requires electrical engineers (sensors, computing), mechanical engineers (chassis, brakes), software engineers (algorithms), and systems engineers (integration). The most valuable engineers can work across boundaries.

THE ENGINEERING DESIGN PROCESS
Engineering is not just math and science — it is a structured creative process. The classic design process (taught by ABET-accredited programs):

1. Define the Problem: What needs to be solved? Who are the stakeholders? What are the constraints (cost, time, materials, safety, regulations)?
2. Research: What solutions already exist? What technical knowledge is needed? What failed before?
3. Specify Requirements: Technical and non-technical criteria the solution must meet. Functional requirements vs. design constraints.
4. Generate Concepts: Brainstorm multiple potential solutions without initially judging them. Use morphological charts, mind maps, TRIZ. Divergent thinking.
5. Evaluate and Select: Score concepts against requirements using a weighted decision matrix. Convergent thinking.
6. Prototype and Build: Create a physical or computational model. Embrace imperfection — first prototypes exist to learn from, not to be the final product.
7. Test and Evaluate: Does the solution meet the requirements? Systematic testing with documented results.
8. Iterate: Engineering solutions are almost never right the first time. Use test results to revise. Repeat as needed.
9. Communicate: Document and present the solution clearly — written report, engineering drawings, oral presentation.

The design process is iterative, not linear. Real engineers bounce between steps as they learn more about the problem.

ENGINEERS AND SOCIETY
Engineers make decisions that affect millions of people — and the consequences can be catastrophic if judgment fails. The 1986 Challenger Space Shuttle disaster: engineers at Morton Thiokol warned that O-ring seals could fail in cold temperatures; management override led to launch in 31°F weather; all seven crew members died. The 2000 Ford Explorer/Firestone rollover deaths: tire design defects combined with vehicle handling characteristics caused 271 deaths. Engineers bear professional and moral responsibility for their work.

ENGINEERING STATISTICS
- ~2 million engineers employed in the U.S. (BLS 2024)
- Median annual wage: $100,000+ across most disciplines
- Engineering occupations projected to grow 4–14% over next decade
- Women represent ~16% of employed engineers — a pipeline that begins in K–12 education

KEY TERMS: engineering design process, requirements, constraints, iteration, prototype, interdisciplinary, ABET

DISCUSSION QUESTIONS
1. What is the difference between a scientist and an engineer? Could the same person be both? Give an example.
2. Think of a modern product (any product). Identify at least two engineering disciplines that contributed to its creation.
3. In the Challenger disaster, engineers knew there was a risk but the launch proceeded. Who bears moral responsibility — the engineers who warned, the managers who overruled, or both? How should engineers handle situations where their professional judgment is overridden?`
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Engineering Ethics',
        materialType: 'lecture',
        content: `MODULE 2: ENGINEERING ETHICS
Professional Responsibility, the NSPE Code, and Case Studies

WHY ETHICS IN ENGINEERING?
Engineers produce things that affect people's lives. A poorly designed drug, a flawed dam, a defective aircraft component — engineering failures kill people and cause enormous harm. This is why engineering is a licensed profession with a formal code of ethics. Unlike, say, a poorly designed marketing campaign that wastes money, an engineering failure can collapse a building, contaminate a water supply, or crash an aircraft.

THE NSPE CODE OF ETHICS
The National Society of Professional Engineers (NSPE) Code of Ethics for Engineers establishes fundamental canons:

Fundamental Canon 1: Engineers shall hold paramount the safety, health, and welfare of the public. "Paramount" means above client wishes, employer interests, and personal career advancement. This is non-negotiable.

Fundamental Canon 2: Engineers shall perform services only in areas of their competence. You should not design a nuclear reactor if your expertise is software — no matter how much you need the work.

Fundamental Canon 3: Engineers shall act in such a manner as to uphold and enhance the honor, integrity, and dignity of the engineering profession.

Fundamental Canon 4: Engineers shall act as faithful agents or trustees of each employer or client. Loyalty to clients within the limits of public safety.

Fundamental Canon 5: Engineers shall avoid deceptive acts.

Fundamental Canon 6: Engineers shall conduct themselves honorably, responsibly, ethically, and lawfully so as to enhance the honor, reputation, and usefulness of the profession.

Professional Licensure: The Professional Engineer (PE) license requires: (1) ABET-accredited engineering degree, (2) passing the Fundamentals of Engineering (FE) exam (taken during senior year), (3) 4 years of progressive engineering experience, (4) passing the Principles and Practice of Engineering (PE) exam. PE licensure is required for engineers who offer services to the public.

ETHICAL FRAMEWORKS
Engineers use multiple frameworks when facing ethical dilemmas:
- Consequentialism (Utilitarian): The right action produces the greatest good for the greatest number. Calculate expected outcomes; choose the option maximizing total welfare.
- Deontology (Kantian): Some actions are inherently right or wrong regardless of consequences. "Treat people as ends, not means." Do not harm innocent parties even if the math says it produces greater total utility.
- Virtue Ethics: What would a person of good character do? Focus on developing professional virtues — honesty, diligence, care, integrity — and act accordingly.
- Risk-Benefit Analysis: Engineering-specific — quantify risks (probability × consequences), compare to benefits, require safety factors above calculated minimums.

CASE STUDY 1: THE HYATT REGENCY WALKWAY COLLAPSE (Kansas City, 1981)
The original design specified a single rod holding two walkways from the ceiling. A design change was made (without formal engineering review) to use two shorter rods — effectively doubling the load on the connection point. The change was approved by a structural engineer who signed off without checking load calculations. Both walkways collapsed during a dance event, killing 114 people and injuring 216. The engineers lost their licenses. Lesson: Independent design review and load calculations for design changes are non-negotiable. "It seemed like a minor change" is not an engineering justification.

CASE STUDY 2: THE THERAC-25 RADIATION THERAPY MACHINE
A software bug in the Therac-25 radiation therapy machine, combined with inadequate hardware safety interlocks (removed to save cost on the assumption software would be reliable), led to massive radiation overdoses that killed at least 3 patients and seriously injured others in the 1980s. The manufacturer was unresponsive to initial complaints. Lesson: Safety systems should be redundant; software alone is insufficient for safety-critical applications; ignoring user reports of unexpected behavior is an ethical failure.

WHISTLEBLOWING
When internal channels fail, engineers have an obligation to go external. The NSPE code supports whistleblowing when public safety is at stake. Whistleblowers face real professional risks — Roger Boisjoly, the Morton Thiokol engineer who warned about Challenger O-rings, was blacklisted afterward. Legal protections exist (state whistleblower statutes, federal protections for government contractors) but are imperfect.

DISCUSSION QUESTIONS
1. An engineer discovers a defect in a product already sold to customers. Her manager says it's "probably fine" and reporting it would embarrass the company. What should she do? Walk through the NSPE canons.
2. Can you apply consequentialist and deontological reasoning to the same dilemma and get different answers? Give an example.
3. Why does engineering require licensure when most other professions (software development, architecture technician) do not?`
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Technical Communication',
        materialType: 'lecture',
        content: `MODULE 3: TECHNICAL COMMUNICATION
Engineering Reports, Technical Drawings, and IEEE Citation

THE IMPORTANCE OF TECHNICAL COMMUNICATION
An engineer who cannot communicate effectively is a dangerous engineer. The best technical solution in the world is useless if it can't be conveyed clearly to colleagues, managers, clients, or regulators. Studies of engineering failure often cite communication breakdowns — the Challenger mission managers received a 13-page fax with charts they couldn't read and data they didn't interpret correctly the night before the launch.

Engineers communicate through: technical reports, memoranda, design documents, presentations, engineering drawings, email, and specifications. Each has conventions that must be followed for information to be used reliably.

THE ENGINEERING TECHNICAL REPORT
Standard structure for a formal engineering report:
1. Title Page: Report title, authors, course/organization, date, revision number.
2. Abstract/Executive Summary: 150–250 words summarizing the problem, approach, key results, and conclusions. Busy decision-makers read this and nothing else.
3. Introduction: Background, problem statement, scope, objectives. What question does this report answer?
4. Theory/Background: Relevant equations, physical principles, prior work.
5. Methodology/Procedure: How data was collected or the design developed. Detailed enough to replicate.
6. Results: Data presented clearly — tables, graphs with proper labels (axes, units, titles, legends). No interpretation here — just what was measured.
7. Discussion/Analysis: Interpretation of results. Does the design meet requirements? What do the data mean? Error analysis. Comparison to theory.
8. Conclusions: Brief, numbered list of what was proven/demonstrated. No new information.
9. Recommendations: What should be done next?
10. References: IEEE format (numbered, in order cited).
11. Appendices: Raw data, sample calculations, supplementary material.

THE ENGINEERING MEMO
For shorter communications within an organization: To/From/Date/Subject header, single-spaced, no indenting, direct and concise. A memo should state its purpose in the first sentence. Engineering memos document decisions, convey test results, or request resources.

IEEE CITATION FORMAT
All technical writing in EGR 101 uses IEEE citation format. IEEE uses numbered reference lists — references are numbered in the order they first appear in the text, and cited in brackets: [1], [2], [3].

Format for a journal article:
[1] A. B. Author and C. D. Author, "Title of article," Abbrev. Journal Name, vol. X, no. X, pp. XXX–XXX, Month Year, doi: XX.XXXX/XXXXX.

Format for a book:
[2] A. Author, Title of Book, Xth ed. City, State: Publisher, Year.

Format for a website:
[3] Author Name (if available), "Title of webpage," Website Name. URL (accessed Month Day, Year).

TECHNICAL DRAWINGS FUNDAMENTALS
Engineering drawings convey design intent unambiguously — a skilled machinist or fabricator must be able to produce the part from the drawing alone. Key conventions:
- Orthographic Projection (Third-Angle, used in US): Three views — front, top, right side — arranged in a standard layout. Lines that are visible shown solid; hidden lines shown dashed.
- Title Block: Lower right corner; contains part name, part number, scale, tolerance, drafter, checker, date, revision history, and engineering unit (metric vs. inch).
- Dimensioning: Dimensions added with dimension lines, extension lines, and arrowheads. Overall, location, and detail dimensions. Do not over-dimension.
- Scale: "1:2" means drawn at half actual size. "2:1" means drawn at twice actual size. Noted in the title block.
- Section Views: Cutting plane through a part to show internal features.
- Geometric Dimensioning and Tolerancing (GD&T): Precise specification of part geometry — not just size but form, orientation, and location. Introduced in later courses.

EFFECTIVE PRESENTATION DELIVERY
For oral technical presentations: (1) know your audience — are they experts or decision-makers? (2) structure as problem-approach-results-conclusions, (3) every slide should have one clear point, (4) graphs are better than tables for showing trends, (5) anticipate questions about assumptions and uncertainties.

DISCUSSION QUESTIONS
1. Why is the abstract/executive summary written for a different audience than the methods section? Who reads each and what do they need to know?
2. What makes a graph misleading? Identify three ways a graph can distort data perception.
3. If you had to explain a technical concept (e.g., how a transistor works) to a non-engineer, what strategies would you use?`
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Problem Solving and Estimation',
        materialType: 'lecture',
        content: `MODULE 4: PROBLEM SOLVING AND ESTIMATION
Dimensional Analysis, Unit Conversion, and Fermi Problems

THE ENGINEERING APPROACH TO PROBLEMS
Engineers solve problems that have never been solved before — or have never been solved with these specific constraints. There is no answer key. The ability to decompose a complex problem into tractable pieces, identify relevant principles, make justified assumptions, and estimate the magnitude of answers is the core intellectual skill of engineering.

DIMENSIONAL ANALYSIS
Every physical quantity has dimensions — units that describe what is being measured. Dimensional analysis is a method of using the dimensions of known quantities to derive relationships or check the validity of equations.

Fundamental dimensions: Mass [M], Length [L], Time [T], Temperature [θ], Electric Current [I], Amount of Substance [N], Luminous Intensity [J].

SI Units: mass = kilogram (kg), length = meter (m), time = second (s), temperature = Kelvin (K), current = ampere (A).

Rule: Both sides of any valid physical equation must have the same dimensions. This is not optional — if dimensions don't match, the equation is wrong.

Example: Check F = ma
  F has dimensions of force = [M][L][T]⁻²
  m has dimensions [M]
  a has dimensions [L][T]⁻²
  So ma = [M][L][T]⁻² ✓

UNIT CONVERSION
The factor-label method (also called dimensional analysis for unit conversion): multiply by a conversion factor (a ratio equal to 1) that cancels the unwanted unit.

Example: Convert 60 mph to m/s
60 miles/hour × (1.609 km / 1 mile) × (1000 m / 1 km) × (1 hour / 3600 s)
= 60 × 1609 / 3600 m/s = 26.8 m/s

Always write out the units at each step. Units that appear in both numerator and denominator cancel. This method eliminates the most common source of engineering errors.

Famous example of unit error: The Mars Climate Orbiter (1999) was lost because one engineering team used metric units and another used Imperial units for thruster impulse — a $327 million spacecraft destroyed by a conversion error.

FERMI ESTIMATION
Enrico Fermi, physicist, was famous for estimating seemingly impossible quantities from first principles. "Fermi problems" develop intuition and order-of-magnitude reasoning — critical for checking whether your detailed calculation gives a reasonable answer.

Method: Break the problem into components you can estimate, combine estimates, and express the answer as a power of ten (order of magnitude).

Worked Example: How many piano tuners are there in Chicago?
- Population of Chicago: ~2.7 million people
- Average household size: ~2.5 people → ~1,080,000 households
- Fraction with pianos: ~1 in 20 → ~54,000 pianos
- A piano needs tuning once a year
- A piano tuner can tune ~4 pianos/day × 250 working days = 1,000 pianos/year
- Piano tuners needed: 54,000 / 1,000 = ~54 piano tuners
- Actual answer: approximately 50–60 ✓

The goal is not precision — it's to get within a factor of 10. This skill prevents accepting nonsensical computed answers without question.

SAFETY FACTORS
Engineers never design to the exact calculated limit — structures would fail the moment load exceeded prediction. Safety factors build in margins:
Safety Factor = (Capacity of structure) / (Actual expected load)
A bridge designed to hold 10,000 kg built to hold 50,000 kg has a safety factor of 5. Building codes mandate minimum safety factors for different applications. Higher safety factors = safer but heavier/more expensive.

ENGINEERING PROBLEM-SOLVING FRAMEWORK
1. Define: What is given? What is asked for? What are the constraints?
2. Sketch: Draw a diagram, free body diagram, or system boundary.
3. Identify principles: Which physical law applies (conservation of energy, Newton's laws, mass balance)?
4. Solve symbolically: Derive the equation before plugging in numbers.
5. Calculate: Substitute numbers with units; keep track of significant figures.
6. Check: Does the answer have correct units? Is the magnitude reasonable (Fermi check)? Does it satisfy the original constraints?

SIGNIFICANT FIGURES
Numerical results should not be reported with more precision than the least precise input.
3 sig figs × 4 sig figs = report to 3 sig figs.
Calculators give 10 digits — engineers use 3 to 4 significant figures for most work. Reporting "the bridge can hold 10,247.8 pounds" implies a precision that doesn't exist.

DISCUSSION QUESTIONS
1. A calculation gives a bridge maximum load as 47,382.93 kg. How many significant figures should you report? What does the decimal imply?
2. Estimate (Fermi method): How many gallons of water does the UK campus use per day? Show your reasoning.
3. Why do engineers use safety factors rather than designing exactly to the calculated limit? What risks would a safety factor of 1.0 create?`
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Introduction to MATLAB',
        materialType: 'lecture',
        content: `MODULE 5: INTRODUCTION TO MATLAB
Variables, Loops, and Plotting for Engineering Applications

WHAT IS MATLAB?
MATLAB (MATrix LABoratory) is a high-level programming language and interactive environment widely used in engineering and science for numerical computation, data analysis, visualization, and algorithm development. Unlike general-purpose languages (C++, Python), MATLAB is optimized for matrix operations — making it ideal for engineering problems that involve systems of equations, signal processing, image analysis, and simulation.

MATLAB is the dominant tool in aerospace, automotive, signal processing, and control systems engineering. Learning MATLAB in EGR 101 prepares you for courses in circuits, dynamics, thermodynamics, and numerical methods where MATLAB is used throughout.

MATLAB BASICS
Launching MATLAB: The MATLAB window has a Command Window (interactive), a Workspace (shows current variables), a Command History, and an Editor (for writing scripts).

Variables: MATLAB variables are created by assignment. MATLAB is case-sensitive.
  >> x = 5
  >> y = 3.14
  >> name = 'Wildcat'   % strings in single quotes

Vectors and Matrices: MATLAB's core data structure.
  >> v = [1, 2, 3, 4, 5]        % row vector
  >> w = [1; 2; 3; 4; 5]        % column vector (semicolons create rows)
  >> A = [1 2; 3 4]             % 2×2 matrix

Arithmetic Operators: + - * / ^ work element-wise on scalars. For element-wise operations on arrays, use .* ./ .^ (dot operators).
  >> v = [1 2 3]; v.^2          % result: [1 4 9]

Colon Operator: Creates sequences.
  >> x = 1:5                    % [1 2 3 4 5]
  >> x = 0:0.1:1                % [0 0.1 0.2 ... 1.0] — 11 elements
  >> x = linspace(0, 10, 100)   % 100 evenly spaced points from 0 to 10

Built-in Functions: MATLAB has hundreds of built-in functions.
  >> sqrt(16)        % 4
  >> abs(-7)         % 7
  >> sin(pi/2)       % 1
  >> max([3 1 4 1 5]) % 5
  >> length(v)       % number of elements
  >> size(A)         % dimensions of matrix

SCRIPTS AND FUNCTIONS
A script is a file of MATLAB commands saved with a .m extension. Run by typing the filename. Scripts share the base workspace — all variables created in a script are accessible in the command window.

A function is a .m file that takes inputs, computes outputs, and has its own workspace (variables don't leak into the base workspace).
  function result = square_root(x)
    result = sqrt(x);
  end

CONTROL FLOW
For loop: Execute code a fixed number of times.
  for i = 1:5
    disp(i^2)
  end

While loop: Execute code until a condition is false.
  x = 1;
  while x < 100
    x = x * 2;
  end
  disp(x)

If-else: Conditional execution.
  if x > 0
    disp('positive')
  elseif x < 0
    disp('negative')
  else
    disp('zero')
  end

PLOTTING IN MATLAB
Engineering analysis requires visualization. Key plotting commands:
  >> x = linspace(0, 2*pi, 100);
  >> y = sin(x);
  >> plot(x, y)
  >> xlabel('Angle (radians)')
  >> ylabel('Amplitude')
  >> title('Sine Wave')
  >> grid on

Multiple plots: hold on allows multiple curves on the same axes. legend() adds a legend.

Subplots: subplot(rows, cols, index) creates a grid of plots in one figure.

Logarithmic scales: semilogy(), semilogx(), loglog() — important for data spanning many orders of magnitude.

ENGINEERING APPLICATION: PROJECTILE MOTION
Calculate and plot the trajectory of a projectile:
  v0 = 50;            % initial speed (m/s)
  theta = 45;         % launch angle (degrees)
  g = 9.81;           % gravity (m/s²)
  t = linspace(0, 2*v0*sind(theta)/g, 200);  % time vector
  x = v0*cosd(theta)*t;
  y = v0*sind(theta)*t - 0.5*g*t.^2;
  plot(x, y)
  xlabel('Horizontal distance (m)')
  ylabel('Height (m)')
  title('Projectile Trajectory')

DEBUGGING TIPS
- Add semicolons (;) at end of lines to suppress output; remove to inspect intermediate values
- Use disp() to print variable values during debugging
- The error message usually points to the line number — read it carefully
- Break complex code into small pieces and test each piece

DISCUSSION QUESTIONS
1. Why does MATLAB use the .* operator for element-wise multiplication instead of just *? What does A*B compute for matrices?
2. Write pseudo-code (not actual MATLAB) for a script that computes the average of all numbers between 1 and 1000 that are divisible by 7.
3. What type of engineering analysis would you most want to automate with MATLAB? Describe the inputs and outputs.`
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Sustainability in Engineering',
        materialType: 'lecture',
        content: `MODULE 6: SUSTAINABILITY IN ENGINEERING
Environmental Impact, Life Cycle Analysis, and the UN Sustainable Development Goals

SUSTAINABILITY AS AN ENGINEERING IMPERATIVE
For most of engineering history, environmental impact was an afterthought — or not a thought at all. The Cuyahoga River in Cleveland caught fire 13 times (most famously in 1969) due to industrial pollution. London's "Great Smog" of 1952 killed 4,000–12,000 people. Today, sustainability is a core engineering design criterion — not an optional feature added at the end.

ABET (Accreditation Board for Engineering and Technology) now requires that engineering graduates demonstrate "an ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts."

ENVIRONMENTAL IMPACT ASSESSMENT
Before major construction or industrial projects, an Environmental Impact Assessment (EIA) is required by law (National Environmental Policy Act, 1969). The EIA considers:
- Air quality impacts (emissions, dust, noise)
- Water quality (stormwater runoff, groundwater contamination, wetlands)
- Habitat and biodiversity (endangered species, habitat fragmentation)
- Climate impacts (greenhouse gas emissions, carbon footprint)
- Community impacts (noise, traffic, displacement)
- Cumulative impacts (this project + all existing impacts in the area)

LIFE CYCLE ANALYSIS (LCA)
Life Cycle Analysis (also called Life Cycle Assessment) evaluates the total environmental impact of a product or process from "cradle to grave" — or ideally, "cradle to cradle" (where materials are fully recaptured and reused).

Four phases of LCA (ISO 14040 standard):
1. Goal and Scope Definition: What is being assessed? What boundaries are included (raw material extraction? transportation? end-of-life)?
2. Life Cycle Inventory (LCI): Data collection — all inputs (energy, water, raw materials) and outputs (products, emissions, waste) at every stage.
3. Life Cycle Impact Assessment (LCIA): Translate inventory data into environmental impact categories — global warming potential (kg CO₂ equivalent), eutrophication, acidification, water depletion, human health impacts.
4. Interpretation: What do the results mean? Where are the hotspots? What design changes would most reduce impact?

Example: LCA of an aluminum beverage can vs. a plastic bottle
- Aluminum mining and smelting are very energy-intensive (high upstream impact)
- But aluminum recycles infinitely without quality loss; recycled aluminum uses 95% less energy than primary aluminum
- PET plastic has lower upstream energy but is rarely recycled effectively; often ends in landfill or ocean
- LCA conclusion depends heavily on recycling rate assumption — systems matter, not just materials

THE TRIPLE BOTTOM LINE
Traditional engineering optimization: minimize cost, maximize performance. Sustainable engineering: optimize across three dimensions:
- Economic (Profit): Cost-effectiveness, long-term financial viability
- Environmental (Planet): Resource consumption, emissions, ecosystem impact
- Social (People): Worker safety, community impact, equity, access

Engineers who ignore the social and environmental dimensions create "solutions" that externalize costs onto communities and future generations.

UN SUSTAINABLE DEVELOPMENT GOALS (SDGs)
The 17 SDGs (adopted 2015, target 2030) provide a framework for sustainable development. Engineering directly addresses:
- SDG 6: Clean Water and Sanitation — 2 billion people lack safe drinking water
- SDG 7: Affordable and Clean Energy — 759 million without electricity
- SDG 9: Industry, Innovation, and Infrastructure — sustainable industrialization
- SDG 11: Sustainable Cities and Communities — green buildings, transit, resilient infrastructure
- SDG 13: Climate Action — decarbonizing energy, transportation, industry

Green Engineering Principles (EPA): Design for energy efficiency; use renewable feedstocks; minimize waste and hazardous materials; design for durability and end-of-life recovery; favor local solutions to reduce transportation.

CASE STUDY: THE CHEONGGYECHEON STREAM RESTORATION (Seoul, South Korea)
A 5.8-km elevated expressway was demolished and the concrete-covered Cheonggyecheon stream beneath it was restored. Result: urban temperature dropped 3–5°C, biodiversity increased dramatically, adjacent property values rose, pedestrian activity and local economic activity increased. Infrastructure that had been valued at $1.2 billion was replaced with an amenity that created far more social and economic value. Engineering for sustainability and engineering for community can align.

DISCUSSION QUESTIONS
1. A company can produce a product 20% cheaper using a process that generates toxic waste requiring expensive disposal. Who bears the cost of the disposal? Should this affect the company's design choices?
2. What is the difference between recycling and upcycling? Why does the distinction matter for LCA?
3. Pick one of the UN SDGs and describe a specific engineering challenge and solution that addresses it. Be concrete — what problem, what technology, what trade-offs?`
      },
      {
        moduleNumber: 8,
        title: 'Design Project Rubric',
        materialType: 'rubric',
        content: `EGR 101 DESIGN PROJECT RUBRIC
Assignment: Team Engineering Design Project (30% of course grade)
Total Points: 100 points
Teams: 3–4 students; same team throughout the semester
Deliverables: Written Report + 10-minute Presentation (Week 13)

The project follows the full engineering design process: problem definition, research, requirements specification, concept generation, concept selection, prototyping/modeling, testing, and communication.

GRADING CRITERIA

1. PROBLEM DEFINITION AND REQUIREMENTS (15 points)
- 13–15 pts: Problem is clearly stated with a specific, measurable need; stakeholders identified; complete set of functional requirements and design constraints listed with quantitative metrics where applicable.
- 10–12 pts: Problem statement clear; requirements mostly complete but some lack quantitative metrics.
- 7–9 pts: Problem statement vague; requirements incomplete or not distinguishable from constraints.
- 0–6 pts: Problem poorly defined; requirements largely absent or not engineering-appropriate.

2. CONCEPT GENERATION AND SELECTION (15 points)
- 13–15 pts: Minimum 3 distinctly different concepts generated and documented with sketches; weighted decision matrix used with justified criteria and weights; selection rationale is logical and defensible.
- 10–12 pts: 3 concepts present; decision matrix used but criteria or weights poorly justified.
- 7–9 pts: Fewer than 3 concepts, or concepts are minor variations; selection process not rigorous.
- 0–6 pts: Single concept pursued without alternatives; no structured selection process.

3. SOLUTION DEVELOPMENT AND TESTING (25 points)
- 22–25 pts: Prototype or model built and tested systematically; test plan documented with expected outcomes; results recorded with units and appropriate significant figures; solution demonstrably meets (or failure to meet) stated requirements quantified.
- 17–21 pts: Prototype tested; some results missing or incomplete; requirements partially verified.
- 12–16 pts: Prototype built but testing minimal or undocumented; results anecdotal rather than quantitative.
- 0–11 pts: No functioning prototype or model; no documented testing.

4. WRITTEN REPORT QUALITY (25 points)
- 22–25 pts: IEEE citation format throughout; professional organization following required report structure; clear figures and tables with captions; technical writing is precise and free of major errors; all team members' contributions reflected.
- 17–21 pts: Report mostly well-organized; minor format/citation errors; writing generally clear.
- 12–16 pts: Report structure incomplete; several citation errors; writing unclear in places.
- 0–11 pts: Report significantly incomplete; little evidence of engineering analysis; citations absent.

5. ORAL PRESENTATION (20 points)
- 18–20 pts: All team members present substantive portions; organized and professional delivery; visual aids clear; time limit (10 minutes ± 1 minute) observed; questions answered confidently and correctly.
- 14–17 pts: Most members present; generally organized; some questions answered well; near time limit.
- 10–13 pts: Uneven participation; some disorganization; struggles with questions.
- 0–9 pts: Minimal preparation evident; significant time overage or underage; unable to answer basic questions.

PEER EVALUATION ADJUSTMENT
Each team member evaluates all other members' contributions on a 1–5 scale. If peer evaluations indicate significantly unequal contribution (>20% deviation from average), the instructor may adjust individual project grades by up to ±10 points.

PENALTIES
- Late written report: –5% per day
- Presentation without all team members present (unless documented emergency): –10 points`
      }
    ]
  },


  // ────────────────────────────────────────────────
  // EDC-280-STARTER — Human Development in Educational Contexts
  // College of Education
  // ────────────────────────────────────────────────
  {
    courseCode: 'EDC-280-STARTER',
    title: 'Human Development in Educational Contexts',
    description: 'Examines theories of cognitive, social-emotional, and language development across the lifespan and their applications to teaching practice. Students complete 20 hours of field observation in K-12 settings and design a differentiated lesson plan.',
    college: 'College of Education',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `EDC 280 — Human Development in Educational Contexts
College of Education, University of Kentucky
Spring 2026 | TR 11:00 AM–12:15 PM | Taylor Education Building 224

INSTRUCTOR
Dr. Katie Thompson, Department of Curriculum and Instruction
Office: Taylor Education Building 315
Office Hours: Tuesday 1:00–3:00 PM; Thursday 1:00–2:00 PM; Wednesday by Zoom appointment
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
EDC 280 surveys major theories of human development—cognitive, social-emotional, language, and moral—with emphasis on their implications for classroom instruction. Students observe real learners in K-12 settings and apply developmental theory to lesson design. Prerequisites: EDC 100 or instructor permission.

REQUIRED TEXTBOOK
Berk, L. E. (2024). Child Development (10th ed.). Pearson. ISBN: 978-0135798683
Additional readings posted on Canvas (no extra purchase required).

GRADING BREAKDOWN
Field Observation Logs & Reflection Papers   25%
Lesson Plan Assignment                        25%
Midterm Exam (Week 8)                         15%
Final Exam (Week 15)                          15%
Weekly Discussion Participation               20%
TOTAL                                        100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM INFORMATION
Midterm Exam — Week 8 (Thursday in class): Covers Modules 1–3. 75 minutes, 40 multiple-choice + 2 short-answer questions connecting developmental theory to classroom scenarios.
Final Exam — Week 15 (Thursday in class, during final exam period): Comprehensive, covers all modules. Emphasis on Modules 4–6 and application of theory to practice.

WEEKLY SCHEDULE
Week 1  — Introduction: Why development matters for teachers; overview of major theories
Week 2  — Piaget's Theory of Cognitive Development: Stages, schemas, equilibration
Week 3  — Vygotsky's Sociocultural Theory: ZPD, scaffolding, language and thought
Week 4  — Erikson's Psychosocial Development: Eight stages, identity, classroom implications
Week 5  — Cognitive Development (continued): Executive function, attention, metacognition
Week 6  — Social-Emotional Development: Attachment theory, peer relationships, self-regulation
Week 7  — Language Acquisition: Milestones, bilingualism, language disorders, ELL support
Week 8  — MIDTERM EXAM (Thursday) + Diverse Learners Introduction
Week 9  — Diverse Learners: IEPs, 504 plans, learning disabilities, gifted education
Week 10 — Cultural Responsiveness: Culturally sustaining pedagogy, implicit bias, equity in schools
Week 11 — Differentiated Instruction: Tiering, flexible grouping, UDL principles
Week 12 — Classroom Environment: Behavior management approaches, motivation theory
Week 13 — Moral Development: Kohlberg's stages, prosocial behavior, character education
Week 14 — Adolescent Development: Brain development, identity formation, risk behavior
Week 15 — Integration and Review; FINAL EXAM

FIELD OBSERVATION REQUIREMENT (25%)
Students must complete 20 hours of field observation in a K-12 classroom setting over the course of the semester. Observations begin in Week 3 and must be completed by Week 13. Placements are coordinated through the Office of Clinical Education; students do NOT arrange their own placements. Transportation to field sites is the student's responsibility.

Field Observation Schedule:
- Week 2: Orientation session and placement assignments (in-class, 1 hour)
- Weeks 3–13: Students complete observations at assigned school (minimum 2 hours/week)
- Week 6: Observation Log #1 due (5 hours logged, reflection paper 1–2 pages)
- Week 10: Observation Log #2 due (12 hours logged, reflection paper 2–3 pages)
- Week 13: Final Observation Portfolio due (20 hours logged, cumulative reflection 3–4 pages)

Each observation log documents: date/time, grade level observed, developmental theory connection (which theory explains what you observed?), one question for discussion. Logs not submitted on time lose 10 points per day.

LESSON PLAN ASSIGNMENT (25%)
Students design one 50-minute differentiated lesson plan for a grade level and subject of their choice. The lesson plan must address: learning objectives aligned to state standards, developmental appropriateness, at least two differentiation strategies (for diverse learners), formative assessment, and theoretical justification (explain which developmental theory informs your approach). Due end of Week 12 (Sunday 11:59 PM on Canvas).

ATTENDANCE POLICY
Attendance is required. More than 3 unexcused absences results in a half-letter-grade reduction for each additional absence. Field observation days count as attendance. If you miss class on a day a classmate presents, you owe that classmate a written response summary (1 paragraph) within one week.

LATE WORK POLICY
Assignments submitted late lose 10 points per day. Assignments not submitted within 5 days of the deadline receive a zero. Documented medical or family emergencies (submitted within 48 hours of the missed deadline) may qualify for an extension—contact the instructor immediately.

PROFESSIONAL CONDUCT
As pre-service educators, students are held to the Kentucky Teacher Standards for professional conduct during field placements. Behavior that violates school policies or compromises student safety may result in removal from the placement and failure of the field component.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Theories of Development — Piaget, Vygotsky, Erikson',
        materialType: 'lecture',
        content: `MODULE 1: THEORIES OF DEVELOPMENT
Piaget, Vygotsky, and Erikson — Foundations for Teaching

WHY THEORY MATTERS IN TEACHING
Teaching without developmental theory is like prescribing medication without pharmacology — you're guessing. Developmental theories give teachers a framework for understanding why an 8-year-old can't grasp abstract algebra, why a 14-year-old is preoccupied with peer approval over grades, and why a kindergartner needs to physically manipulate objects to understand quantity. Theory predicts what learners are ready for and why some approaches work better at different ages.

PIAGET'S THEORY OF COGNITIVE DEVELOPMENT
Jean Piaget (1896–1980) proposed that children are not miniature adults — they think qualitatively differently. Through active interaction with their environment, children construct knowledge (constructivism). Two core processes drive development:
- Assimilation: Incorporating new information into existing mental schemas. A child who knows "dog" calls every four-legged animal "dog" — assimilating new animals into the existing dog schema.
- Accommodation: Modifying existing schemas or creating new ones when new information doesn't fit. The child learns "cat" is different from "dog" and creates a new schema.
- Equilibration: The balance-seeking process between assimilation and accommodation; the drive for cognitive stability motivates learning.

Piaget's Four Stages:
1. Sensorimotor (birth–2 years): Knowledge built through sensory experience and motor action. Key achievement: object permanence (objects exist even when out of sight, achieved ~8–12 months).
2. Preoperational (2–7 years): Language and symbolic thought emerge, but thinking is egocentric (cannot take another's perspective) and lacks conservation. Classic conservation task: child judges a taller, thinner glass contains "more" water than a shorter, wider glass with the same amount.
3. Concrete Operational (7–11 years): Logical thinking about concrete objects. Masters conservation, classification, and seriation. Cannot yet think abstractly about hypotheticals.
4. Formal Operational (12+ years): Abstract, hypothetical, and systematic reasoning. Not all adults reach this stage consistently.

Classroom Implications: Match instruction to developmental stage. Use concrete manipulatives before abstract symbols in math. Don't expect hypothetical reasoning from third-graders. Use Socratic questioning to create productive disequilibrium (cognitive challenge that drives learning).

VYGOTSKY'S SOCIOCULTURAL THEORY
Lev Vygotsky (1896–1934) argued that cognitive development is fundamentally social — it occurs through interaction with more capable others (parents, teachers, peers) within a cultural context. Where Piaget emphasized the individual child discovering the world, Vygotsky emphasized guided social learning.

Zone of Proximal Development (ZPD): The distance between what a learner can do independently and what they can do with the guidance of a more capable person. Teaching should target the ZPD — just beyond current independent ability. Tasks too easy produce no growth; tasks too far beyond the ZPD produce frustration.

Scaffolding (Jerome Bruner extended Vygotsky's ideas): Temporary, adjustable support provided by a teacher or peer that enables a learner to complete tasks they couldn't complete alone. As competence grows, scaffolding is gradually removed (fading). Examples: worked examples, sentence starters, graphic organizers, think-alouds.

Private Speech: Young children talk to themselves while working through problems. Vygotsky saw this as internalized social dialogue — children directing themselves using the same language others used to direct them. This becomes inner speech by ~7 years. Implication: don't silence children who mutter while working.

ERIKSON'S PSYCHOSOCIAL DEVELOPMENT
Erik Erikson (1902–1994) proposed eight stages of psychosocial development across the lifespan, each characterized by a central conflict that must be resolved for healthy development.

Stages relevant to K-12 education:
- Stage 3 — Initiative vs. Guilt (3–6 years, preschool/K): Children need opportunities to initiate activities and take on responsibilities. Excessive criticism or control creates guilt and inhibits initiative. Teachers should provide choice within structure.
- Stage 4 — Industry vs. Inferiority (6–12 years, elementary): Children develop a sense of competence through mastering academic and social skills. Persistent failure or unfavorable comparison creates feelings of inferiority. Celebrate effort and growth; avoid public ranking of students.
- Stage 5 — Identity vs. Role Confusion (12–18 years, adolescence): The central task is forming a coherent sense of self — values, beliefs, occupational direction. Adolescents who can't establish identity experience role confusion. Schools can support identity exploration through diverse curriculum, mentoring, and extracurricular opportunities.

COMPARING THE THEORIES
Piaget: Individual, biologically-driven stages; active child constructing knowledge through experience.
Vygotsky: Social, cultural, and linguistic mediation; learning precedes development.
Erikson: Emotional and identity development across the lifespan; social relationships at each stage determine outcome.
All three are useful; no single theory explains everything. Expert teachers draw from multiple frameworks.

DISCUSSION QUESTIONS
1. A 9-year-old student consistently solves math problems incorrectly when presented as word problems but correctly when presented numerically. Using Piaget's theory, what might explain this? What would you do as a teacher?
2. How does scaffolding differ from just giving students the answer? At what point does scaffolding stop helping and start doing the cognitive work for the student?
3. Using Erikson's framework, what classroom practices might inadvertently harm students in Stage 4 (Industry vs. Inferiority)? What practices would support them?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Cognitive Development — Stages, Schema, Scaffolding',
        materialType: 'lecture',
        content: `MODULE 2: COGNITIVE DEVELOPMENT
Executive Function, Metacognition, and Learning in the Brain

BEYOND PIAGET: INFORMATION PROCESSING APPROACHES
Piaget gave us developmental stages, but information-processing theories describe the mechanisms of cognition — how attention, working memory, and long-term memory operate and develop. These theories directly inform instructional design.

ATTENTION AND ITS DEVELOPMENT
Selective Attention: The ability to focus on relevant information while ignoring distractors. Develops substantially between ages 6–12. Young children are more easily distracted by irrelevant stimuli. Classrooms that minimize visual and auditory clutter support younger learners. Sustained attention (staying on task) also increases with age.

Divided Attention: Attending to multiple things simultaneously. Develops through automaticity — when a skill becomes automatic (letter formation, decoding), attention can be directed to higher-order tasks (composing). This is why beginning readers can't analyze text for meaning — all attention is consumed by decoding.

WORKING MEMORY
Working memory is the mental workspace where active thinking occurs — holding and manipulating a limited amount of information in consciousness at once. Adults can hold roughly 4–7 chunks; children hold fewer. Working memory capacity increases with age and predicts academic achievement strongly.

Cognitive Load Theory (Sweller): Every task imposes load on working memory:
- Intrinsic load: The inherent complexity of the material (multiplying single digits vs. fractions — different inherent complexity).
- Extraneous load: Load imposed by poor instructional design (confusing directions, poorly organized materials). Instructional design should minimize extraneous load.
- Germane load: Productive effort building schemas and understanding. The goal.

Instructional Implications:
- Break complex tasks into smaller steps; reduce intrinsic load before asking students to integrate.
- Worked examples reduce extraneous load — show the process before asking students to do it alone.
- Spaced practice reduces working memory demands over time through schema formation.
- Dual-coding: Presenting information both verbally and visually (Paivio) doubles encoding channels without doubling working memory load.

SCHEMAS AND LONG-TERM MEMORY
Schemas are organized knowledge structures in long-term memory — the frameworks we use to make sense of new information. Experts differ from novices not primarily in IQ but in the size and organization of their schemas. A chess master doesn't calculate more moves — she recognizes patterns (schemas) that immediately constrain the search.

Implications for teaching: New learning is always connected to prior knowledge. Pre-assessing what students already know (activating prior knowledge) prepares the schema framework that new information will attach to. If students have no relevant prior knowledge, analogies and concrete experiences build the scaffolding.

EXECUTIVE FUNCTION
Executive function (EF) is the cognitive control system governing goal-directed behavior. Three core components:
1. Inhibitory Control: Suppressing automatic responses in favor of deliberate responses. (A student who impulsively blurts out answers rather than raising a hand needs inhibitory control support.)
2. Working Memory (updating): Holding and manipulating information in mind while completing a task.
3. Cognitive Flexibility: Switching between tasks, rules, or perspectives. Weakens under stress.

EF develops substantially from ages 3–25, with the prefrontal cortex (the seat of EF) among the last brain regions to fully mature. This neurological fact explains much adolescent behavior — the accelerator (limbic system, emotional and reward-driven) is fully developed before the brakes (prefrontal cortex, impulse control) are installed.

EF predicts long-term outcomes — academic achievement, employment, health, and law-abiding behavior — at least as strongly as IQ. EF can be explicitly taught and practiced. Structured self-regulation routines (planning, monitoring, checking), classroom predictability, and stress reduction all support EF development.

METACOGNITION: THINKING ABOUT THINKING
Metacognition is awareness and control of one's own cognitive processes — knowing what you know, knowing when you're confused, knowing which strategies work for you. Metacognitive learners:
- Set learning goals before studying
- Monitor comprehension while reading (notice when they don't understand)
- Select appropriate strategies (summarizing, self-testing, elaborating)
- Evaluate their own performance accurately

Students rarely develop metacognition spontaneously — it must be taught explicitly. Think-alouds (teacher verbalizes her own thinking), self-monitoring checklists, and reflective journals build metacognitive awareness.

DISCUSSION QUESTIONS
1. A middle school student works hard on homework but fails tests. He says "I know the material — I read the chapter three times." Using cognitive load theory and metacognition, what would you tell him?
2. How can a teacher reduce extraneous cognitive load in a lesson without reducing rigor?
3. Why does stress impair learning? Connect your answer to working memory and executive function.`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Social-Emotional Development',
        materialType: 'lecture',
        content: `MODULE 3: SOCIAL-EMOTIONAL DEVELOPMENT
Attachment, Identity Formation, and Emotional Self-Regulation

ATTACHMENT THEORY (BOWLBY AND AINSWORTH)
John Bowlby proposed that infants have a biological drive to form close emotional bonds (attachments) with caregivers as a survival mechanism. The quality of early attachment shapes internal working models — mental representations of self and others — that influence relationships throughout life.

Mary Ainsworth's Strange Situation experiments identified four attachment patterns:
- Secure Attachment (~60% of infants): Caregiver is a "safe base." Child explores freely, distressed when caregiver leaves, easily soothed on return. Predicts social competence, self-esteem, and resilience.
- Anxious-Ambivalent Attachment (~15%): Child is clingy and anxious even with caregiver present; inconsolable on separation; ambivalent (angry and seeking comfort) on return. Associated with inconsistent caregiving.
- Avoidant Attachment (~20%): Child shows little distress on separation; ignores caregiver on return. Associated with consistently unresponsive caregiving.
- Disorganized Attachment (~5%): No coherent strategy; child may seem confused or frightened. Associated with abuse or very frightening caregiving. Strongest predictor of later difficulties.

Classroom Implications: Children who lack secure attachment may be more reactive, have difficulty with transitions, and struggle with trusting authority figures. Teachers can serve as secondary attachment figures through consistent, warm, and predictable behavior — a significant protective factor for at-risk students.

PEER RELATIONSHIPS AND SOCIAL DEVELOPMENT
Children increasingly rely on peers (rather than parents) as their primary reference group through middle childhood and adolescence. Key developmental shifts:
- Parallel play (age 2–3) → Cooperative play (age 4+) → Rule-governed games (age 6+)
- Friendships become reciprocal and stable across middle childhood
- Peer acceptance predicts academic motivation and adjustment; peer rejection is a risk factor for school avoidance

Social status categories: Popular, Average, Neglected (low visibility), Rejected (actively disliked — aggressive-rejected vs. withdrawn-rejected), and Controversial. Teachers should monitor for rejected status, which is stable and requires intervention.

Bullying: Repeated aggressive behavior with a power imbalance. Types: physical, verbal, relational (social exclusion, rumor spreading), cyberbullying. Teachers who ignore bullying implicitly sanction it. Effective responses address the bystander audience, not just the bully and target.

EMOTIONAL DEVELOPMENT AND SELF-REGULATION
Emotional self-regulation — the ability to manage emotional responses in service of goals — is one of the most powerful predictors of school success. Components:
- Recognizing one's own emotional state
- Understanding that emotions can be managed
- Selecting and implementing regulatory strategies (deep breathing, reframing, taking space)
- Recovering from emotional disruption without prolonged dysregulation

Regulation capacity depends on executive function (prefrontal cortex), which is immature in children and adolescents. This means dysregulation is developmentally normal — and responding to it with more emotional intensity (a teacher who escalates when a student escalates) makes it worse.

Social-Emotional Learning (SEL): The Collaborative for Academic, Social, and Emotional Learning (CASEL) framework identifies five SEL competencies: self-awareness, self-management, social awareness, relationship skills, and responsible decision-making. Meta-analyses show SEL programs improve academic achievement by 11 percentile points on average in addition to improving social behavior.

IDENTITY FORMATION IN ADOLESCENCE
James Marcia extended Erikson's identity stage into four statuses based on two dimensions — exploration (have you considered alternatives?) and commitment (have you made a choice?):
- Identity Diffusion: No exploration, no commitment. Often associated with low motivation.
- Identity Foreclosure: Commitment without exploration — adopting parents' values without questioning. Stable but fragile under challenge.
- Identity Moratorium: Active exploration without commitment — the healthy "trying on" of identities. Often marked by anxiety.
- Identity Achievement: Exploration completed, commitment made from an informed position. Associated with highest psychological well-being.

Schools that offer diverse curriculum, extracurricular activities, and mentoring support moratorium and achievement. Schools that demand conformity and offer no exploration opportunities push students toward foreclosure or diffusion.

DISCUSSION QUESTIONS
1. A student who has an avoidant attachment history is consistently dismissive when teachers try to help her. How should you interpret this behavior, and how might you respond differently knowing her developmental background?
2. Why might a student who is socially rejected at school also show declining academic motivation? What can a teacher do about this?
3. How does understanding emotional development change how you would respond to a 7th-grader who has a meltdown over a failing grade?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Language Acquisition',
        materialType: 'lecture',
        content: `MODULE 4: LANGUAGE ACQUISITION
Developmental Milestones, Bilingualism, and Supporting ELL Students

THEORIES OF LANGUAGE ACQUISITION
How do children acquire language? This is one of the most debated questions in cognitive science.

Behaviorist View (Skinner): Language is learned through imitation, reinforcement, and shaping. Adults model language; children imitate; correct production is reinforced. Problem: Children produce novel sentences they've never heard ("I goed to the store"), suggesting they are not just imitating — they are extracting and applying rules.

Nativist View (Chomsky): Humans have a Language Acquisition Device (LAD) — innate biological structures that are pre-tuned for language. The existence of a Universal Grammar (shared deep structure across all human languages) supports this. Critical evidence: children everywhere acquire language at roughly the same rate following the same sequence, regardless of how much explicit instruction they receive.

Interactionist View (current consensus): Both nature (biological readiness) and nurture (social interaction, input quality) are essential. Infants are born with special sensitivity to language sounds and social contingency. Rich, responsive interaction with caregivers drives development.

DEVELOPMENTAL MILESTONES
Birth–6 months: Cooing, vocal play; responds to human voice; distinguishes native from non-native phonemes.
6–12 months: Babbling (consonant-vowel combinations); responds to own name; first words emerge around 10–12 months.
12–18 months: Single-word utterances (holophrases — one word communicates whole meaning); vocabulary grows ~10 words/week at 16+ months.
18–24 months: Two-word combinations ("more milk," "daddy go"); vocabulary explosion (50–200+ words); receptive vocabulary far exceeds expressive.
2–3 years: Telegraphic speech (3-4 words); grammatical morphemes emerge (adding -ing, -s, -ed). Errors reveal rule learning: "foots," "goed," "mouses" (overgeneralization).
3–5 years: Complex sentences; questions; negatives; narrative structure emerges; vocabulary grows 5–10 new words/day.
School age (5–12): Vocabulary grows 10,000–40,000 words; metalinguistic awareness (thinking about language); narrative skills; reading and writing.
Adolescence: Abstract language; hypothetical and figurative language; academic register.

Critical Period Hypothesis: Language acquisition is easiest during a sensitive period (roughly birth through puberty). After the critical period, achieving native-like fluency becomes progressively more difficult (especially phonology). Evidence: feral children who had no language input until adolescence never fully acquired language; late second-language learners rarely achieve native accent.

BILINGUALISM
Simultaneous Bilingualism: Acquiring two languages from birth. Children briefly code-mix (mix languages in one utterance) — this is normal and not a sign of confusion; it reflects sophisticated pragmatic awareness of when each language is appropriate.

Sequential Bilingualism: Learning a second language after the first is established. The stronger the first language (L1) foundation, the faster second language (L2) acquisition.

Common Misconceptions:
- Bilingualism does NOT cause language delays. Bilingual children may have smaller vocabularies in each language separately but equivalent total vocabulary (across both languages combined).
- Home language use does NOT impede English acquisition. Maintaining L1 actually supports L2 learning.
- Code-switching is NOT sloppy language use — it is a sophisticated communicative skill.

ENGLISH LANGUAGE LEARNERS (ELL) IN THE CLASSROOM
Basic Interpersonal Communication Skills (BICS): Conversational fluency — achievable in 1–3 years of immersion.
Cognitive Academic Language Proficiency (CALP): Academic language proficiency needed for grade-level content — takes 5–7 years to develop. The gap between BICS and CALP catches many teachers off guard: a student who seems conversationally fluent may still struggle with academic texts.

Sheltered English strategies for ELL support:
- Pre-teach key vocabulary before content instruction
- Use visuals, realia, and graphic organizers
- Provide native language support when possible
- Allow extended wait time
- Accept responses in native language initially; gradually expect English
- Check for understanding frequently (not "do you understand?" — use performance checks)

DISCUSSION QUESTIONS
1. A parent of a 3-year-old is worried because her child says "I goed to the park" and "She runned fast." Should the parent be concerned? What does this behavior reveal about language development?
2. A student recently arrived from Mexico speaks English conversationally but is failing content-area classes. How would you explain this to a skeptical teacher who says "she speaks English fine"?
3. What does the critical period hypothesis suggest about the best age to introduce a second language in schools? What policy implications does this have?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Diverse Learners — IEPs, Differentiation, and Cultural Responsiveness',
        materialType: 'lecture',
        content: `MODULE 5: DIVERSE LEARNERS
IEPs, Differentiation, and Cultural Responsiveness

LEGAL FOUNDATIONS
The Individuals with Disabilities Education Act (IDEA, 2004) guarantees students with disabilities a Free Appropriate Public Education (FAPE) in the Least Restrictive Environment (LRE). Key provisions:
- Every eligible student with a disability receives an Individualized Education Program (IEP).
- LRE means placement in the general education classroom to the maximum extent appropriate, with supplementary aids and supports.
- Parents are full partners in the IEP process with due process rights.
- Disability categories under IDEA include specific learning disability, speech/language impairment, autism spectrum disorder, emotional disturbance, intellectual disability, and others.

Section 504 of the Rehabilitation Act: Broader than IDEA — covers any student with a disability that substantially limits a major life activity. No specialized instruction required, but accommodations are provided (extended time, preferential seating, reduced distraction testing environment). A student with ADHD who doesn't qualify for IDEA may receive a 504 plan.

INDIVIDUALIZED EDUCATION PROGRAMS (IEPs)
An IEP is a legally binding document developed by a team including: the student's general education teacher(s), a special education teacher, a school administrator, the parent/guardian, the student (when appropriate), and any relevant specialists.

Components of an IEP:
1. Present Levels of Academic Achievement and Functional Performance (PLAAFP)
2. Measurable Annual Goals (academic and functional)
3. Special Education and Related Services to be provided
4. Supplementary Aids and Accommodations
5. Participation in Statewide Assessments (with or without accommodations)
6. Transition Planning (beginning at age 16)

General education teachers' responsibilities: implement accommodations as written, collect and share progress data, attend IEP meetings when required, and communicate with special education co-teachers. Failure to implement an IEP can expose the school to legal liability.

DIFFERENTIATED INSTRUCTION (DI)
Differentiated instruction (Carol Ann Tomlinson) is proactively planning instruction to address the diverse readiness levels, learning profiles, and interests in a classroom. Not tracking; not giving some students less. Key principle: Same learning goals, different pathways.

Teachers can differentiate through:
- Content: What students learn/access (varied texts, leveled resources, pre-taught vocabulary)
- Process: How students make sense of content (tiered activities, choice boards, think-time variations)
- Product: How students demonstrate learning (written, oral, visual, performance options)
- Learning Environment: Flexible seating, quiet zones, collaborative and independent work options

Tiered Activities: Same core concept, three levels of complexity. Level 1 works with the concept in a concrete, supported way; Level 2 at grade level; Level 3 extends and applies in novel contexts.

Universal Design for Learning (UDL): A proactive framework for designing instruction accessible to all learners from the start, rather than retrofitting accommodations. Three principles:
- Multiple Means of Representation (the "what" of learning): Present information in multiple formats — text, audio, video, graphic.
- Multiple Means of Action and Expression (the "how" of learning): Allow students to demonstrate knowledge in multiple ways.
- Multiple Means of Engagement (the "why" of learning): Offer choices that tap interest, support self-regulation, and vary challenge.

CULTURAL RESPONSIVENESS
Culturally Responsive Teaching (Gloria Ladson-Billings, Geneva Gay) recognizes that academic content and pedagogical approaches are not culturally neutral — they reflect particular cultural values and communication styles. Students from non-dominant cultural backgrounds often experience a "cultural mismatch" between home culture and school culture.

Key practices:
- Build on students' cultural assets and prior knowledge (funds of knowledge)
- Represent diverse perspectives in curriculum and examples
- Use varied communication structures (not just individual-competitive, but also collaborative, call-and-response, storytelling)
- Examine implicit biases — research shows teachers' expectations and disciplinary decisions are influenced by race, class, and gender
- Create an inclusive classroom community where all students see themselves represented

DISCUSSION QUESTIONS
1. A student has an IEP requiring extended time on tests. The general education teacher argues this is "unfair" to other students. How would you respond?
2. What is the difference between accommodation and modification in special education? Why does the distinction matter for instructional planning?
3. A teacher realizes all of her examples in science class feature White, male scientists. Is this a problem? What developmental harm (if any) might this cause?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Classroom Environment — Behavior Management and Motivation',
        materialType: 'lecture',
        content: `MODULE 6: CLASSROOM ENVIRONMENT
Behavior Management Approaches and Motivation Theory

CREATING A PRODUCTIVE LEARNING ENVIRONMENT
The physical and social environment of the classroom profoundly affects learning. Effective classroom management is not about controlling students — it is about creating conditions where learning can happen. The most effective classroom managers prevent problems through clear routines, engaging instruction, and strong relationships rather than reacting to them.

BEHAVIOR MANAGEMENT APPROACHES
Applied Behavior Analysis (ABA) / Behavioral Approach: Based on operant conditioning. Use reinforcement to increase desired behaviors; ignore or impose consequences for undesired behaviors. Token economies, behavior contracts, and positive behavioral interventions and supports (PBIS) draw on this framework.
- Strength: Clear, measurable, works quickly for targeted behaviors.
- Limitation: Extrinsic rewards can undermine intrinsic motivation for interesting tasks (overjustification effect).

Positive Behavioral Interventions and Supports (PBIS): A school-wide, tiered framework (Tier 1: universal supports for all students; Tier 2: targeted supports for some; Tier 3: intensive individualized supports for a few). Focuses on proactively teaching behavioral expectations (not assuming students know them), acknowledging positive behavior, and using data to make decisions.

Restorative Practices: Rather than punitive responses to misbehavior (suspension, detention), restorative approaches focus on repairing harm and restoring relationships. Restorative circles, problem-solving conversations, and community-building structures. Evidence suggests restorative practices reduce recidivism and racial disparities in discipline. Suspensions and expulsions (punitive exclusion) do not reduce future misbehavior and cause significant academic harm.

Culturally Responsive Classroom Management (CRCM): Research consistently shows Black and Latino students receive harsher discipline for identical behaviors compared to White peers. CRCM requires teachers to examine their own assumptions, build authentic relationships, and avoid zero-tolerance policies that drive the school-to-prison pipeline.

Proactive Strategies (most effective):
- Explicitly teach and practice classroom routines and procedures at the start of the year
- Arrange physical space to support movement flow and minimize conflicts
- Use high rates of positive specific praise ("I notice you re-read the paragraph before answering")
- Give students choice and voice — students who feel agency are less likely to resist
- Build genuine relationships — students work harder for teachers they believe care about them

MOTIVATION THEORY
Self-Determination Theory (Deci and Ryan): Intrinsic motivation (doing something for its inherent interest and satisfaction) is sustained by three basic psychological needs:
1. Autonomy: Feeling that one's actions are self-chosen. Providing choice — even limited choice within a structure — supports autonomy.
2. Competence: Feeling effective and capable. Optimally challenging tasks (in the ZPD) support competence; tasks too easy or too hard undermine it.
3. Relatedness: Feeling connected to others. Belonging in the classroom community supports motivation.

External rewards can undermine intrinsic motivation for already-interesting tasks (overjustification effect) but can support motivation for tasks students don't initially find interesting — if delivered informationally rather than controllingly ("you met the reading goal" vs. "here's your prize for doing what I said").

Attribution Theory (Weiner): Students explain their academic outcomes through attributions — causes assigned to success or failure. Key dimensions: internal/external (is the cause within me?), stable/unstable (will it always be this way?), controllable/uncontrollable.

Growth Mindset vs. Fixed Mindset (Dweck): Students who believe ability is fixed ("I'm not a math person") avoid challenge, give up when frustrated, and interpret failure as evidence of low ability. Students with growth mindset believe ability develops through effort and strategy — they embrace challenge and persist. Crucially, mindset is influenced by feedback: praising intelligence ("you're so smart") promotes fixed mindset; praising effort and strategy promotes growth mindset.

Expectancy-Value Theory (Eccles): Students are motivated when they (1) expect to succeed and (2) value the task — instrumentally (it will help me get into college), intrinsically (it's interesting), attainment value (it's important to my identity), or perceive low cost (not too much time/stress). Teachers can influence all four components.

DISCUSSION QUESTIONS
1. A student who loves drawing stops drawing for fun after her teacher starts giving stars and prizes for drawings. Using motivation theory, explain what happened and what the teacher should have done differently.
2. What is the difference between punishment and a logical consequence? Why does the distinction matter for building students' self-regulation?
3. Research shows that teacher-student relationship quality is the strongest predictor of student engagement. What specific behaviors build genuine teacher-student relationships?`,
      },
      {
        moduleNumber: 8,
        title: 'Lesson Plan Rubric',
        materialType: 'rubric',
        content: `EDC 280 LESSON PLAN RUBRIC
Assignment: Differentiated Lesson Plan (25% of course grade)
Total Points: 100 points
Length: 4–6 pages plus supplementary materials (handouts, assessments, etc.)
Due: End of Week 12 (Sunday 11:59 PM on Canvas)

GRADING CRITERIA

1. LEARNING OBJECTIVES (20 points)
- 18–20 pts: 2–3 specific, measurable objectives using action verbs (Bloom's Taxonomy); clearly aligned to grade-level state standard cited by number; objectives appropriate for developmental level of students.
- 14–17 pts: Objectives present and mostly measurable; standard cited; minor developmental appropriateness issue.
- 10–13 pts: Objectives vague or not measurable; standard cited but alignment unclear; developmental fit questionable.
- 0–9 pts: Objectives absent or simply describe activities rather than learning outcomes; no standard cited.

2. DEVELOPMENTAL APPROPRIATENESS (20 points)
- 18–20 pts: Lesson design explicitly references at least one developmental theory (Piaget, Vygotsky, Erikson, or other course theory) and explains how the theory informed instructional choices. Tasks are clearly appropriate for the stated grade level's cognitive and social-emotional development.
- 14–17 pts: Developmental theory referenced but connection to design is surface-level; tasks mostly appropriate.
- 10–13 pts: Developmental theory mentioned but not applied; some tasks seem developmentally mismatched.
- 0–9 pts: No developmental theory connection; clear developmental mismatch or omission.

3. DIFFERENTIATION STRATEGIES (25 points)
- 22–25 pts: At least two distinct differentiation strategies implemented (e.g., tiered activities, UDL options, ELL accommodations, IEP/504 considerations); each strategy clearly explained and connected to a specific learner need; differentiation is embedded in instruction, not an afterthought.
- 17–21 pts: Two strategies present; one is well-developed; explanation of learner need partially developed.
- 12–16 pts: Only one differentiation strategy; or strategies described but not connected to specific learner needs.
- 0–11 pts: No differentiation included; lesson designed for a single, homogeneous learner.

4. INSTRUCTIONAL ACTIVITIES AND SEQUENCE (20 points)
- 18–20 pts: Clear open/body/close structure; activities logically build toward objectives; transitions described; time estimates realistic; student engagement strategies (not lecture-only) used throughout.
- 14–17 pts: Structure present; some activities don't clearly connect to objectives; time estimates roughly plausible.
- 10–13 pts: Weak structure; activities disconnected; no transitions; or lesson is entirely lecture with no student engagement.
- 0–9 pts: Lesson plan is a topic outline rather than instructional design; activities absent or unclear.

5. FORMATIVE ASSESSMENT (15 points)
- 13–15 pts: At least one embedded formative assessment (exit ticket, think-pair-share, mini-whiteboard response, observation checklist, etc.) clearly described with an explanation of how data will be used to adjust instruction.
- 10–12 pts: Formative assessment present; explanation of data use limited.
- 7–9 pts: Assessment mentioned but not embedded in lesson flow; or summative-only assessment.
- 0–6 pts: No assessment included.

PENALTIES
- Late submission: –10 points per day
- Missing state standard citation: –5 points
- Lesson plan for a non-K-12 age group without prior approval: –10 points`,
      }
    ]
  },

  // ────────────────────────────────────────────────
  // NUR-201-STARTER — Foundations of Professional Nursing
  // College of Nursing
  // ────────────────────────────────────────────────
  {
    courseCode: 'NUR-201-STARTER',
    title: 'Foundations of Professional Nursing',
    description: 'Introduces the nursing profession, its scope of practice, and core clinical competencies. Students learn patient safety, therapeutic communication, basic clinical skills, and legal/ethical frameworks, with clinical practice in a simulated lab environment.',
    college: 'College of Nursing',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `NUR 201 — Foundations of Professional Nursing
College of Nursing, University of Kentucky
Spring 2026 | Lecture: MWF 8:00–8:50 AM | Health Sciences Learning Center 102
Clinical/Lab: Thursday 8:00 AM–4:00 PM (alternating weeks) | Nursing Skills Lab, CON 215

INSTRUCTOR
Dr. Katie Thompson, College of Nursing
Office: College of Nursing 318
Office Hours: Monday & Wednesday 9:00–10:30 AM; Friday 9:00–11:00 AM
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
NUR 201 establishes the foundation of professional nursing practice. Students learn the nursing process, patient safety principles, therapeutic communication, basic clinical skills, and the legal and ethical dimensions of nursing. The course integrates didactic instruction with simulation lab experiences. Prerequisite: Admission to the BSN program.

REQUIRED MATERIALS
- Kozier, B., Erb, G., Berman, A., & Snyder, S. (2024). Fundamentals of Nursing: Concepts, Process, and Practice (11th ed.). Pearson. ISBN: 978-0136937173
- Potter, P. A., Perry, A. G., Stockert, P. A., & Hall, A. M. (2023). Clinical Nursing Skills and Techniques (10th ed.). Mosby. ISBN: 978-0323827386
- Watch/clock with second hand (for pulse measurement)
- Stethoscope (Littmann Classic III recommended, minimum)
- Bandage scissors, penlight, pulse oximeter (available in skills lab)

GRADING BREAKDOWN
Written Exams (4 exams × 10%)           40%
Clinical Competency Checkoffs            30%
Care Plans (3 care plans)               20%
Professionalism and Participation       10%
TOTAL                                  100%

MINIMUM PASSING GRADE: 75% (C) is the minimum passing grade in all nursing courses. Students earning below 75% will not progress to the next nursing course regardless of overall GPA. A course grade below 75% requires repetition of the course before progression.

Grade Scale: A = 93–100, B = 85–92, C = 75–84, D = 65–74, E = below 65

EXAM SCHEDULE
Exam 1 (Week 3): Nursing profession, nursing process, documentation, safety culture
Exam 2 (Week 6): Patient safety, vital signs, health assessment
Exam 3 (Week 10): Communication, basic clinical skills, wound care
Exam 4 (Week 14): Legal/ethical issues, medication safety, care planning

All exams are proctored, 75 minutes, 50 NCLEX-style multiple-choice questions. No make-up exams without documented emergency submitted within 24 hours.

CLINICAL COMPETENCY CHECKOFFS (30%)
Skills checkoffs are faculty-observed demonstrations of clinical skills performed at a passing level. Students must pass each checkoff to progress. Checkoff Schedule:
- Week 4 Checkoff: Vital signs (temperature, pulse, respiration, blood pressure, oxygen saturation)
- Week 7 Checkoff: Head-to-toe physical assessment
- Week 9 Checkoff: Sterile technique and wound care dressing change
- Week 12 Checkoff: Medication administration (6 rights, dosage calculation, documentation)

Each checkoff has TWO attempts maximum. A student who fails the first attempt must remediate with the clinical instructor before the second attempt, which must occur within one week. Failure of the second attempt results in course failure and required repetition.

What happens if I fail a checkoff: You will be notified immediately following the failed attempt. You must schedule a remediation session with the clinical instructor within 48 hours. Remediation must be completed, and the second attempt must occur within one calendar week of the first attempt. No exceptions without dean approval.

CLINICAL ROTATION HOURS
Students participate in clinical simulation labs on alternating Thursdays (8:00 AM–4:00 PM). A minimum of 60 clinical hours must be completed to receive course credit. Attendance at ALL clinical lab days is mandatory. Unexcused absence from clinical lab results in an automatic course failure.

UNIFORM AND EQUIPMENT REQUIREMENTS
Clinical lab uniform: Navy blue scrubs (top and bottom), white lab coat with UK College of Nursing patch, closed-toe white shoes (leather or leather-like, no canvas). Hair pulled back and secured. No visible tattoos on hands or face. No false nails or nail polish in clinical.

Equipment required by Week 4: Stethoscope (Littmann Classic III or equivalent), watch with second hand, bandage scissors, penlight.

Students who arrive to clinical lab out of uniform will be sent home and the absence will be counted as unexcused.

CARE PLANS (20%)
Students complete three formal nursing care plans during the semester (due Weeks 5, 9, and 13). Each care plan includes: patient assessment data (from case study provided), NANDA nursing diagnosis, related factors, defining characteristics, measurable outcomes, nursing interventions with rationale, and evaluation. See Care Plan Guidelines on Canvas. Late care plans: –10 points per day.

PROFESSIONALISM (10%)
Professionalism includes: punctual attendance, respectful conduct in class and lab, professional communication with peers and faculty, preparation for skills lab, appropriate use of technology (no phones in clinical lab unless directed), and adherence to HIPAA during any patient-related discussions.

ACADEMIC INTEGRITY AND HIPAA
All patient information encountered in clinical settings is confidential under HIPAA. Discussing patient cases outside of supervised educational settings (including on social media) is a federal violation and grounds for immediate dismissal from the nursing program. All written work must reflect original effort; AI generation of clinical documentation is prohibited.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Nursing Profession',
        materialType: 'lecture',
        content: `MODULE 1: THE NURSING PROFESSION
History, Scope of Practice, and the Nursing Process

HISTORY OF NURSING
Nursing as an organized profession emerged in the 19th century, primarily through the work of Florence Nightingale (1820–1910). During the Crimean War, Nightingale reduced mortality in British military hospitals from 40% to 2% by implementing sanitation, nutrition, and organized care standards — demonstrating for the first time that nursing interventions save lives. Her Notes on Nursing (1859) articulated nursing as a discipline requiring training and systematic observation. Nightingale also pioneered the use of statistical graphics (polar area diagrams) to communicate health data to policymakers.

Early nursing education in the U.S. began with the establishment of Bellevue Hospital Training School (1873), Johns Hopkins School of Nursing (1889), and others modeled on Nightingale's program. For decades, nursing education was hospital-based (diploma programs), with nurses providing cheap labor in exchange for training. The shift to university-based education began in the mid-20th century; today the BSN (Bachelor of Science in Nursing) is the entry level for professional practice.

SCOPE OF PRACTICE
Nursing scope of practice defines what nurses are legally authorized to do — determined by the state Nurse Practice Act (NPA) and enforced by the State Board of Nursing (KSBN in Kentucky). Scope varies by license:
- Registered Nurse (RN): Assesses, plans, implements, and evaluates patient care; administers medications; performs clinical procedures within scope; delegates to unlicensed assistive personnel (UAP) appropriately.
- Licensed Practical Nurse (LPN/LVN): Provides basic nursing care under RN or physician supervision; limited assessment and medication administration authority.
- Advanced Practice Registered Nurse (APRN): Includes Nurse Practitioner (NP), Certified Nurse Midwife (CNM), Certified Registered Nurse Anesthetist (CRNA), Clinical Nurse Specialist (CNS) — have prescriptive authority and expanded scope.

Delegating outside scope of practice (a nurse asking a UAP to perform an assessment) or practicing beyond scope (an RN performing an action restricted to APRNs) is illegal and grounds for license revocation.

THE HEALTHCARE TEAM
Nursing practice occurs within an interprofessional team. Understanding roles prevents scope conflicts and supports teamwork:
- Physician/DO: Diagnoses and prescribes treatment; responsible for medical care
- RN: Coordinates care, implements orders, monitors patient status, educates patients
- Pharmacist: Verifies medication orders, counsels on drug interactions and patient education
- Physical/Occupational Therapist: Rehabilitation and functional improvement
- Social Worker: Psychosocial support, discharge planning, community resources
- Respiratory Therapist: Airway management, ventilator management
- UAP/CNA: Vital signs, hygiene, ambulation, feeding under RN supervision

INTERPROFESSIONAL COLLABORATION (TeamSTEPPS): Effective teamwork requires shared mental models, mutual support, communication tools (SBAR — covered in Module 4), and a safety culture where any team member can speak up about a concern.

THE NURSING PROCESS
The nursing process is a systematic, evidence-based approach to clinical decision-making that structures nursing care. It is cyclical, not linear — each phase informs the others.

ADPIE Mnemonic:
1. Assessment: Systematic collection of subjective (patient-reported: symptoms, history) and objective (nurse-observed/measured: vital signs, physical findings) data. Sources: interview, physical assessment, medical records, family, other team members.
2. Diagnosis (Nursing Diagnosis): Interpretation of assessment data to identify patient problems or risks. A nursing diagnosis differs from a medical diagnosis — it describes the patient's RESPONSE to a health condition, not the condition itself. Uses NANDA-I taxonomy. Example: "Impaired gas exchange related to decreased alveolar-capillary membrane changes as evidenced by SpO₂ 88% and dyspnea" vs. medical diagnosis "pneumonia."
3. Planning: Setting measurable, patient-centered outcomes and selecting nursing interventions. Outcomes must be SMART (Specific, Measurable, Attainable, Realistic, Time-bound). Prioritize using Maslow's hierarchy — physiological needs first.
4. Implementation: Carrying out the plan — performing assessments, administering medications, providing education, coordinating care, advocating for the patient. Document everything.
5. Evaluation: Comparing current patient status to stated outcomes. Were goals met? Partially met? Not met? Adjust the plan accordingly. Nursing care is dynamic — patients change.

CLINICAL DOCUMENTATION
"If it isn't documented, it wasn't done." Documentation is a legal record, a communication tool, and a billing document. Principles: accuracy, completeness, timeliness (document immediately or as soon as possible after care), objectivity (describe observations, not interpretations — "patient states he is in pain 8/10" not "patient was in pain"). Use approved abbreviations only.

DISCUSSION QUESTIONS
1. What distinguishes a nursing diagnosis from a medical diagnosis? Why does this distinction matter for how nurses plan care?
2. A fellow nursing student tells you he is going to delegate a patient assessment to a CNA because he is too busy. What would you say, and why?
3. Florence Nightingale used data (mortality statistics) to persuade military authorities to change hospital conditions. How does this connect to evidence-based practice today?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Patient Safety',
        materialType: 'lecture',
        content: `MODULE 2: PATIENT SAFETY
QSEN Competencies, Medication Safety, and Fall Prevention

THE PATIENT SAFETY MOVEMENT
In 1999, the Institute of Medicine (IOM) published "To Err Is Human," estimating that 44,000–98,000 Americans die each year from preventable medical errors — more than motor vehicle accidents, breast cancer, or AIDS at that time. This landmark report launched a national patient safety movement. Subsequent reports ("Crossing the Quality Chasm," 2001) defined quality healthcare as: Safe, Effective, Patient-Centered, Timely, Efficient, and Equitable (the 6 Aims).

QSEN COMPETENCIES
Quality and Safety Education for Nurses (QSEN) defines the knowledge, skills, and attitudes needed for quality and safety-competent nurses. Six competencies:
1. Patient-Centered Care: Recognize the patient as a full partner; respect values, preferences, and expressed needs; involve patients in care decisions.
2. Teamwork and Collaboration: Function effectively in interprofessional teams; communicate clearly; support a climate where colleagues can raise safety concerns.
3. Evidence-Based Practice (EBP): Integrate best research evidence with clinical expertise and patient values. Not "we've always done it this way."
4. Quality Improvement (QI): Use data to monitor outcomes; identify areas for improvement; participate in change processes.
5. Safety: Minimize risk through systems thinking; report near-misses and errors without blame; use standardized safety tools.
6. Informatics: Use electronic health records (EHR) effectively; protect patient privacy; use technology to support clinical decision-making.

MEDICATION SAFETY: THE SIX RIGHTS
Medication errors are among the most common and harmful medical errors. The Six Rights of Medication Administration must be verified before every administration:
1. Right Patient: Verify using TWO patient identifiers (name + date of birth, or name + medical record number). Never rely on room number or memory.
2. Right Medication: Compare the medication label to the order three times: when removing from storage, when preparing, and before administration.
3. Right Dose: Calculate independently; double-check with another nurse for high-alert medications (insulin, anticoagulants, opioids, chemotherapy).
4. Right Route: Oral, IV, IM, SubQ, topical, etc. — route is specified in the order and must match preparation. Never convert between routes without a new order.
5. Right Time: Administer within the acceptable window (usually 30 minutes before or after the scheduled time); PRN medications require assessment before administration.
6. Right Documentation: Document immediately after administration — never before. Record dose given, route, site (for injections), patient response.

High-Alert Medications (ISMP list): Require extra precautions — insulin, heparin, warfarin, concentrated electrolytes, opioids, neuromuscular blocking agents. Many institutions require independent double-check by two nurses.

Medication Error Reporting: All errors and near-misses must be reported — not to punish nurses, but to identify system failures. The Just Culture model distinguishes between human error (system failure), at-risk behavior (needs coaching), and reckless behavior (needs discipline). Fear of punishment suppresses reporting and hides safety information.

FALL PREVENTION
Falls are the most common adverse event in healthcare settings; approximately 1 million falls per year in U.S. hospitals. 30% result in injury; fall-related injuries are a leading cause of patient harm and liability.

Fall Risk Assessment: The Morse Fall Scale (MFS) and STRATIFY assess: history of falls, secondary diagnoses, ambulatory aid use, IV/heparin lock, gait, and mental status. Score determines risk level and required interventions.

Fall Prevention Interventions by risk level:
Universal (all patients): Orient to environment; call light within reach; non-slip footwear; keep floor clear; bed in lowest position with brakes locked; frequent rounding.
Moderate Risk: Bed alarm activated; toileting schedule; assistive devices available.
High Risk: Hourly rounding; fall prevention mat; consider 1:1 supervision; yellow fall-risk identification bracelet.

Post-Fall Management: Assess for injury; notify physician; complete incident report; comfort and reassure patient; notify family; re-assess fall risk and revise care plan.

RESTRAINT POLICY
Physical or chemical restraints are a last resort after all alternatives exhausted. Requires physician order; reassessment every 2 hours; documentation of continued need; patient/family education and consent. Restraints have serious risks: pressure injury, aspiration, death. The Joint Commission mandates minimizing restraint use.

DISCUSSION QUESTIONS
1. A nurse realizes she gave the wrong dose of a medication but the patient appears fine. Does she need to report it? What should she do?
2. Using Just Culture principles, how should a hospital respond when a nurse makes a medication error? What factors determine whether the response is supportive vs. disciplinary?
3. Why does asking a patient "do you understand?" not actually confirm understanding? What are better assessment strategies for patient education?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Health Assessment',
        materialType: 'lecture',
        content: `MODULE 3: HEALTH ASSESSMENT
Vital Signs and the Head-to-Toe Assessment

VITAL SIGNS: THE FOUNDATION OF CLINICAL MONITORING
Vital signs are the most basic and most important clinical measurements — they provide an objective snapshot of physiological status and alert nurses to deterioration before it becomes a crisis. The five vital signs: temperature, pulse (heart rate), respirations (respiratory rate), blood pressure, and oxygen saturation (SpO₂). Pain is sometimes called the "fifth vital sign" and is assessed with each vital signs check.

TEMPERATURE
Normal adult range: 36.1–37.2°C (97–99°F) oral.
Routes and ranges: Oral (most common), tympanic (ear, ±0.5°F oral equivalent), axillary (armpit, subtract 0.5°F), rectal (most accurate, add 0.5°F), temporal artery (forehead). Document the route.
Fever (pyrexia): ≥38.0°C (100.4°F). Hyperthermia: elevated temp not caused by infection. Hypothermia: <35°C (95°F) — emergency. Nursing actions: report temperature outside normal range per facility protocol; implement cooling or warming measures as ordered; assess for underlying cause.

PULSE (HEART RATE)
Normal adult: 60–100 beats per minute (bpm).
Assess: rate (count for 60 seconds for irregular rhythm; 30 seconds × 2 for regular), rhythm (regular vs. irregular — document if irregular), quality/amplitude (strong vs. weak/thready), and bilaterally for peripheral pulses.
Assessment sites: radial (routine), apical (use stethoscope at 4th–5th intercostal space, midclavicular line — use for infants, irregular rhythms, cardiac medications), brachial, carotid, femoral, popliteal, posterior tibialis, dorsalis pedis.
Tachycardia: >100 bpm. Bradycardia: <60 bpm. Apical-radial deficit: difference between apical and radial rate indicates some beats not strong enough to create peripheral pulse — common in atrial fibrillation.

RESPIRATIONS
Normal adult: 12–20 breaths per minute.
Assess: rate (count for 60 full seconds — count while appearing to still take pulse so patient doesn't consciously alter breathing), depth (shallow, normal, deep), and rhythm (regular vs. Cheyne-Stokes, Biot's, Kussmaul). Character: dyspnea (difficulty breathing), orthopnea (difficulty breathing lying flat), adventitious sounds on auscultation (crackles, wheezes, rhonchi).
Tachypnea: >20/min. Bradypnea: <12/min. Apnea: absence of breathing.

BLOOD PRESSURE
Normal adult: <120/80 mmHg. Hypertension: ≥130/80 (Stage 1). Hypotension: systolic <90 mmHg.
Systolic: pressure when heart contracts. Diastolic: pressure when heart relaxes. Pulse pressure = systolic – diastolic (normal 30–40 mmHg).
Technique: Patient seated, arm at heart level, correct cuff size (bladder 80% of arm circumference), no clothing over site, 5-minute rest, palpate brachial artery, inflate 20–30 mmHg above where pulse disappears, deflate 2–3 mmHg/second, document systolic (first Korotkoff sound) and diastolic (last sound disappears).
Common errors: cuff too small (falsely elevates reading), arm below heart level (falsely elevates), white coat hypertension.

OXYGEN SATURATION (SpO₂)
Normal: 95–100%. Concern: <90% requires immediate action; <95% warrants assessment.
Pulse oximetry: Infrared light through perfused tissue (finger, toe, earlobe) measures ratio of oxygenated to deoxygenated hemoglobin. Limitations: unreliable with nail polish (use alternative site), poor peripheral perfusion, carbon monoxide poisoning (falsely normal), severe anemia.

HEAD-TO-TOE ASSESSMENT SEQUENCE
A systematic physical assessment ensures no area is missed. Use inspection, palpation, percussion, and auscultation (IPPA) — except abdomen: inspect, auscultate, percuss, palpate (to avoid altering bowel sounds).

Sequence: General appearance → Neurological (LOC using GCS; orientation × 4: person, place, time, event; pupils: PERRLA) → Head and face → Eyes, ears, nose, throat → Neck (lymph nodes, trachea midline, JVD) → Cardiovascular (heart sounds S1 S2, peripheral pulses, edema) → Respiratory (breath sounds: compare bilaterally, anterior and posterior — upper lobes, middle/lower lobes) → Abdomen (4 quadrants: bowel sounds × 4, tenderness, distension) → Musculoskeletal (ROM, strength grading 0–5, gait) → Integumentary (skin color, turgor, wound assessment, pressure injury risk using Braden Scale) → Genitourinary (urine output, characteristics) → Psychosocial (mood, affect, coping, support system)

Document all findings using objective, specific language. Note changes from baseline — changes matter more than single values.

DISCUSSION QUESTIONS
1. You measure a patient's blood pressure at 184/112. What do you do? Walk through the nursing process (assess, notify, document).
2. Why is it important to count respirations for a full 60 seconds for an irregular pattern, but 30 seconds × 2 is acceptable for regular rhythms?
3. A patient's SpO₂ reading is 98% but she is visibly short of breath and anxious. What do you do? Why shouldn't you simply trust the oximeter?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Communication in Nursing',
        materialType: 'lecture',
        content: `MODULE 4: COMMUNICATION IN NURSING
Therapeutic Communication and SBAR

COMMUNICATION AS A CLINICAL SKILL
Communication failures are implicated in approximately 80% of serious medical errors. It is not enough to know what is wrong with a patient — nurses must communicate that information clearly, at the right time, to the right person, in the right format. This module covers two essential communication competencies: therapeutic communication with patients and SBAR communication with the healthcare team.

THERAPEUTIC COMMUNICATION
Therapeutic communication is purposeful, goal-directed communication focused on the patient's needs and well-being. It differs from social conversation in that it maintains professional boundaries, is patient-centered, and aims to establish trust, gather accurate information, and support coping.

Core Therapeutic Techniques:
- Active Listening: Full attention — eye contact, open posture, nodding, minimal encouragers ("go on," "uh-huh"). Remove distractions. Silence is appropriate and powerful — resist filling every pause.
- Open-Ended Questions: "What brings you in today?" "How have you been sleeping?" Invite elaboration; cannot be answered yes/no.
- Reflection: Mirroring content or feeling back to the patient. "It sounds like you're frustrated with how this has been handled." Validates the patient's experience.
- Clarification: "I want to make sure I understand — you said the pain started two days ago after you ate?" Confirms accuracy; prevents assumptions.
- Summarization: Briefly recapping what the patient has shared at the end of an assessment segment. Confirms accuracy and shows you were listening.
- Touch: Appropriate, culturally sensitive therapeutic touch can comfort. Always ask permission; be aware that touch may be unwelcome for patients with trauma histories.

Non-Therapeutic Responses (avoid these):
- False Reassurance: "Everything will be fine." Closes communication; feels patronizing when the nurse doesn't know the outcome.
- Giving Advice: "If I were you, I would..." Undermines patient autonomy; assumes you know what's best.
- Changing the Subject: Deflects from the patient's expressed concern.
- Asking "Why" Questions: "Why didn't you take your medication?" Implies judgment; provokes defensiveness.
- Yes/No Questions for Assessment: Miss important information and signal that the nurse is in a hurry.

Cultural Considerations in Communication: Eye contact is respectful in some cultures and disrespectful in others. Physical proximity, touching, gender of caregiver, family involvement in care decisions — all vary by culture. Asking "What do you call this problem?" and "What do you think caused it?" (explanatory model approach) opens cross-cultural dialogue without assumptions.

SBAR COMMUNICATION
SBAR (Situation-Background-Assessment-Recommendation) is a standardized communication tool for nurse-to-physician and handoff communications. It provides a predictable structure that ensures critical information is conveyed efficiently. Developed in the U.S. Navy submarine service and adapted for healthcare.

The SBAR Framework:
S — Situation: What is happening RIGHT NOW? One or two sentences, specific.
"This is Nurse Price calling from 4-North about Mr. Jones in Room 412. He is having increasing shortness of breath."

B — Background: Relevant context. What is the patient's diagnosis? What has happened up to now?
"Mr. Jones is a 68-year-old admitted two days ago for CHF exacerbation. His last SpO₂ was 94% on 2L nasal cannula this morning. He has a history of COPD."

A — Assessment: Your clinical judgment. What do you think is going on?
"His SpO₂ has dropped to 87% on the same 2L. He is using accessory muscles to breathe and is anxious. I am concerned he is decompensating."

R — Recommendation: What do you need or what do you recommend?
"I'd like you to come assess him now. I have the crash cart available. Should I increase his oxygen and obtain a chest X-ray?"

Why SBAR works: It matches physician communication preferences (problem first, then background), forces the nurse to clarify their own clinical thinking (assessment), and makes explicit what action is needed (recommendation) — reducing the number of back-and-forth calls.

HANDOFF COMMUNICATION
A nursing handoff (change-of-shift report) uses a similar structure: current status, recent changes, pending actions, patient-specific concerns, anticipated events in the coming shift. Read-back (receiver repeats critical information) verifies accuracy. Bedside handoff (conducted at the patient's bedside with patient participation) is the current best practice — it engages the patient and allows visual verification.

DISCUSSION QUESTIONS
1. A patient starts crying during your assessment. What do you do? What do you say? What would be a non-therapeutic response?
2. Practice writing an SBAR communication for this scenario: Your patient, a 52-year-old post-op day 2 following knee replacement, has reported new chest pain (5/10) and is mildly short of breath. Her BP is 140/90, HR 108, RR 22, SpO₂ 93%.
3. Why is it non-therapeutic to give false reassurance even when your intent is to be comforting?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Basic Clinical Skills',
        materialType: 'lecture',
        content: `MODULE 5: BASIC CLINICAL SKILLS
Wound Care, Sterile Technique, and Specimen Collection

ASEPTIC AND STERILE TECHNIQUE
Infection control is the foundation of patient safety. Two levels of technique govern clinical care:

Medical Asepsis (Clean Technique): Reduces the number and spread of microorganisms. Practices: hand hygiene (the single most effective infection control measure), standard precautions (gloves for all contact with blood/body fluids), transmission-based precautions (contact, droplet, airborne based on pathogen).

Hand Hygiene (WHO 5 Moments):
1. Before patient contact
2. Before aseptic task
3. After body fluid exposure risk
4. After patient contact
5. After contact with patient's surroundings
Method: Soap and water (minimum 20 seconds, required for C. difficile); alcohol-based hand rub (when hands are not visibly soiled). Rub all surfaces: palms, backs of hands, between fingers, thumbs, fingertips, wrists.

Surgical Asepsis (Sterile Technique): Eliminates ALL microorganisms from a field or instrument. Required for: invasive procedures, IV catheter insertion, urinary catheter insertion, wound care for surgical or clean wounds, preparing IV medications.

Principles of Sterile Technique:
- A sterile field is contaminated if it contacts a non-sterile surface
- Sterile field is contaminated if it becomes wet (moisture wicks contaminants)
- Sterile items below waist level or out of direct vision are considered contaminated
- If in doubt about sterility — it is NOT sterile
- Only sterile items can be placed on a sterile field; add items without reaching across the field
- The edge (1 inch/2.5 cm border) of a sterile field is contaminated

WOUND CARE
Wound Assessment: Color (red = healing, yellow = infected/slough, black = necrotic); size (length × width × depth in cm); edges; surrounding skin; drainage (serous, serosanguineous, sanguineous, purulent); odor; pain. Document all parameters at every dressing change.

Wound Healing Phases:
1. Hemostasis (immediate): Vasoconstriction and platelet aggregation — clot formation stops bleeding.
2. Inflammatory Phase (days 1–4): Vasodilation, increased permeability, WBC migration to site. Signs: redness, warmth, swelling, pain. Normal; concerning if prolonged.
3. Proliferative Phase (days 4–21): Fibroblasts lay down collagen; granulation tissue fills wound; epithelialization at edges.
4. Maturation/Remodeling (weeks to years): Scar tissue reorganizes; wound gains tensile strength.

Wound Irrigation: Copious irrigation with normal saline removes debris and bacteria. Use adequate pressure (8–12 psi) from a 35-mL syringe with 18-gauge angiocath — enough to clean without traumatizing granulation tissue.

Dressing Selection: Dry sterile dressings for clean, non-exudating wounds. Moisture-retentive dressings (hydrocolloid, foam, alginate) for wounds requiring moist healing environment. Negative pressure wound therapy (VAC) for complex wounds. Provider orders required for dressing changes.

Pressure Injury Prevention: Braden Scale assesses risk (sensory perception, moisture, activity, mobility, nutrition, friction/shear). Prevention: reposition every 2 hours (or more frequently for high-risk), offloading devices (specialty mattresses), moisture management, adequate nutrition. Document skin condition with every assessment.

SPECIMEN COLLECTION
Accurate specimen collection is critical — errors in collection produce erroneous lab results and can lead to incorrect treatment.

Urine Specimens:
- Random urine: any time; routine urinalysis
- Clean-catch midstream: wash perineal area; begin stream, then collect midstream. Prevents contamination with external flora.
- 24-hour urine: Discard first void; collect ALL urine for exactly 24 hours; keep refrigerated. Measure total volume; send aliquot.

Blood Specimens: Order of draw matters (prevents additive contamination between tubes): Blood cultures → Light blue (citrate, coag) → Red/gold (serum) → Green (heparin) → Lavender/purple (EDTA, CBC) → Grey (fluoride, glucose).

Wound Culture: Use sterile swab; collect from wound bed (not exudate or edge); Z-stroke technique across clean wound area after irrigation; transport immediately.

Stool Specimens: Collect from bedpan (not toilet water); use clean container; required amount varies by test; some tests require refrigeration, others room temperature.

IV ACCESS BASICS: Purpose, complications (infiltration vs. extravasation — know the difference; extravasation of vesicant medications causes tissue necrosis), maintenance (flush before and after medication), and removal. IV catheter insertion taught in advanced clinical courses.

DISCUSSION QUESTIONS
1. You open a sterile package and a piece of equipment touches your sleeve. What do you do? Why?
2. A wound is documented as having "yellow, foul-smelling drainage with surrounding redness and warmth." What wound healing phase is disrupted and what might be occurring?
3. Why is the order of draw important for blood collection? What would happen if you drew the lavender-top tube before the light blue?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Legal and Ethical Issues in Nursing',
        materialType: 'lecture',
        content: `MODULE 6: LEGAL AND ETHICAL ISSUES IN NURSING
HIPAA, Informed Consent, and Scope of Practice

LEGAL FRAMEWORK FOR NURSING PRACTICE
Nursing practice is governed by: federal law (HIPAA, Medicare/Medicaid regulations), state law (Kentucky Nurse Practice Act, state criminal statutes), civil law (malpractice), institutional policies, and professional standards (ANA Code of Ethics, QSEN). Ignorance of the law is not a defense.

TYPES OF LEGAL LIABILITY
Criminal Liability: Willful harmful acts — assault, battery (unconsented touching), falsifying records. Can result in arrest, prosecution, and imprisonment. Extremely rare for nurses; reflects intentional wrongdoing.
Civil Liability (Malpractice / Professional Negligence): Unintentional failure to meet the professional standard of care that causes patient harm. Four elements must ALL be present:
1. Duty: A nurse-patient relationship existed (professional obligation to provide care).
2. Breach of Duty: The nurse failed to meet the standard of care (what a reasonably prudent nurse with the same education in the same situation would have done).
3. Causation: The breach caused the patient's injury (direct causal link).
4. Damages: The patient suffered actual harm (injury, disability, death, financial loss).

Common sources of nursing malpractice: medication errors, failure to assess/monitor, failure to report changes, falls (failure to implement prevention), equipment errors, communication failures.

HIPAA — HEALTH INSURANCE PORTABILITY AND ACCOUNTABILITY ACT (1996)
HIPAA's Privacy Rule protects Protected Health Information (PHI) — any information that identifies a patient and relates to their health condition, treatment, or payment. PHI includes name, address, date of birth, Social Security number, medical record number, diagnosis, treatment, photographs.

Permissible disclosures without consent: Treatment (sharing with care team), Payment (insurance billing), Operations (quality improvement, staff training). All other disclosures require patient authorization.

Minimum Necessary Standard: Disclose only the minimum information required for the purpose.

Violations: Social media posts about patients (even without name — if identifiable), discussing a patient in a hallway where others can hear, leaving a computer screen with patient information visible, sharing passwords. HIPAA violations carry civil penalties up to $50,000 per violation and criminal penalties up to 10 years imprisonment. Student nurses who violate HIPAA risk dismissal from the nursing program.

INFORMED CONSENT
Informed consent is both an ethical principle (respect for patient autonomy) and a legal requirement. A patient must be informed and must voluntarily consent before any treatment or procedure.

Elements of valid informed consent:
1. Disclosure: Nature of the procedure, purpose, material risks and benefits, alternatives (including no treatment), uncertainty.
2. Comprehension: Patient understands the information — use plain language, interpreters as needed, teach-back.
3. Voluntariness: Free from coercion; patient can refuse without penalty.
4. Competence: Patient has decision-making capacity (understand the information, appreciate consequences, reason, communicate a decision). Not the same as legal competence — capacity is specific to a decision.

Informed consent is obtained by the physician performing the procedure, not by the nurse. The nurse's role: verify the patient has signed (witness), assess whether the patient appears to understand, notify the physician if the patient expresses confusion or withdraws consent.

Special cases: Emergency exception (immediate life-threatening emergency when consent cannot be obtained). Minors (parents consent; mature minor doctrine in some states). Incompetent adults (surrogate decision-maker — healthcare power of attorney, guardian, or next of kin per Kentucky statute).

ANA CODE OF ETHICS
The American Nurses Association Code of Ethics (2015) has nine provisions:
1. Respect the dignity, worth, and uniqueness of every person
2. Nurse's primary commitment is to the patient
3. Promote, advocate for, and protect patient rights
4. Authority, accountability, and responsibility for nursing practice; duty of self-care
5. Same duties to self as to others; maintain integrity
6. Duties extend to the environment; improve healthcare
7. Advance the profession through contributions to practice, education, administration, and knowledge development
8. Collaborate to protect human rights and promote health diplomacy
9. Articulate nursing values; maintain integrity of the profession

SCOPE OF PRACTICE VIOLATIONS: REAL CONSEQUENCES
Practicing outside scope of practice (performing procedures authorized only for APRNs, physicians, or other licensed professionals) is illegal regardless of how competent you feel. Example: An RN independently prescribing medication without physician order is practicing medicine without a license. Consequences: loss of nursing license, civil liability, criminal charges, termination. When in doubt — consult and collaborate.

DISCUSSION QUESTIONS
1. A patient's family member calls the nurses' station and asks about the patient's diagnosis and test results. The family member says "I'm her husband." What do you do? What information, if any, can you disclose?
2. A patient is scheduled for surgery and just told you she no longer wants to proceed. The surgeon is already in the building. What is your obligation?
3. A nurse documents a patient assessment she didn't actually perform because she was too busy and "knew" what the results would be. What laws and ethical principles has she violated?`,
      },
      {
        moduleNumber: 8,
        title: 'Care Plan Rubric',
        materialType: 'rubric',
        content: `NUR 201 CARE PLAN RUBRIC
Assignment: Nursing Care Plan (3 care plans, each worth ~6.7% of grade; total 20%)
Total Points per Care Plan: 100 points
Due: Care Plan 1 — Week 5; Care Plan 2 — Week 9; Care Plan 3 — Week 13

Each care plan is based on a patient case study provided on Canvas. The care plan must include: assessment data, NANDA nursing diagnosis with related factors and defining characteristics, measurable patient outcomes, nursing interventions with rationale, and evaluation.

GRADING CRITERIA

1. PATIENT ASSESSMENT (15 points)
- 13–15 pts: Thorough, organized assessment data organized by body system or Gordon's Functional Health Patterns; clearly distinguishes subjective (S) from objective (O) data; all relevant case data incorporated; identifies normal vs. abnormal findings.
- 10–12 pts: Most data organized and identified; minor omissions; S/O sometimes confused.
- 7–9 pts: Assessment incomplete; significant omissions; does not distinguish S from O.
- 0–6 pts: Assessment absent or demonstrates fundamental misunderstanding of assessment data.

2. NURSING DIAGNOSIS (20 points)
- 18–20 pts: Correctly selected NANDA-I nursing diagnosis; format is complete (diagnostic label + related to + as evidenced by); related factors and defining characteristics taken directly from assessment data; diagnosis is a nursing diagnosis (not a medical diagnosis).
- 14–17 pts: Diagnosis correct; format mostly complete; minor errors in related factors or defining characteristics.
- 10–13 pts: Nursing diagnosis partially appropriate; format incomplete; related factors not well-connected to assessment data.
- 0–9 pts: Medical diagnosis used instead of nursing diagnosis; diagnosis absent; or major format error.

3. PATIENT OUTCOMES (20 points)
- 18–20 pts: 2–3 measurable, patient-centered, SMART outcomes directly related to the nursing diagnosis; includes a time frame; outcomes describe patient behavior (not nurse actions); realistic given the case context.
- 14–17 pts: Outcomes mostly measurable; time frames present; minor issues with specificity.
- 10–13 pts: Outcomes vague or not measurable; or outcomes describe nurse actions rather than patient outcomes.
- 0–9 pts: Outcomes absent; or outcomes are not related to the nursing diagnosis.

4. NURSING INTERVENTIONS WITH RATIONALE (30 points)
- 27–30 pts: 4–5 evidence-based interventions; each intervention includes a specific, evidence-based rationale cited from course textbook or clinical source; interventions are directly related to the nursing diagnosis and targeted toward stated outcomes; includes both independent (nurse-initiated) and collaborative (physician-ordered) interventions.
- 21–26 pts: 3–4 interventions; most have rationale; mostly evidence-based; most related to diagnosis/outcomes.
- 15–20 pts: Fewer than 3 interventions; rationale absent or generic ("to improve patient condition"); weak connection to diagnosis.
- 0–14 pts: Interventions absent or irrelevant; no rationale provided.

5. EVALUATION (15 points)
- 13–15 pts: Clear evaluation statement for each outcome — whether met, partially met, or not met — with specific evidence from case data; if not met, revised plan documented.
- 10–12 pts: Evaluation present; mostly specific; minor omissions.
- 7–9 pts: Evaluation superficial ("patient is improving") without specific outcome evidence.
- 0–6 pts: Evaluation absent; or contradicts case data.

PENALTIES
- Late submission: –10 points per day
- Missing NANDA citation for diagnosis: –5 points
- Using a medical diagnosis as the nursing diagnosis: –10 points (after first care plan)`,
      }
    ]
  },


  // ────────────────────────────────────────────────
  // LAW-501-STARTER — Civil Procedure
  // J. David Rosenberg College of Law
  // ────────────────────────────────────────────────
  {
    courseCode: 'LAW-501-STARTER',
    title: 'Civil Procedure',
    description: 'A first-year law school course covering the rules governing the conduct of civil litigation in federal court. Topics include personal and subject matter jurisdiction, pleading standards, discovery, summary judgment, and appeals. Uses the Socratic method throughout.',
    college: 'J. David Rosenberg College of Law',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `LAW 501 — Civil Procedure
J. David Rosenberg College of Law, University of Kentucky
Spring 2026 | MWF 9:00–10:00 AM | Law Building Room 110
4 Credit Hours

INSTRUCTOR
Professor Katie Thompson
Office: Law Building 245
Office Hours: Tuesday & Thursday 2:00–4:00 PM; additional hours by appointment
Email: katie.thompson@uky.edu (email used for administrative matters only; legal questions addressed in class or office hours)

COURSE DESCRIPTION
Civil Procedure is a required first-year course examining the rules, doctrines, and policies governing civil litigation in the federal courts. We will work through the Federal Rules of Civil Procedure (FRCP) and the constitutional constraints on federal court jurisdiction. The course uses the Socratic method exclusively. Students are expected to have completed the assigned reading before every class session and must be prepared to be called upon at any time.

REQUIRED MATERIALS
- Main, T. O. & Pardieck, A. M. (2023). Civil Procedure: A Context and Practice Casebook (4th ed.). Carolina Academic Press. ISBN: 978-1531024840
- Federal Rules of Civil Procedure (current) — free at uscourts.gov; print copy recommended
- Bluebook: A Uniform System of Citation (21st ed.) — required for written memo

GRADING BREAKDOWN
Final Examination                80%
Written Memorandum (Week 13)    10%
Cold-Call Participation          10%
TOTAL                           100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, F = below 60
Law school grading uses a mandatory curve; median grade for 1L courses is B/B+.

FINAL EXAMINATION STRUCTURE
The final exam is a 4-hour, closed-book, written essay examination administered during the finals period. Students may bring the FRCP statutory supplement (unannotated). The exam consists of: one long essay (a multi-issue fact pattern requiring issue-spotting and analysis), and two shorter issue-specific problems. Exam is administered through ExamSoft on law school-issued computers.

WRITTEN MEMORANDUM (10%)
A single 8–10 page legal memorandum analyzing a civil procedure problem (assigned in Week 10). Format: IRAC (Issue, Rule, Application, Conclusion). Bluebook citations required throughout. Due end of Week 13 (Sunday 11:59 PM via Canvas). No late memos accepted without documented emergency submitted 48 hours in advance.

SOCRATIC METHOD AND COLD-CALL POLICY
This course uses the Socratic method exclusively. Each class session, the professor will call on students without prior notice. Cold-call participation constitutes 10% of the grade, evaluated on: preparation (did you read and brief the case?), analytical quality (can you engage with follow-up questions?), and intellectual honesty (it is far better to say "I don't know" than to bluff).

Students who have not prepared for class should notify the professor before class begins via email. Students may use one "pass" per semester without penalty. More than one unexcused pass results in participation grade reduction.

CASE BRIEFING REQUIREMENTS
All assigned cases must be briefed before class. A brief includes: Facts (legally relevant facts only), Issue (precise legal question), Holding (the court's answer to the issue), Reasoning (the court's justification — doctrine, policy, analogy), and Significance (how this case fits the doctrinal landscape). Briefs should be 1–2 pages maximum; verbosity is not depth. Students may be called to recite their brief verbatim.

NO LAPTOP POLICY
Laptops, tablets, and electronic devices are NOT permitted in the classroom except by prior approval for documented disability accommodation (coordinate with Student Accessibility Services and notify the professor). Research consistently shows handwritten notes improve learning outcomes in law school. Exceptions require written documentation submitted in Week 1.

WEEKLY SCHEDULE
Week 1  — Introduction: The federal court system; overview of a civil case lifecycle; Erie doctrine introduction
Week 2  — Personal Jurisdiction I: Traditional bases; Pennoyer v. Neff; minimum contacts doctrine
Week 3  — Personal Jurisdiction II: International Shoe; specific vs. general jurisdiction; Burger King and its progeny
Week 4  — Personal Jurisdiction III: Internet and stream of commerce; Asahi, J. McIntyre; current state
Week 5  — Subject Matter Jurisdiction I: Federal question jurisdiction (§1331); well-pleaded complaint rule
Week 6  — Subject Matter Jurisdiction II: Diversity jurisdiction (§1332); amount in controversy; complete diversity rule
Week 7  — Subject Matter Jurisdiction III: Supplemental jurisdiction (§1367); removal and remand
Week 8  — Pleading I: Historical context; notice pleading; FRCP Rule 8; Conley v. Gibson
Week 9  — Pleading II: The Twombly/Iqbal revolution; plausibility pleading standard; Rule 12(b)(6) motions
Week 10 — Pleading III: Rule 11 sanctions; amended pleadings (Rule 15); relation back doctrine (Written Memo assigned)
Week 11 — Discovery: Scope (FRCP 26); mandatory disclosures; interrogatories; depositions; document production; protective orders
Week 12 — Summary Judgment: FRCP Rule 56; no genuine dispute of material fact; Celotex standard; burden allocation
Week 13 — Trial and Judgment: Right to jury trial (7th Amendment); judgment as a matter of law (FRCP 50); Written Memo due
Week 14 — Appeals: Final judgment rule (28 U.S.C. §1291); interlocutory appeals; standards of review (de novo, abuse of discretion, clearly erroneous)
Week 15 — Review and Synthesis: Putting the civil litigation system together; exam preparation

ACADEMIC INTEGRITY
The honor code governs all work in this course. The written memorandum must be entirely your own work. You may discuss the assignment with classmates in general terms but may not share outlines, arguments, or drafts. All sources must be properly cited in Bluebook format. Plagiarism will result in a grade of F and referral to the Honor Council.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Personal Jurisdiction',
        materialType: 'lecture',
        content: `MODULE 1: PERSONAL JURISDICTION
Minimum Contacts, Specific vs. General Jurisdiction

THE CONSTITUTIONAL FOUNDATION
Personal jurisdiction (in personam jurisdiction) refers to a court's power over the parties to a lawsuit. Without personal jurisdiction over the defendant, any judgment entered is constitutionally void and unenforceable. The constitutional limits on personal jurisdiction are found in the Due Process Clause of the Fourteenth Amendment: a state may not exercise jurisdiction over a defendant in a manner that offends "traditional notions of fair play and substantial justice."

PENNOYER V. NEFF (1878): THE TRADITIONAL FRAMEWORK
The Supreme Court's decision in Pennoyer v. Neff established the traditional territorial theory of personal jurisdiction. The rule: a court has personal jurisdiction over a person only if (1) the defendant is physically present in the state when served with process, (2) the defendant is domiciled in the state, or (3) the defendant consents. For corporations, "presence" meant having an agent in the state.

Pennoyer's territorial framework reflected 19th-century realities where individuals rarely crossed state lines. It became increasingly unworkable as interstate commerce, travel, and corporate activity grew dramatically in the early 20th century. A corporation doing significant business in a state but incorporated elsewhere could escape jurisdiction entirely by not maintaining physical presence.

INTERNATIONAL SHOE CO. V. WASHINGTON (1945): THE MINIMUM CONTACTS REVOLUTION
International Shoe replaced Pennoyer's rigid territoriality with a flexible, contacts-based standard. The Supreme Court held that due process requires only that a defendant have "minimum contacts" with the forum state "such that the maintenance of the suit does not offend traditional notions of fair play and substantial justice." International Shoe itself had no physical office in Washington but employed salespeople who solicited orders there — this constituted sufficient "minimum contacts."

The minimum contacts inquiry asks:
1. Has the defendant purposefully availed itself of the privileges of conducting activities within the forum state (purposeful availment)?
2. Do the plaintiff's claims arise out of or relate to those contacts (specific jurisdiction) — or are the defendant's contacts so continuous and systematic that general jurisdiction is appropriate (general jurisdiction)?
3. Does the exercise of jurisdiction comport with fair play and substantial justice (fairness factors)?

SPECIFIC JURISDICTION
Specific jurisdiction: The plaintiff's claims arise directly from the defendant's contacts with the forum. The contacts and the cause of action must be related. Example: A defendant negotiates and performs a contract in Kentucky — Kentucky has specific jurisdiction over contract claims arising from that transaction.

Key cases:
- Hanson v. Denckla (1958): Purposeful availment requires the defendant to have reached out to the forum, not merely that the plaintiff is harmed there. A unilateral act by the plaintiff is insufficient.
- Burger King Corp. v. Rudzewicz (1985): A defendant need not be physically present in the forum; a defendant who deliberately reached out to a forum state through contract formation can be subject to jurisdiction there. Fairness factors (burden on defendant, plaintiff's interest, state's interest) may override strong contacts, but rarely do.
- Helicopteros Nacionales de Colombia v. Hall (1984): Mere purchases and training visits to a state do not confer general jurisdiction; and if the claim doesn't arise from those contacts, specific jurisdiction fails too.

GENERAL JURISDICTION
General jurisdiction: The defendant's contacts with the forum are so "continuous and systematic" that the defendant can be sued there on any claim, even unrelated claims. The standard is very high — after Goodyear Dunlop Tires (2011) and Daimler AG v. Bauman (2014), the Supreme Court dramatically narrowed general jurisdiction for corporations.

For corporations: General jurisdiction exists only in the state of incorporation AND the principal place of business ("nerve center"). Doing substantial business in a state is no longer sufficient for general jurisdiction. For individuals: general jurisdiction exists in the state of domicile.

STREAM OF COMMERCE AND THE INTERNET
Modern disputes: Does placing a product in the stream of commerce constitute purposeful availment if it ends up in a state? Asahi Metal Industry Co. v. Superior Court (1987) produced a fractured plurality — no majority agreed on the answer. World-Wide Volkswagen (1980) established that a defendant must target the forum; mere foreseeability of products reaching the forum is insufficient. J. McIntyre Machinery (2011) reaffirmed this, still without a majority rule on stream of commerce.

CASE BRIEF FORMAT EXAMPLE
Facts: International Shoe Co., a Delaware corporation headquartered in Missouri, employed between 11–13 salespeople in Washington state who showed product samples and solicited orders. Orders were sent to Missouri; shoes were shipped from Missouri. Washington sought unemployment compensation taxes; International Shoe challenged Washington's jurisdiction.
Issue: Does International Shoe's in-state sales activity constitute sufficient minimum contacts to support Washington's personal jurisdiction?
Holding: Yes. A defendant may be subject to personal jurisdiction even without physical presence if it has minimum contacts with the forum such that jurisdiction does not offend traditional notions of fair play and substantial justice.
Reasoning: The quality and nature of Shoe's activities — systematic solicitation in Washington generating significant revenue — created a relationship sufficient to justify jurisdiction over claims arising from those activities.
Significance: Established the modern "minimum contacts" test, replacing Pennoyer's rigid territoriality.

DISCUSSION QUESTIONS
1. A California company's website accepts orders from Kentucky customers and ships products to Kentucky. Does this constitute purposeful availment of Kentucky? Does it matter whether the company specifically targeted Kentucky customers or just had a passive website?
2. Why did the Supreme Court in Daimler narrow general jurisdiction for corporations so dramatically? What policy concerns motivated the decision?
3. If you are a plaintiff's attorney, which is more valuable — specific or general jurisdiction over the defendant? Why?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Subject Matter Jurisdiction',
        materialType: 'lecture',
        content: `MODULE 2: SUBJECT MATTER JURISDICTION
Federal Question, Diversity, and Amount in Controversy

SUBJECT MATTER JURISDICTION VS. PERSONAL JURISDICTION
Personal jurisdiction is about power over parties. Subject matter jurisdiction is about power over the type of case — does this court have authority to hear this kind of dispute? Unlike personal jurisdiction (which can be waived by consent), subject matter jurisdiction cannot be waived. A court that lacks subject matter jurisdiction must dismiss the case even if both parties prefer federal court and even if the case has been litigated for years. Subject matter jurisdiction can be raised at any time, including on appeal.

Federal courts are courts of limited jurisdiction — they can hear only cases authorized by Article III of the Constitution and by statute. State courts are courts of general jurisdiction — they can hear almost any case unless specifically excluded.

FEDERAL QUESTION JURISDICTION (28 U.S.C. §1331)
Federal courts have jurisdiction over cases "arising under" the Constitution, laws, or treaties of the United States. The vast majority of federal question cases involve: federal statutory claims (Title VII employment discrimination, Section 1983 civil rights, ERISA, antitrust), constitutional claims (First Amendment, due process, equal protection), and admiralty/maritime law.

The Well-Pleaded Complaint Rule (Mottley, 1908): Federal question jurisdiction must appear on the face of the plaintiff's well-pleaded complaint. It is not enough that the defendant plans to raise a federal defense. The federal issue must be an element of the plaintiff's own claim.

Example: A plaintiff sues for breach of contract to carry her on a railroad for life. The defendant raises a federal statute as a defense that extinguishes this obligation. Even though a federal statute is involved, the well-pleaded complaint rule denies federal question jurisdiction — the federal issue appears only in the defense, not in plaintiff's claim.

State law claims with embedded federal issues: Sometimes a state-law claim necessarily raises a federal issue (Grable & Sons Metal Prods. v. Darue Engineering). Federal jurisdiction is appropriate only when the federal issue is: (1) necessarily raised, (2) actually disputed, (3) substantial, and (4) capable of resolution in federal court without disrupting the balance between federal and state courts.

DIVERSITY JURISDICTION (28 U.S.C. §1332)
Federal courts have diversity jurisdiction when: (1) the parties are citizens of different states (complete diversity), AND (2) the amount in controversy exceeds $75,000 (exclusive of interest and costs).

Complete Diversity Rule (Strawbridge v. Curtiss, 1806): No plaintiff may be a citizen of the same state as any defendant. If there are multiple plaintiffs and defendants, every plaintiff must be diverse from every defendant.

Citizenship:
- Individuals: Citizens of the state where they are domiciled (physical presence + intent to remain indefinitely). Citizenship is determined at the time the complaint is filed.
- Corporations (28 U.S.C. §1332(c)(1)): Citizens of BOTH the state of incorporation AND the state where the principal place of business is located (the "nerve center" — where corporate officers direct, control, and coordinate corporate activities, per Hertz Corp. v. Friend, 2010).
- Unincorporated entities (partnerships, LLCs): Citizens of every state where any member is a citizen.

Amount in Controversy: The plaintiff must in good faith allege that the amount in controversy exceeds $75,000. Aggregation rules: a single plaintiff may aggregate multiple claims against a single defendant to meet the threshold. Multiple plaintiffs may NOT aggregate their separate claims. If the legal certainty is that the plaintiff cannot recover the threshold amount, dismissal is appropriate.

SUPPLEMENTAL JURISDICTION (28 U.S.C. §1367)
When federal jurisdiction exists over one claim, §1367 allows the court to exercise jurisdiction over additional state-law claims that "form part of the same case or controversy" (i.e., share a common nucleus of operative facts with the federal claim). This allows entire disputes to be resolved in one forum.

Important limit: In diversity cases, §1367(b) prohibits supplemental jurisdiction for claims by plaintiffs against parties brought in under Rules 14, 19, 20, or 24, or claims by parties joining as plaintiffs under Rule 19 or 24, when exercising such jurisdiction would destroy complete diversity.

REMOVAL (28 U.S.C. §1441)
A defendant may remove a case from state court to federal court if the case could have been filed in federal court originally. Removal is to the federal district embracing the state court. Procedure: Notice of removal filed within 30 days of receiving the complaint (or 30 days from becoming removable). All defendants must consent. A case cannot be removed based on diversity if any defendant is a citizen of the state where the case was filed.

Remand: If removed improperly, the district court will remand to state court. A remand order based on lack of subject matter jurisdiction is not appealable.

DISCUSSION QUESTIONS
1. A Kentucky citizen sues a Kentucky citizen and a Texas corporation in federal court, alleging federal trademark infringement and supplemental state-law unfair competition claims. Is there federal jurisdiction? What type?
2. Why does the well-pleaded complaint rule make the plaintiff "master of the complaint"? What strategic consequences follow?
3. Plaintiff files a complaint in state court in Delaware (plaintiff is a Delaware citizen, defendant is a Delaware corporation incorporated in Delaware with its nerve center in New York). Can defendant remove? Analyze carefully.`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Pleading — Rule 12(b)(6) and Twombly/Iqbal',
        materialType: 'lecture',
        content: `MODULE 3: PLEADING
Complaint Requirements, Rule 12(b)(6), and the Twombly/Iqbal Standard

THE PURPOSE OF PLEADING
Pleadings are the formal documents (complaint, answer, crossclaims, counterclaims) that initiate a lawsuit and define the claims and defenses at issue. Historically, pleading requirements varied widely. The Federal Rules of Civil Procedure (1938) introduced a liberal "notice pleading" standard designed to allow cases to proceed to discovery and merits resolution rather than being dismissed on technical grounds.

The pendulum has swung. Two Supreme Court decisions — Bell Atlantic Corp. v. Twombly (2007) and Ashcroft v. Iqbal (2009) — dramatically tightened the pleading standard by requiring "plausible" rather than merely possible claims. This shift has major consequences: a complaint that fails to meet the plausibility standard is dismissed under Rule 12(b)(6) before any discovery — potentially before a plaintiff can obtain the evidence she needs to prove the claim.

FRCP RULE 8: GENERAL PLEADING REQUIREMENTS
Rule 8(a)(2) requires a complaint to contain "a short and plain statement of the claim showing that the pleader is entitled to relief." Historically interpreted in Conley v. Gibson (1957) as requiring only that the complaint provide "fair notice of what the plaintiff's claim is and the grounds upon which it rests" — dismissal was inappropriate "unless it appears beyond doubt that the plaintiff can prove no set of facts in support of his claim."

THE TWOMBLY/IQBAL PLAUSIBILITY STANDARD
Bell Atlantic Corp. v. Twombly (2007): Antitrust plaintiffs alleged that telecommunications companies engaged in parallel conduct and had an agreement not to compete. The Court held that Conley's "no set of facts" standard had "earned its retirement." A complaint must allege "enough facts to state a claim to relief that is plausible on its face." Parallel conduct, standing alone, is as consistent with independent action as with conspiracy — it is not plausible.

Ashcroft v. Iqbal (2009): Extended Twombly beyond antitrust to all civil complaints. Iqbal, a Pakistani Muslim detained after 9/11, alleged that Attorney General Ashcroft and FBI Director Mueller adopted a policy of detaining Arab Muslim men based on race, religion, and national origin. The Court held that: (1) courts need not accept as true conclusory allegations or legal conclusions recited as facts; (2) well-pleaded factual allegations must then be assessed for plausibility.

THE TWO-STEP IQBAL ANALYSIS
Step 1: Identify and disregard any pleadings that are merely conclusory allegations or threadbare recitals of elements of a cause of action (these get no deference).
Step 2: Accept the remaining well-pleaded factual allegations as true and determine whether they plausibly give rise to an entitlement to relief. Plausibility means more than mere possibility — the factual content must allow the court to draw the reasonable inference that the defendant is liable.

Example: "Defendant discriminated against Plaintiff because of her race" — this is a conclusory allegation; discard it (Step 1). If the remaining factual allegations describe a pattern of treating similarly situated employees differently on the basis of race, that may be plausible (Step 2). If they merely restate the legal standard, the complaint fails.

RULE 12(b)(6): MOTION TO DISMISS FOR FAILURE TO STATE A CLAIM
A defendant may move to dismiss the complaint for failure to state a claim upon which relief can be granted. The court applies the Iqbal/Twombly standard. All well-pleaded factual allegations are accepted as true; all inferences drawn in the plaintiff's favor. The question is purely legal: even accepting all the alleged facts as true, does the complaint state a plausible claim?

Consequences of dismissal: The court typically grants leave to amend the first time unless amendment would be futile. A dismissal with prejudice bars re-filing.

RULE 11: SANCTIONS FOR FRIVOLOUS PLEADINGS
An attorney signing and filing a pleading certifies that: (1) it is not filed for an improper purpose (harassment, delay), (2) the legal contentions are warranted by existing law or non-frivolous argument for change, (3) the factual allegations have evidentiary support or will likely have support after reasonable discovery. Safe harbor: opposing party must provide 21-day notice before filing a Rule 11 motion; the offending party may withdraw the pleading.

DISCUSSION QUESTIONS
1. A plaintiff sues a major corporation for wage theft, alleging that "defendant willfully failed to pay plaintiff's lawful wages." Under Iqbal/Twombly, is this sufficient? What additional facts would the complaint need?
2. Critics argue Twombly/Iqbal unfairly disadvantages plaintiffs in complex cases (antitrust, civil rights) where evidence of wrongdoing is in the defendant's hands. Is this criticism valid? How should courts balance access to courts against protecting defendants from meritless suits?
3. If you represent the defendant, when is a Rule 12(b)(6) motion strategic? When might it be counterproductive?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Discovery',
        materialType: 'lecture',
        content: `MODULE 4: DISCOVERY
Scope, Tools, and Protective Orders

THE PURPOSE AND SCOPE OF DISCOVERY
Discovery is the pre-trial process by which parties gather information relevant to their claims and defenses. The broad scope of federal discovery — unique among court systems worldwide — reflects a policy judgment that informed, well-prepared parties are more likely to settle meritorious cases and try only genuinely disputed issues.

FRCP Rule 26(b)(1) defines the scope: "Parties may obtain discovery regarding any nonprivileged matter that is relevant to any party's claim or defense and proportional to the needs of the case." The proportionality factors: importance of issues, amount in controversy, parties' relative access to information, parties' resources, importance of discovery in resolving issues, and burden/expense versus benefit.

MANDATORY INITIAL DISCLOSURES (RULE 26(a))
Without awaiting a discovery request, parties must disclose: (1) the name, address, and telephone number of each individual likely to have discoverable information; (2) a copy or description of all documents/ESI the disclosing party may use to support its claims/defenses; (3) a computation of each category of damages; (4) any insurance agreement potentially covering a judgment.

DISCOVERY TOOLS
Interrogatories (Rule 33): Written questions answered in writing under oath. Limited to 25 questions per party (without court leave). Strategic use: identify witnesses, pin down key facts and contentions, identify documents to request. Limitation: answered by attorneys; may be evasive or formulaic.

Depositions (Rule 30): Oral questioning of a witness under oath, recorded by a court reporter or on video. Witnesses can be any person with relevant knowledge, not just parties. Limit: 10 depositions per side; 7 hours per deposition. Depositions are the most powerful discovery tool — the deponent's attorney cannot coach answers during questioning (objections preserved for the record, but the witness must still answer unless privilege is invoked).

Requests for Production (Rule 34): Requests for documents, ESI, and tangible things in a party's possession, custody, or control. Scope is very broad. A critical battleground in modern litigation is Electronically Stored Information (ESI): emails, texts, social media posts, databases. Litigation holds (preserving potentially relevant ESI when litigation is reasonably anticipated) are mandatory; failure = spoliation sanctions.

Requests for Admission (Rule 36): A party may request that another party admit or deny specific facts. Matters admitted are conclusively established for the litigation. Strategic use: narrow the issues; force the other side to take positions under oath.

Physical and Mental Examinations (Rule 35): Available only for relevant physical or mental conditions, and only by court order. Unlike other discovery tools, requires a showing of "good cause."

PRIVILEGE AND WORK PRODUCT
The attorney-client privilege protects confidential communications between attorney and client made for the purpose of seeking or providing legal advice. It belongs to the client. It is absolute — if it applies, the communication is not discoverable regardless of relevance.

Attorney Work Product (Rule 26(b)(3)): Documents and tangible things prepared by a party or its representative in anticipation of litigation or for trial are protected from discovery unless the requesting party shows substantial need and inability to obtain equivalent without undue hardship. Opinion work product (attorney's mental impressions, conclusions, legal theories) receives even stronger protection.

PROTECTIVE ORDERS (RULE 26(c))
A party may move for a protective order to limit discovery that would cause annoyance, embarrassment, oppression, or undue burden or expense. The court may: forbid disclosure, limit the scope, require that proceedings be sealed, require a trade secret be disclosed only to attorneys and experts, or limit who may receive the information. Confidentiality orders (stipulated protective orders) are common in business litigation to protect proprietary information.

SANCTIONS FOR DISCOVERY ABUSE
Courts have broad power to sanction discovery violations: default judgment against the violating party, striking pleadings, adverse inference instructions (the jury may infer that destroyed evidence was unfavorable), contempt, and attorneys' fees.

DISCUSSION QUESTIONS
1. Your client is a small startup sued by a large corporation. The corporation is demanding 10 depositions and 500,000 documents. What rule and what arguments would you make to limit this?
2. A client emails her attorney asking whether it is "okay to delete some emails" before a lawsuit is filed. What should the attorney do? What risk does this create?
3. Is the broad scope of American discovery good policy? What are the arguments for and against expansive pre-trial discovery?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Summary Judgment',
        materialType: 'lecture',
        content: `MODULE 5: SUMMARY JUDGMENT
Rule 56, Burden of Proof, and Celotex

THE ROLE OF SUMMARY JUDGMENT IN LITIGATION
Summary judgment (Rule 56) is a pre-trial mechanism for resolving claims without a full trial when there is no genuine dispute as to any material fact and the moving party is entitled to judgment as a matter of law. It is the most significant procedural tool in federal litigation — more cases end by summary judgment than by trial. It serves a gatekeeping function: filtering out cases where a reasonable jury could only find for one party.

THE RULE 56 STANDARD
FRCP Rule 56(a): "The court shall grant summary judgment if the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law."

Key terms:
- Material fact: A fact whose resolution could affect the outcome under governing substantive law. Disputes about immaterial facts — no matter how heated — do not preclude summary judgment.
- Genuine dispute: A dispute is genuine if a reasonable jury could return a verdict for the non-moving party. If the evidence is so one-sided that no reasonable factfinder could find for the non-movant, there is no genuine dispute.

The non-moving party is entitled to all reasonable inferences in their favor. But "reasonable" is key — speculation, conjecture, and theoretically possible but unsupported inferences are not enough.

THE CELOTEX TRILOGY
Three 1986 Supreme Court cases fundamentally clarified the operation of summary judgment, making it much easier to obtain.

Celotex Corp. v. Catrett (1986): The pivotal case on the movant's burden. Plaintiff sued Celotex for asbestos exposure causing her husband's death. Celotex moved for summary judgment, asserting that plaintiff had no evidence that Celotex products caused the exposure. The Court held: the moving party does NOT need to affirmatively disprove the non-movant's case. When the non-moving party bears the burden of proof at trial on an element, the movant may shift the burden simply by showing an absence of evidence supporting that element. The burden then shifts to the non-movant to produce specific facts showing a genuine dispute.

Anderson v. Liberty Lobby (1986): The evidentiary standard at summary judgment mirrors the trial standard — a judge grants summary judgment when, viewing all the evidence in the light most favorable to the non-movant, no reasonable jury could find in the non-movant's favor. In a defamation case requiring clear and convincing evidence (higher standard), that heightened standard applies at summary judgment.

Matsushita Electric Industrial Co. v. Zenith Radio Corp. (1986): When the non-movant's theory is implausible (a conspiracy theory that makes no economic sense), the non-movant must come forward with "more persuasive evidence than would otherwise be necessary" to survive summary judgment.

BURDEN SHIFTING FRAMEWORK
1. Moving party's initial burden: Show (a) no genuine dispute of material fact, OR (b) absence of evidence on an essential element. Need not produce affirmative evidence of own claim.
2. Non-moving party's burden: Cannot rest on the pleadings; must affirmatively point to specific evidence in the record creating a genuine dispute. Acceptable evidence: affidavits, deposition testimony, documents, interrogatory answers — all must be admissible in form at trial.

WHAT DOES NOT DEFEAT SUMMARY JUDGMENT
- The mere existence of a scintilla of evidence (Anderson)
- Self-serving affidavits uncorroborated by any other evidence in some courts
- Allegations in the pleadings (once discovery is complete)
- Arguments that the movant's witness lacks credibility (credibility is for the jury — but only if the non-movant has something that creates a genuine dispute)

DISCUSSION QUESTIONS
1. Why is summary judgment sometimes called "the judge acting as a jury"? What is the constitutional problem this raises, and how has the Supreme Court addressed it?
2. Your client has the burden of proof at trial on the element of causation. The defendant moves for summary judgment, pointing out that your expert witness was recently excluded in a different case. What do you need to produce to survive the motion?
3. A defendant moves for summary judgment in a breach of contract case. The only evidence in favor of the plaintiff is an email from which one could possibly infer an agreement, but the inference is strained. Is there a genuine dispute of material fact?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Appeals',
        materialType: 'lecture',
        content: `MODULE 6: APPEALS
The Final Judgment Rule, Interlocutory Appeals, and Standards of Review

THE FINAL JUDGMENT RULE
28 U.S.C. §1291 grants the courts of appeals jurisdiction over "final decisions of the district courts." The final judgment rule requires that parties wait until the trial court has fully resolved all claims before appealing. Rationale: (1) prevents piecemeal litigation and appellate interference before the trial court has completed its work; (2) promotes judicial efficiency — many issues become moot or irrelevant after trial; (3) preserves the trial court's authority to manage its own docket.

A judgment is final when it ends the litigation on the merits and leaves nothing for the court to do but execute the judgment (Catlin v. United States, 1945). Partial summary judgment on one of several claims is NOT a final judgment unless the court makes a specific finding under Rule 54(b).

EXCEPTIONS TO THE FINAL JUDGMENT RULE
1. Interlocutory Appeals by Right (28 U.S.C. §1292(a)): Automatic right to appeal certain orders even before final judgment. Includes: injunctions (grants, refusals, modifications); receivership orders; admiralty cases.

2. Certified Interlocutory Appeals (28 U.S.C. §1292(b)): The district court may certify a controlling question of law for interlocutory appeal if the question involves "controlling question of law as to which there is substantial ground for difference of opinion" and "immediate appeal may materially advance the ultimate termination of litigation." The court of appeals has discretion whether to accept. Rarely granted; courts jealously guard against piecemeal appeals.

3. The Collateral Order Doctrine (Cohen v. Beneficial Industrial Loan Corp., 1949): A narrow class of district court decisions that are: (1) conclusively determined, (2) completely separate from the merits, and (3) effectively unreviewable on appeal from final judgment. Examples: denials of qualified immunity (Mitchell v. Forsyth), denials of double jeopardy claims, orders to pay attorney's fees as a sanction.

4. Mandamus: An extraordinary writ compelling a lower court to act or refrain from acting within its jurisdiction. Available when the right to relief is clear and indisputable and no other adequate remedy exists. Used when a trial judge exceeds jurisdiction or clearly abuses discretion in a way that cannot be corrected by ordinary appeal.

STANDARDS OF REVIEW
The standard of review governs how much deference the appellate court gives to the trial court's determination. Understanding standards of review is essential to litigation strategy — some issues are worth appealing; others are almost never overturned.

De Novo ("anew"): The appellate court gives no deference to the district court; reviews the issue as if seeing it fresh. Applied to: questions of law, constitutional issues, Rule 12(b)(6) dismissals, summary judgment decisions, statutory interpretation. The most favorable standard for the appellant on pure legal questions.

Clearly Erroneous (Rule 52(a)): Applied to the trial court's findings of fact in a bench trial (judge, no jury). The appellate court will reverse only if it is "left with the definite and firm conviction that a mistake has been committed." Highly deferential — appellate courts recognize they did not see the witnesses, observe demeanor, or hear the evidence live.

Abuse of Discretion: Applied to matters where the trial court has discretionary authority — evidentiary rulings, scheduling, discovery sanctions, attorney's fees, Rule 11 sanctions. The appellate court reverses only if the trial court's decision was "arbitrary, capricious, or whimsical" or applied incorrect legal standards. Very difficult to win on appeal.

Sufficiency of Evidence (Jury Verdicts): Reviewed for whether any reasonable jury could have reached the verdict — a very deferential standard protecting the constitutional role of the jury.

PRESERVING ERROR FOR APPEAL
Critical principle: An appellate court will not consider an issue unless the party objected at trial with sufficient specificity. If you don't raise it at trial, you lose it on appeal (waiver). Exception: Plain error — when the error is obvious and affects substantial rights — courts have discretion to address even unpreserved issues.

Harmless Error (Rule 61): Even if an error occurred, the appellate court will not reverse unless the error affected a party's substantial rights. Small procedural errors that could not have changed the outcome are harmless.

DISCUSSION QUESTIONS
1. A defendant is denied qualified immunity on a civil rights claim. Can she appeal immediately? Under what doctrine, and why does this exception make sense?
2. A trial court makes an erroneous evidentiary ruling that excludes key evidence, but the jury still finds for the defendant. The defendant had wanted to offer additional damages evidence. Does the plaintiff have a viable appeal? What must she show?
3. Your client's summary judgment was denied (trial court will allow the case to proceed to trial). Can you appeal immediately? What options do you have?`,
      },
      {
        moduleNumber: 8,
        title: 'Case Brief Rubric',
        materialType: 'rubric',
        content: `LAW 501 CASE BRIEF RUBRIC
Used for evaluating cold-call performance and case brief quality
Cold-Call Participation: 10% of course grade (cumulative across all cold calls)
Each cold-call performance is evaluated on 100 points

A case brief has five components: Facts, Issue, Holding, Reasoning, and Significance. Students must be able to recite and discuss each component when called upon.

GRADING CRITERIA

1. FACTS (20 points)
- 18–20 pts: Identifies all legally relevant facts; omits irrelevant details; captures the procedural posture (which court, what stage of litigation, what happened below); presents facts neutrally without argument.
- 14–17 pts: Most relevant facts present; some irrelevant detail included or minor procedural gap.
- 10–13 pts: Key facts missing or confused; procedural posture absent; characterizes facts argumentatively.
- 0–9 pts: Facts largely inaccurate, incomplete, or absent; demonstrates lack of preparation.

2. ISSUE (20 points)
- 18–20 pts: States the precise legal question the court is resolving — specific (not "whether defendant is liable") with the key legal doctrine identified; connects to the specific facts of this case.
- 14–17 pts: Issue identified but too broad or missing the legal doctrine; or too narrow to capture the full question.
- 10–13 pts: Issue vague or states a conclusion rather than a question; does not identify controlling doctrine.
- 0–9 pts: Issue absent or fundamentally inaccurate.

3. HOLDING (15 points)
- 13–15 pts: States the court's answer to the issue in one clear sentence; distinguishes majority, concurrence, and dissent where relevant; accurately captures the legal rule announced.
- 10–12 pts: Holding correct but imprecisely stated; does not distinguish majority from concurrence.
- 7–9 pts: Holding partially correct or confused with reasoning or dicta.
- 0–6 pts: Holding absent or incorrect.

4. REASONING (30 points)
- 27–30 pts: Accurately and completely explains the court's reasoning — the legal principles applied, the analogies and distinctions drawn, the policy concerns invoked; explains how the holding follows from the reasoning; identifies key counter-arguments addressed by the court; distinguishes ratio decidendi from obiter dicta.
- 21–26 pts: Reasoning substantially complete; one or two important elements missing or imprecisely explained.
- 15–20 pts: Reasoning superficial; explains the result but not how the court got there; misses key analytical steps.
- 0–14 pts: Reasoning absent or fundamentally misunderstands the court's analysis.

5. SIGNIFICANCE (15 points)
- 13–15 pts: Explains how this case fits into the doctrinal landscape — what rule it established or changed, how it relates to other cases in the course, what questions it leaves open; demonstrates understanding of the case's role in the development of civil procedure doctrine.
- 10–12 pts: Significance identified but not connected to broader doctrine; generic ("this is an important case") without specific doctrinal placement.
- 7–9 pts: Significance absent or confused.
- 0–6 pts: No attempt to contextualize the case in the doctrine.

ENGAGEMENT WITH FOLLOW-UP QUESTIONS
After the initial brief, the professor will ask follow-up questions. Participation quality assessment:
- Engages honestly with the question; says "I don't know" rather than bluffing
- Builds on prior responses; modifies position when presented with a compelling argument
- Draws connections to policy and other cases studied
- Demonstrates that reading was done with care, not just skimmed`,
      }
    ]
  },

  // ────────────────────────────────────────────────
  // ANS-101-STARTER — Introduction to Animal Sciences
  // Martin-Gatton College of Agriculture, Food and Environment
  // ────────────────────────────────────────────────
  {
    courseCode: 'ANS-101-STARTER',
    title: 'Introduction to Animal Sciences',
    description: 'A broad introduction to the animal science industry covering livestock, companion animals, and aquaculture. Students explore anatomy, nutrition, genetics, reproduction, animal health, and welfare through lectures, laboratory exercises, and two required visits to the UK research farm.',
    college: 'Martin-Gatton College of Agriculture, Food and Environment',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `ANS 101 — Introduction to Animal Sciences
Martin-Gatton College of Agriculture, Food and Environment, University of Kentucky
Spring 2026 | MWF 11:00–11:50 AM | W.P. Garrigus Building 102
Lab Section: Thursday 1:00–3:50 PM | Garrigus Building Teaching Lab 120

INSTRUCTOR
Dr. Katie Thompson, Department of Animal and Food Sciences
Office: Garrigus Building 215
Office Hours: Monday & Wednesday 1:00–2:30 PM; Tuesday 10:00 AM–12:00 PM (Zoom)
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
ANS 101 introduces students to the diverse fields within animal science — from livestock production to companion animal management to aquaculture. Students gain a foundation in anatomy, physiology, nutrition, genetics, health management, and animal welfare across species. Designed for students with no prior animal science background. No prerequisites.

REQUIRED MATERIALS
- Reece, W. O. & Rowe, E. W. (2017). Functional Anatomy and Physiology of Domestic Animals (5th ed.). Wiley-Blackwell. ISBN: 978-1118685662
- Lab manual: ANS 101 Laboratory Manual (current edition) — available at UK Bookstore
- Closed-toe shoes and work clothes or coveralls required for all farm visits and lab sessions

GRADING BREAKDOWN
Species Presentations (2 presentations)    25%
Lab Reports (6 lab reports)               30%
Exams (3 exams)                           30%
Participation & Professionalism           15%
TOTAL                                    100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM SCHEDULE
Exam 1 (Week 5): Covers Modules 1–2 — industry overview, anatomy and physiology (digestive, reproductive, circulatory systems across species)
Exam 2 (Week 10): Covers Modules 3–4 — nutrition, rations, genetics, reproductive technology
Exam 3 (Week 14): Covers Modules 5–6 — health, disease prevention, welfare, ethics, biosecurity
All exams are 60 minutes, 40 multiple choice + 2 short-answer questions. No make-up without documented emergency.

SPECIES PRESENTATIONS (25%)
Each student delivers two 8–10 minute presentations on an assigned or chosen species. Presentation 1 focuses on the species' biology and industry importance (due Week 6 lab session). Presentation 2 focuses on welfare standards, common health issues, and current controversies related to that species (due Week 12 lab session). Students must answer 2–3 questions from classmates and the instructor after each presentation. See Presentation Guidelines on Canvas.

LAB REPORTS (30%)
Students complete 6 laboratory exercises (one every other week) and submit individual lab reports. Each lab report is 3–5 pages and includes: background/purpose, methods summary, results (data tables, measurements), discussion, and literature cited (minimum 2 peer-reviewed sources). Reports due 1 week after the corresponding lab session. Late reports: –10 points per day.

FARM VISITS (REQUIRED)
All students are required to attend TWO visits to the UK Maine Chance Farm (1400 University Drive, Lexington, KY). These visits are scheduled during lab time and are mandatory for course completion.
Farm Visit Schedule:
- Farm Visit 1: Week 4 (Thursday lab session) — Beef cattle and swine facilities; anatomy observation and body condition scoring
- Farm Visit 2: Week 11 (Thursday lab session) — Equine and poultry facilities; welfare assessment exercise

Transportation departs from the Garrigus Building parking lot at 12:45 PM on farm visit days. Students who miss a farm visit due to unexcused absence receive a zero for the associated lab report and cannot make up the field component.

LAB SAFETY POLICY
1. Closed-toe shoes are required at all times in the teaching lab and on farm visits. No sandals, flip-flops, or open-toe footwear — students without appropriate footwear will not be permitted to participate and will receive an absence.
2. Coveralls or designated farm clothing required for farm visits — dress professionally for conditions outdoors. The UK farm provides disposable boot covers.
3. No eating or drinking in the teaching lab.
4. All animal handling must follow the instructor's or TA's direction. Students who approach or handle animals without authorization will be removed from the activity.
5. Wash hands thoroughly before leaving the lab and after any animal contact.
6. Report any animal bites, scratches, or allergic reactions to the instructor immediately.
7. Any student with animal allergies must notify the instructor in writing by Week 2.

PARTICIPATION AND PROFESSIONALISM (15%)
Includes lab attendance (missing more than 2 labs without documented excuse results in grade reduction), quality of lab report submissions, preparation for species presentations, respectful conduct during farm visits and with animals, and constructive participation in class discussion.

SPECIES COVERED IN THIS COURSE
Cattle (beef and dairy), swine, poultry (broilers, layers, turkeys), sheep, goats, equine (horses, donkeys), companion animals (dogs, cats), aquaculture species (catfish, tilapia, rainbow trout), and an introduction to non-traditional/exotic species.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Animal Science Industry',
        materialType: 'lecture',
        content: `MODULE 1: THE ANIMAL SCIENCE INDUSTRY
Livestock, Companion Animals, Aquaculture, and Economic Impact

DEFINING ANIMAL SCIENCE
Animal science is the study of the biology and management of domestic animals — primarily livestock species raised for food, fiber, and labor, but also companion animals, sport animals, zoo animals, and laboratory animals. Animal scientists apply genetics, physiology, nutrition, reproduction, and behavior to improve animal productivity, welfare, and sustainability.

The scope of animal science has expanded dramatically. Once focused almost exclusively on beef cattle and hogs, modern animal science encompasses:
- Food animal production (cattle, swine, poultry, sheep, goats)
- Dairy production and milk quality
- Aquaculture and fisheries
- Companion animal veterinary and behavioral science
- Equine industry (racing, sport, therapy, working horses)
- Wildlife management
- Biomedical research animal care

ECONOMIC SIGNIFICANCE
Animal agriculture is one of the most economically significant sectors of the U.S. economy:
- Cash receipts from livestock and poultry production exceeded $200 billion in 2024
- Beef industry alone contributes approximately $88 billion annually to the U.S. economy
- Poultry (broilers, turkeys, eggs) is the largest segment of U.S. animal agriculture by value
- The companion animal industry (veterinary care, pet food, supplies) exceeds $140 billion annually
- Aquaculture: U.S. aquaculture production is valued at ~$1.5 billion; global aquaculture now supplies more than 50% of seafood consumed worldwide

In Kentucky specifically, animal agriculture is the backbone of the rural economy. The state is famous for its Thoroughbred horse industry (concentrated in the Bluegrass region around Lexington — home of Keeneland and Churchill Downs), beef cattle production, poultry, and increasingly, aquaculture. The UK College of Agriculture, Food and Environment is directly connected to this industry through research, extension, and education.

MAJOR LIVESTOCK SECTORS
Beef Cattle: The U.S. cattle industry maintains approximately 89 million head. Two distinct sectors: cow-calf operations (breeding cows produce calves sold at weaning) and feedlot operations (calves fed to market weight of 1,200–1,400 lbs). Breeds: Angus, Hereford, Simmental, Charolais, and crossbreeds for heterosis (hybrid vigor).

Swine: The U.S. maintains approximately 73 million hogs. Highly concentrated — 10 states produce 75% of U.S. pork. Vertically integrated (breeding companies own genetics from boar to pork chop in large operations). Breeds: Yorkshire, Duroc, Hampshire, Landrace, and crossbreeds.

Poultry: Broiler chickens are the most economical source of animal protein. The U.S. produces approximately 9 billion broilers per year. Extremely efficient (2 lbs feed per pound of gain). Also: layer hens (300 eggs/hen/year), turkeys, and ducks.

Sheep and Goats: Smaller but significant sectors, especially in arid Western states. Sheep for lamb meat, wool, and dairy. Goats for meat (cabrito), dairy (artisan cheese boom), and fiber (mohair from Angora goats, cashmere).

COMPANION ANIMAL INDUSTRY
The U.S. pet industry is enormous and growing. Approximately 70% of U.S. households own a pet. Spending includes: veterinary care, food, grooming, boarding, training, and accessories. Animal science graduates work in companion animal nutrition (major pet food companies), veterinary support, animal behavior consulting, and shelter management.

AQUACULTURE
Aquaculture is the fastest-growing food production sector globally. It encompasses freshwater species (catfish, tilapia, rainbow trout, salmon, bass), marine species (oysters, shrimp, Atlantic salmon), and seaweed. Advantages: high efficiency, controlled environment, year-round production. Challenges: water quality management, disease, feed costs, environmental impact of intensive systems.

KEY CAREER PATHWAYS IN ANIMAL SCIENCE
- Production/farm management
- Feed industry (sales, nutrition consulting, formulation)
- Veterinary medicine (requires DVM degree)
- Research and extension
- Animal welfare/nonprofit
- Regulatory agencies (USDA, FDA)
- Biotechnology and genetic improvement companies
- Pet food industry

DISCUSSION QUESTIONS
1. Which sector of animal agriculture do you think faces the greatest challenges over the next 20 years? Consider consumer preferences, environmental sustainability, and global competition.
2. The U.S. aquaculture industry is much smaller than aquaculture industries in Norway, Chile, and China. What factors explain this difference, and what would need to change for U.S. aquaculture to grow?
3. How has the companion animal industry changed over the past 30 years? What societal and demographic trends have driven these changes?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Animal Anatomy and Physiology',
        materialType: 'lecture',
        content: `MODULE 2: ANIMAL ANATOMY AND PHYSIOLOGY
Digestive Systems Across Species

COMPARATIVE ANATOMY AS A FOUNDATION
Understanding how different species are built — and why — is essential for managing them effectively. Animals have evolved remarkably diverse physiological strategies for acquiring and processing nutrients, reproducing, and surviving in different environments. A poultry nutritionist who understands the avian digestive system, a feedlot manager who understands rumen function, and a veterinary technician who understands feline metabolism all rely on anatomical and physiological knowledge.

DIGESTIVE SYSTEM CLASSIFICATIONS
Monogastric: Simple, single-chambered stomach. Includes pigs, dogs, cats, horses (technically, humans too). Food moves directly from esophagus to stomach to small intestine.

Ruminant: Four-chambered stomach — rumen, reticulum, omasum, abomasum. Includes cattle, sheep, goats, deer. Can ferment and utilize fibrous plant material (cellulose) that monogastrics cannot.

Pseudo-ruminant: Camelids (camels, llamas, alpacas) have a three-chambered stomach with microbial fermentation but differ from true ruminants.

Avian (Birds): No teeth; unique digestive anatomy adapted for high-speed food processing.

THE RUMINANT DIGESTIVE SYSTEM (Cattle, Sheep, Goats)
The ruminant digestive system is one of evolution's most elegant solutions — allowing large animals to thrive on grass, which is otherwise nutritionally useless to mammals. The four compartments:

1. Rumen (the "fermentation vat"): The largest compartment — holds 35–50 gallons in mature cattle. Contains billions of microorganisms (bacteria, protozoa, fungi) that ferment cellulose, hemicellulose, and starches into volatile fatty acids (VFAs: acetate, propionate, butyrate) — the primary energy source for ruminants. The rumen is constantly moving; gases produced by fermentation (methane, CO₂) must be eructated (belched) — failure causes bloat, a potentially fatal condition.

2. Reticulum: Small, honeycomb-lined chamber adjacent to the rumen. Filters ingesta; hardware disease (traumatic reticulitis) occurs when cattle swallow hardware (nails, wire) that lodges here.

3. Omasum: "Book-like" chamber with many folds (leaves) that absorb water and volatile fatty acids. Sometimes called the "manyplies."

4. Abomasum: The "true stomach" — functions like a monogastric stomach with gastric acid and enzymes. Digests protein. Abomasal displacement (DA) is a common dairy cattle disorder.

Rumination: Ruminants regurgitate cud (partially fermented ingesta) and re-chew it to further reduce particle size, allowing more complete microbial fermentation. Cattle spend 6–8 hours/day ruminating. Cessation of rumination is a sign of illness.

MONOGASTRIC DIGESTIVE SYSTEM (Pigs, Dogs)
Mouth → Esophagus → Stomach → Small Intestine (duodenum, jejunum, ileum) → Large Intestine (cecum, colon, rectum) → Rectum.

Stomach: Stores food; begins protein digestion with pepsin and HCl; controls rate of entry to small intestine.
Small Intestine (primary site of nutrient absorption): Digestion by pancreatic enzymes (amylase, lipase, proteases) and bile (from gallbladder, emulsifies fats). Villi and microvilli dramatically increase absorptive surface area. Carbohydrates → monosaccharides; proteins → amino acids; fats → fatty acids and glycerol.
Large Intestine: Water absorption; microbial fermentation of fiber (limited in pigs, dogs); fecal formation.

Pigs have significant hindgut fermentation capacity — more than dogs or cats, allowing them to utilize some fiber.

AVIAN DIGESTIVE SYSTEM (Poultry)
Unique adaptations for high-energy diets and rapid food processing:
Beak (no teeth) → Esophagus → Crop (temporary food storage) → Proventriculus (glandular stomach — secretes digestive enzymes and HCl) → Gizzard (muscular stomach — grinds feed mechanically; grit aids grinding) → Small Intestine → Ceca (paired — microbial fermentation, primarily carotenoid metabolism) → Cloaca (combined opening for digestive, urinary, and reproductive tracts).

Birds excrete uric acid (not urea) as the end product of protein metabolism — hence the white paste in bird droppings. This is an adaptation for water conservation.

EQUINE DIGESTIVE SYSTEM
Horses are hindgut fermenters — monogastric in the foregut (stomach, small intestine), with extensive microbial fermentation in the cecum and large colon (hindgut). The horse's relatively small stomach (4 gallons) is not designed for large infrequent meals — horses evolved to graze continuously. Large, infrequent grain meals can overwhelm the stomach and cause colic. The large colon (20 feet) and cecum ferment fiber; abrupt diet changes disrupt microbial populations and cause hindgut acidosis, a major cause of laminitis and colic.

DISCUSSION QUESTIONS
1. A beef producer wants to increase daily gain in a feedlot. He proposes switching cattle abruptly from a hay-based receiving diet to a high-grain finishing diet the day they arrive. What physiological problems would likely result, and how would you advise him?
2. Why can ruminants extract energy from grass that pigs and humans cannot? Be specific about the anatomical and microbial mechanisms.
3. A poultry producer removes grit from the diet to save money. What consequence might this have, and why?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Animal Nutrition',
        materialType: 'lecture',
        content: `MODULE 3: ANIMAL NUTRITION
Feedstuffs, Rations, and Nutrient Requirements

THE SIX CLASSES OF NUTRIENTS
All animal nutrition is built on six fundamental nutrient classes:
1. Water: The most critical nutrient — animals die of dehydration before starvation. Required for thermoregulation, metabolism, waste excretion, milk production, and all biochemical reactions. Lactating dairy cows drink 30–50 gallons/day.
2. Carbohydrates: Primary energy source. In ruminants, cellulose and starch are fermented in the rumen. In monogastrics, starch is digested enzymatically. Fiber (NDF, ADF) is important for rumen function; too much depresses intake in ruminants.
3. Fats (Lipids): Energy-dense (2.25× carbohydrates), precursors for fat-soluble vitamins and hormones, required for reproduction. Excessive dietary fat can cause digestive problems and reduce palatability.
4. Proteins: Composed of amino acids — building blocks for muscle, enzymes, hormones, and immune proteins. Non-ruminants require specific essential amino acids (lysine is the first-limiting AA in swine corn-soybean diets). Ruminant microbes can synthesize all amino acids from non-protein nitrogen (urea).
5. Minerals: Macro minerals (Ca, P, Na, Cl, Mg, K, S) — required in grams/day; micro/trace minerals (Fe, Cu, Zn, Mn, Se, I, Co) — required in milligrams/day. Calcium:phosphorus ratio (1.5:1 to 2:1) is critical for bone development. Deficiencies cause: milk fever (Ca), white muscle disease (Se), grass tetany (Mg).
6. Vitamins: Fat-soluble (A, D, E, K — stored in body fat, toxicity possible) and water-soluble (B-complex, C — excreted in urine, daily requirement). Ruminants synthesize B vitamins in the rumen; monogastrics require dietary sources.

FEEDSTUFFS CLASSIFICATION
Energy Feeds: High in carbohydrates and energy, low in protein. Corn (the dominant U.S. feed grain — ~8.5% protein, high starch), sorghum, barley, oats, wheat. Corn is the standard against which all energy feeds are compared (100% relative feed value).

Protein Supplements: High in protein (>20%). Soybean meal (SBM, 47-48% CP) — the most widely used plant protein globally. Canola meal, cottonseed meal, distillers dried grains (DDG — byproduct of ethanol production), fish meal (high-quality protein for poultry and swine), blood meal, meat and bone meal.

Roughages/Forages: High in fiber. Grass hays (timothy, orchardgrass, fescue), legume hays (alfalfa — high protein and Ca), silage (fermented forage — corn silage is energy-dense; alfalfa haylage is protein-rich), pasture. Critical for rumen function in cattle; primary diet component for beef cow-calf operations.

Byproduct Feeds: Economically valuable; fit in diets as alternatives to primary feedstuffs. Examples: citrus pulp, beet pulp, brewers grains, wheat middlings, bakery waste.

RATION FORMULATION
A ration is the total amount of feed an animal receives over a 24-hour period. Ration formulation matches nutrient supply to animal requirements. Requirements vary by species, class, age, reproductive status, and production level.

National Research Council (NRC) publications establish nutrient requirements for each species. Key publications: Nutrient Requirements of Dairy Cattle, Nutrient Requirements of Beef Cattle, Nutrient Requirements of Swine, Nutrient Requirements of Poultry.

Pearson Square Method (simple 2-ingredient balancing): Used to combine two feedstuffs to achieve a target protein or energy level.
Example: Balance a 14% CP diet using corn (8.5% CP) and SBM (47% CP):
- Difference from target: SBM contributes (47 – 14 = 33 parts); Corn contributes (14 – 8.5 = 5.5 parts)
- Total parts = 38.5; Corn = 33/38.5 = 85.7%; SBM = 5.5/38.5 = 14.3%

Linear programming (computer software — CPM Dairy, AMTS, NRC models) optimizes multi-ingredient rations simultaneously for multiple nutrients at minimum cost — the practical method used in industry.

DISCUSSION QUESTIONS
1. A stocker cattle producer is backgrounding calves on fescue pasture. A forage test shows the grass is 12% CP and 62% TDN. The calves require 14% CP. What would you recommend supplementing?
2. Why can ruminants use urea (a non-protein nitrogen source) as part of their protein supply while swine cannot? What is the practical significance for feed cost?
3. A swine producer wants to reduce feed costs by eliminating synthetic lysine from the diet and relying on corn and SBM alone. What might happen to pig performance? Why?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Genetics and Reproduction',
        materialType: 'lecture',
        content: `MODULE 4: GENETICS AND REPRODUCTION
Selection, EPDs, and Reproductive Technology

BASIC GENETICS IN LIVESTOCK
Livestock genetics applies Mendelian principles and quantitative genetics to improve economically important traits. Traits are classified as:
- Qualitative traits: Controlled by one or a few genes; show discrete phenotypic categories. Examples: polledness (horned vs. polled), coat color, double-muscling (myostatin mutation in Belgian Blue and Piedmontese cattle).
- Quantitative traits: Controlled by many genes (polygenic) with continuous variation influenced by environment. Examples: weaning weight, milk yield, feed efficiency, marbling. These are the traits animal breeders focus on.

Heritability (h²): The proportion of phenotypic variation that is genetic (and therefore can respond to selection). Scale 0–1. High heritability (>0.4): post-weaning gain, marbling, ribeye area — selection changes these traits quickly. Low heritability (<0.2): reproduction traits (conception rate, calving interval) — respond slowly to selection; management has more impact.

Heterosis (Hybrid Vigor): When crossbred progeny outperform the average of the parent breeds. Heterosis is most pronounced for traits with low heritability (reproductive traits, survival). This is why commercial beef and pork producers use crossbreds rather than purebreds — they capture heterosis without needing to maintain pure breeds.

EXPECTED PROGENY DIFFERENCES (EPDs)
EPDs are the primary selection tool in beef cattle, swine, and sheep breeding. An EPD predicts the expected genetic merit of an animal's progeny relative to a breed average, expressed in the units of measurement of the trait.

Example: A bull with a weaning weight EPD of +30 is expected to produce calves that average 30 lbs heavier at weaning than calves from a bull with a +0 EPD, when both are mated to cows with equal genetic merit.

Common Beef EPDs and their importance:
- Birth Weight (BW EPD): Predicts calving ease — high birth weight increases difficult births (dystocia). First-calf heifers require bulls with low BW EPD.
- Weaning Weight (WW EPD): Growth to weaning; cow's milk production influences this in calves.
- Yearling Weight (YW EPD): Postweaning growth rate; key for feedlot buyers.
- Milk EPD: The genetic contribution of a sire to his daughters' milk production (measured indirectly via calf weaning weight in the daughters).
- Marbling EPD: Intramuscular fat; predicts USDA quality grade (Prime, Choice, Select).
- Calving Ease (CE EPD): Direct calving ease — predicts percentage of unassisted births.

EPD Accuracy: Expressed as 0–1; higher accuracy means EPD is more reliable. Young bulls with limited progeny data have low accuracy EPDs; bulls with many recorded progeny have high accuracy.

REPRODUCTIVE PHYSIOLOGY
Understanding reproductive cycles is essential for timed breeding, artificial insemination, and embryo transfer.

Cattle: Estrous cycle 21 days (range 18–24). Estrus (standing heat) lasts 12–18 hours. Ovulation occurs 24–32 hours after onset of estrus. Signs of estrus: standing to be mounted, restlessness, chin resting on other cows, clear mucus discharge.

Swine: Estrous cycle 21 days. Estrus 2–3 days. Gilts/sows should be bred twice (18–24 hours apart during estrus) for maximum conception. Gestation: ~114 days ("3 months, 3 weeks, 3 days").

Poultry: Hens are not seasonally polyestrous — under artificial lighting programs (16 hours light:8 hours dark), hens lay nearly continuously. A hen ovulates every 24–26 hours. Fertilization occurs in the infundibulum; the egg takes approximately 24 hours to form.

REPRODUCTIVE TECHNOLOGIES
Artificial Insemination (AI): Semen collected from genetically superior males is cryopreserved and used to breed many females. Advantages: disseminates superior genetics rapidly; prevents disease transmission vs. natural service; allows use of bulls that are geographically distant. Semen quality critical: motility, morphology, concentration.

Estrus Synchronization: Hormonal protocols (CIDR + prostaglandin or GnRH-based Ovsynch) synchronize the estrous cycle of a group of cows/heifers, allowing timed AI without heat detection. Widely used in commercial beef and dairy.

Embryo Transfer (ET): Genetically superior donor cow is superovulated (FSH injections), bred by AI, embryos flushed and transferred to recipient cows (surrogate mothers) at Day 7. One superior cow can produce 8–15 transferable embryos per flush.

In-Vitro Fertilization (IVF) and Genomic Selection: IVF allows oocyte aspiration from live cows or slaughterhouse ovaries, in-vitro maturation, fertilization, and transfer. Genomic selection (using SNP markers across the genome) dramatically increases the accuracy of genetic prediction, especially for young animals with no progeny data.

DISCUSSION QUESTIONS
1. A producer wants to improve both reproductive rate and marbling in his Angus cow herd simultaneously. What challenges would he face, and what tools would help?
2. Why do commercial pork producers use crossbreeds rather than purebred Yorkshires or Durocs exclusively? What genetic principle drives this decision?
3. What is the practical limit of AI use in beef cattle vs. dairy cattle? Why is AI adoption nearly universal in dairy but optional in beef?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Animal Health and Disease',
        materialType: 'lecture',
        content: `MODULE 5: ANIMAL HEALTH AND DISEASE
Common Diseases, Biosecurity, and Vaccination Programs

PRINCIPLES OF DISEASE
Disease occurs when the interaction of host (the animal), agent (pathogen or stressor), and environment creates a health disruption. The "disease triangle" illustrates that all three factors must align — a pathogen alone doesn't cause disease if the host is resistant or the environment doesn't favor transmission.

Infectious Diseases are caused by pathogens: viruses, bacteria, fungi, parasites. Spread via: direct contact, fecal-oral route, aerosol, vector (insects), contaminated fomites (equipment, boots, vehicles).
Non-Infectious Diseases include nutritional deficiencies, metabolic disorders, toxicoses, and physical injuries.

COMMON DISEASES BY SPECIES

Cattle:
- Bovine Respiratory Disease (BRD): "Shipping fever" — the most economically costly cattle disease. A multi-agent disease (viruses: IBR, BVDV, BPI-3; bacteria: Mannheimia, Pasteurella) triggered by stress, commingling, and weather change. Prevention: vaccination, low-stress handling, proper nutrition, acclimation protocols. Treatment: antibiotics (florfenicol, tulathromycin, enrofloxacin) — must follow withdrawal times before slaughter.
- Pinkeye (Infectious Bovine Keratoconjunctivitis): Moraxella bovis bacteria; fly vectors. Causes corneal ulcers, blindness. Highly contagious in summer; fly control and vaccination important.
- Mastitis (Dairy): Inflammation of the mammary gland — leading cause of dairy cow culling. Environmental mastitis (E. coli, Streptococcus) from bedding contamination; contagious mastitis (Staphylococcus aureus) spread during milking. Somatic cell count (SCC) in milk indicates udder health. California Mastitis Test (CMT) is a rapid field test.

Swine:
- PRRS (Porcine Reproductive and Respiratory Syndrome): Viral — causes reproductive failure in sows (abortions, mummified fetuses) and respiratory disease in pigs. Most economically significant swine disease in the U.S. ($664 million/year). No fully effective vaccine; management focus on biosecurity and gilt acclimation.
- PED (Porcine Epidemic Diarrhea): Highly contagious coronavirus causing severe diarrhea and 100% mortality in neonatal piglets. Biosecurity focus: boot dips, strict truck disinfection protocols.

Poultry:
- Newcastle Disease: Highly contagious paramyxovirus causing respiratory, nervous, and digestive signs. Exotic Newcastle disease (END) is a reportable foreign animal disease with catastrophic outbreak potential.
- Marek's Disease: Herpesvirus causing lymphoma and paralysis — prevented by universal vaccination of day-old chicks.
- Avian Influenza (Bird Flu): H5N1 and related strains cause massive mortality in poultry flocks. A significant public health concern; certain strains have pandemic potential. Mandatory reportable disease; affected flocks are depopulated.

VACCINATION PRINCIPLES
Vaccines stimulate the immune system to produce protective immunity without causing disease. Types: modified live virus (MLV) — attenuated pathogen; killed/inactivated — whole killed organism or components; toxoid — inactivated toxin; subunit/recombinant — specific protein antigens.
Key concepts: Booster doses (prime-boost) establish memory; maternal antibodies can interfere with vaccination timing in young animals; withdrawal times for combination products must be observed in food animals.

BIOSECURITY
Biosecurity is the set of practices preventing introduction and spread of pathogens. Tiers:
- External biosecurity: Controlling what comes onto the farm — quarantine of new animals (minimum 30 days), strict visitor policies, disinfection of vehicles and equipment, pest control.
- Internal biosecurity: Preventing spread within the farm — all-in/all-out production systems (one age group in a barn at a time), proper cleaning and disinfection between groups, geographic separation of production stages.

Cleaning and Disinfection Protocol: Remove all organic material first (soap/detergent, pressure wash) — organic matter inactivates most disinfectants. Then apply disinfectant at correct dilution and contact time. Allow adequate drying time before restocking.

ANTIBIOTIC STEWARDSHIP
Antibiotic resistance is a global public health crisis. In animal agriculture: (1) antibiotics may only be used under a valid Veterinary Client Patient Relationship (VCPR) and a Veterinary Feed Directive (VFD) for medically important antibiotics in feed; (2) growth promotion use of medically important antibiotics is banned by FDA Guidance 213; (3) extra-label drug use is permitted in food animals under some conditions but with strict withdrawal time compliance; (4) all withdrawal times must be observed before slaughter or milk sale.

DISCUSSION QUESTIONS
1. A stocker operation experiences BRD in 15% of calves within the first 2 weeks of arrival. What management and preventive strategies would you recommend going forward?
2. Why is biosecurity described as "the most cost-effective disease management tool"? What are the limits of biosecurity on a commercial farm?
3. A consumer demands "antibiotic-free" beef. A cattle producer argues that withholding antibiotics from sick animals is inhumane. How do you evaluate both positions? What does antibiotic stewardship offer as a middle ground?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Animal Welfare and Ethics',
        materialType: 'lecture',
        content: `MODULE 6: ANIMAL WELFARE AND ETHICS
Welfare Standards, Antibiotic Stewardship, and Humane Handling

DEFINING ANIMAL WELFARE
Animal welfare is the state of an animal's physical and mental health in relation to its living conditions, treatment, and environment. It is distinct from animal rights (the philosophical position that animals have inherent rights not to be used by humans). Animal welfare science is empirical — it measures welfare objectively and seeks to improve it within the context of animal use.

The Five Freedoms (Farm Animal Welfare Council, UK, 1979) — still the dominant welfare framework:
1. Freedom from Hunger and Thirst: Ready access to water and a diet maintaining health and vigor.
2. Freedom from Discomfort: Appropriate environment including shelter and comfortable resting area.
3. Freedom from Pain, Injury, or Disease: Prevention or rapid diagnosis and treatment.
4. Freedom to Express Normal Behavior: Sufficient space, proper facilities, and company of the animal's own kind.
5. Freedom from Fear and Distress: Assurance of conditions and treatment avoiding mental suffering.

The Five Domains (Mellor & Reid, current framework): Updates the Five Freedoms by adding a fifth domain of Mental State — recognizing that even animals that are physically healthy may suffer mental states (boredom, fear, frustration). Welfare assessment must address subjective experience.

MEASURING WELFARE
Animal-based indicators: Body condition score, lameness scoring, injury prevalence, mortality rate, behavior (stereotypies indicate chronic stress), latency to approach humans (avoidance distance tests fear), indicators of pain.
Resource-based indicators: Space allowance, bedding quality, access to outdoor areas, group size.
Management-based indicators: Training of handlers, veterinary access, medication use.

WELFARE STANDARDS AND CERTIFICATION PROGRAMS
National Chicken Council Animal Welfare Guidelines: Industry standards for broiler welfare including stocking density, lighting programs, litter quality.
USDA Organic: Requires outdoor access; prohibits hormones and growth-promoting antibiotics; limits medically important antibiotics.
Animal Welfare Approved (AWA): High-welfare certification covering outdoor access, natural behaviors, breed selection.
Certified Humane: Third-party audit program; addresses stocking density, enrichment, handling.
Global Animal Partnership (GAP): Tiered (1–5+) rating system used by Whole Foods Market; allows producers to differentiate based on welfare level.

THE FIVE POINT WELFARE PLAN FOR CATTLE (Used by UK Extension)
A practical framework for beef cattle producers: body condition score, locomotion score, mortality rate, dystocia rate, and cattle behavior during handling — all objective, measurable indicators.

LOW-STRESS ANIMAL HANDLING (Temple Grandin)
Temple Grandin's contributions to animal handling represent some of the most practical applications of animal behavioral science. Key principles:
- Flight zone: The distance at which an animal feels threatened and flees. Handlers working at the edge of the flight zone (not within it) have much greater control.
- Point of balance: At the shoulder. Moving behind the point of balance pushes the animal forward; moving in front stops it.
- Handler position: Cattle move most naturally in a curved path; handlers moving against the curve cause balking.
- Curved races and round pens: Reduce cortisol levels (measurable stress indicator), reduce injuries, improve throughput.
- Minimize noise: Yelling, metal clanging, and dogs cause acute stress and poor handling.

ETHICS IN ANIMAL AGRICULTURE
Three Ethical Frameworks Applied to Animal Use:
- Utilitarian (Peter Singer): Maximize total welfare — if animals suffer significantly, and suffering can be reduced, the balance of interests requires welfare improvements. Singer's "Animal Liberation" (1975) launched modern animal welfare debates.
- Contractarian/Rights View (Tom Regan): Animals that are "subjects of a life" (mammals above infancy) have inherent value and rights that cannot be violated even for aggregate welfare gains.
- Agricultural/Stewardship Ethic: Humans have a responsibility to care for animals under their management; animals may be used for food but must be treated humanely; this is a traditional and widely held position.

Most animal scientists, veterinarians, and farmers operate within the stewardship ethic. The key debate is about what "humane" means in practice — what standards are acceptable, and who decides.

DISCUSSION QUESTIONS
1. A poultry producer claims his birds have "freedom from hunger" but stocks 8 birds/m² in a windowless building. Has he met the Five Freedoms standard? Evaluate each freedom.
2. Should consumers bear any moral responsibility for animal welfare conditions associated with food they purchase? How does the distance between consumer and production affect this responsibility?
3. Temple Grandin's handling systems were initially resisted by industry. What does this adoption history tell us about how welfare improvements actually happen in agriculture?`,
      },
      {
        moduleNumber: 8,
        title: 'Species Presentation Rubric',
        materialType: 'rubric',
        content: `ANS 101 SPECIES PRESENTATION RUBRIC
Used for both Presentation 1 (biology/industry) and Presentation 2 (welfare/health)
Each presentation: 8–10 minutes + 2–3 minutes Q&A
Each presentation worth 12.5% of course grade (total 25%)
Total Points: 100 points per presentation

GRADING CRITERIA

1. BIOLOGICAL ACCURACY (25 points)
- 22–25 pts: All biological information accurate and current; species-specific details (anatomy, physiology, reproductive parameters, nutritional requirements) correctly stated; information supported by reputable sources (textbook, extension publications, peer-reviewed sources).
- 17–21 pts: Most information accurate; minor errors that don't affect core concepts.
- 12–16 pts: Some significant factual errors; information is generic or not species-specific.
- 0–11 pts: Multiple significant factual errors; information appears unsourced or unreliable.

2. INDUSTRY/ECONOMIC RELEVANCE (20 points) [Presentation 1] OR WELFARE STANDARDS AND CONTROVERSIES (20 points) [Presentation 2]
Presentation 1: Industry/Economic:
- 18–20 pts: Accurately describes the economic significance of the species; production sectors (where applicable); specific production statistics; career pathways in this species' industry.
Presentation 2: Welfare/Controversies:
- 18–20 pts: Identifies specific welfare concerns for this species in commercial or companion animal settings; describes current standards (certification, regulatory); presents a balanced view of a current controversy.

3. PRESENTATION ORGANIZATION AND DELIVERY (25 points)
- 22–25 pts: Clear introduction, body, and conclusion; logical flow; professional visual aids (slides, not text-heavy); maintains eye contact; speaks clearly and at appropriate pace; stays within 8–10 minute time limit.
- 17–21 pts: Organization mostly clear; minor delivery issues (reading from slides, slight pace problems); within 2 minutes of time limit.
- 12–16 pts: Organization weak; delivery problems (monotone, excessive reading from notes/slides); significantly over or under time.
- 0–11 pts: Little organization evident; delivery detracts severely from content; greatly over or under time limit.

4. Q&A PERFORMANCE (20 points)
- 18–20 pts: Answers all 2–3 questions correctly and confidently; says "I don't know" honestly for questions outside expertise; elaborates on answers beyond the minimum; engages with questioner respectfully.
- 14–17 pts: Most questions answered correctly; some hesitation; occasional "I'm not sure" without follow-up.
- 10–13 pts: Struggles with some questions; some incorrect answers; does not elaborate.
- 0–9 pts: Cannot answer basic questions; responses suggest inadequate preparation.

5. VISUAL AIDS AND SOURCES (10 points)
- 9–10 pts: Slides are professional, visually clear, not text-heavy; includes high-quality images (credited); cites at least 3 reputable sources (not Wikipedia); references slide provided.
- 7–8 pts: Slides adequate; most sources appropriate; minor citation issues.
- 5–6 pts: Slides cluttered or text-heavy; fewer than 3 sources; citation format inconsistent.
- 0–4 pts: No visual aids; sources absent or unreliable.

PENALTIES
- Exceeding 12 minutes without faculty warning: –5 points
- Under 6 minutes: –10 points
- Missing Q&A (presenting but leaving before questions): –20 points`,
      }
    ]
  },

  // ────────────────────────────────────────────────
  // COM-101-STARTER — Introduction to Communication
  // College of Communication and Information
  // ────────────────────────────────────────────────
  {
    courseCode: 'COM-101-STARTER',
    title: 'Introduction to Communication',
    description: 'A foundational survey of human communication theory and practice. Students develop skills in interpersonal communication, active listening, public speaking, and persuasion through in-class exercises, peer evaluation, and two formal speech assignments.',
    college: 'College of Communication and Information',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `COM 101 — Introduction to Communication
College of Communication and Information, University of Kentucky
Spring 2026 | MWF 1:00–1:50 PM | Grehan Journalism Building 212

INSTRUCTOR
Dr. Katie Thompson, Department of Communication
Office: Grehan Journalism Building 320
Office Hours: Monday & Wednesday 2:00–3:30 PM; Tuesday 10:00 AM–12:00 PM (Zoom)
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
COM 101 introduces students to the major theories and concepts of human communication. Students examine how communication works in interpersonal, small group, and public contexts, and develop practical skills in listening, verbal and nonverbal communication, and public speaking. Two formal speeches are required. No prerequisites.

REQUIRED TEXTBOOK
Griffin, E., Ledbetter, A., & Sparks, G. (2023). A First Look at Communication Theory (11th ed.). McGraw-Hill. ISBN: 978-1265302870
Supplementary readings posted on Canvas.

GRADING BREAKDOWN
Informative Speech (Week 8)         15%
Persuasive Speech (Week 14)         25%
Peer Evaluations (for each speech)  15%
Written Assignments (4 papers)      25%
Discussion Participation            20%
TOTAL                              100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

SPEECH REQUIREMENTS — TIME LIMITS
Informative Speech: 4–6 minutes. Penalty: –2 points per 30 seconds over or under limit.
Persuasive Speech: 6–8 minutes. Penalty: –2 points per 30 seconds over or under limit.

Both speeches are delivered in class. All students must be present for peers' speeches to receive full participation credit. You are excused from peer evaluation only with documented conflict submitted 48 hours in advance.

USE OF NOTES DURING SPEECHES
Speaking notes (one 4x6 index card) are permitted for both speeches. Full manuscripts are NOT permitted — reading from a full script earns a –10 point penalty. Students are encouraged to practice until they can deliver with minimal reference to notes. Visual aids (1–3 slides or a poster) are optional for the informative speech and required for the persuasive speech.

PEER EVALUATIONS (15%)
After each classmate's speech, you complete a structured peer evaluation form (provided on Canvas). Each evaluation is scored for: completeness, specificity, and constructive tone (not just "it was good"). You will receive peer evaluations of your own speeches as feedback — these do not affect your grade, only your evaluations of others do.

WRITTEN ASSIGNMENTS (25% — 4 papers, each worth 6.25%)
Paper 1 (due Week 3): Communication model analysis — apply a course communication model to a real interaction.
Paper 2 (due Week 6): Active listening reflection — analyze your own listening strengths and barriers in a recorded conversation.
Paper 3 (due Week 10): Interpersonal conflict analysis — apply conflict theory to a real or hypothetical conflict situation.
Paper 4 (due Week 13): Audience analysis for your persuasive speech — who is your target audience, what are their values and prior beliefs, how will you adapt your message?
All papers are 2–3 pages, double-spaced, 12pt Times New Roman, 1-inch margins, APA format.

LATE ASSIGNMENT POLICY
Late written assignments lose 10 points per calendar day (including weekends). No late assignments accepted after 5 days. Speeches cannot be rescheduled without documented emergency submitted at least 48 hours before the speech date. Late speech penalty: –20 points per class day late.

SPEECH ANXIETY POLICY
Public speaking anxiety is normal and understood. Students who experience severe anxiety are encouraged to speak with the instructor privately. Extra practice time (outside class hours) is available by appointment. The course's structured progression (smaller presentations building to formal speeches) is designed to build confidence gradually. Anxiety itself does not excuse absences or late speeches.

RECORDING CONSENT POLICY
Speeches in this course may be recorded for educational feedback purposes only. Recordings are accessible only to the instructor and the individual student. Recordings are not shared publicly, posted on social media, or used for any purpose outside this course without explicit written consent of the student. Students who do not consent to recording must notify the instructor in writing by Week 2; alternative feedback arrangements will be made.

PARTICIPATION (20%)
Participation includes: active engagement during class discussions, quality of in-class activities and exercises, completion of assigned readings (evident through discussion quality), respectful engagement during peers' speeches, and punctual attendance. Students who arrive late or leave early disrupting speeches will have their participation reduced.

ACADEMIC INTEGRITY
All speeches must be original work prepared for this course. AI-generated speech content must be disclosed. Submitting a speech previously delivered in another course without disclosure is academic dishonesty.

WEEKLY SCHEDULE
Week 1  — Introduction: What is communication? Why study it?
Week 2  — Communication Models: Linear, interactional, transactional models; Shannon-Weaver
Week 3  — Listening: Types of listening, barriers, improvement strategies (Paper 1 due)
Week 4  — Verbal Communication: Language and meaning; language and perception; gender and language
Week 5  — Nonverbal Communication: Functions, types, cultural variation; kinesics, proxemics
Week 6  — Interpersonal Communication I: Relationship development, self-disclosure, social penetration (Paper 2 due)
Week 7  — Interpersonal Communication II: Conflict, conflict styles, resolution strategies
Week 8  — INFORMATIVE SPEECHES (MWF, all class periods used for speeches); written speech critique due same week
Week 9  — Small Group Communication: Roles, norms, leadership, group decision-making
Week 10 — Persuasive Communication I: Argument structure, evidence types, logical fallacies (Paper 3 due)
Week 11 — Persuasive Communication II: Audience analysis, values, framing
Week 12 — Monroe's Motivated Sequence; persuasive speech structure; ethos, pathos, logos
Week 13 — Media and Mediated Communication: Social media and public discourse (Paper 4 due)
Week 14 — PERSUASIVE SPEECHES (MWF and into Week 15 if needed)
Week 15 — Course debrief; communication and your future career`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Communication Process',
        materialType: 'lecture',
        content: `MODULE 1: THE COMMUNICATION PROCESS
Models, Channels, Noise, and Feedback

WHY STUDY COMMUNICATION?
Communication is the most pervasive human activity — we spend approximately 70% of our waking hours communicating in some form. Yet most communication education focuses on writing; speaking and listening receive far less formal instruction. Research consistently links communication competence to career success, relationship satisfaction, mental health, and civic participation. In a nationally representative survey of employers, communication skills are consistently rated the top qualification they seek in new hires — above technical knowledge and GPA.

DEFINING COMMUNICATION
Communication is the process of creating meaning through the transmission and interpretation of messages between participants. Several key points from this definition:
- Process: Communication is dynamic and ongoing, not a discrete event.
- Creating meaning: Meaning is not "in" a message; it is constructed by participants. The same words mean different things to different people in different contexts.
- Transmission and interpretation: Both sending and receiving are active, interpretive acts.
- Participants (plural): Communication is inherently relational.

COMPONENTS OF COMMUNICATION
Every model of communication includes some version of these elements:
- Sender/Source: The originator of a message. The sender encodes ideas into a transmittable form (words, gestures, images).
- Message: The content being communicated — verbal and nonverbal.
- Channel: The medium through which the message travels. Face-to-face uses sight and sound channels simultaneously. Text messaging uses a visual-written channel. Each channel has affordances (what it does well) and constraints (what it does poorly).
- Receiver: The recipient who decodes the message. Decoding is active interpretation — the receiver's prior experiences, expectations, and emotional state all shape meaning.
- Feedback: The receiver's response — verbal, nonverbal, or behavioral — that indicates how the message was received. Feedback loops allow communication to be adaptive and self-correcting.
- Context: The physical, social, relational, and cultural setting that shapes how messages are sent and interpreted. "I love you" means something very different from a parent to a child vs. between romantic partners on a first date.

THREE MAJOR MODELS OF COMMUNICATION

Linear Model (Shannon & Weaver, 1949): Originally developed to optimize telephone signal transmission. Communication as a one-way pipeline: Sender → Encodes → Message → Channel → Decodes → Receiver. Noise (anything that disrupts transmission) can occur at any point. Strengths: simple, captures one-way broadcasts (TV commercials, speeches). Weakness: treats the receiver as passive; ignores feedback; ignores shared meaning-making.

Interactional Model (Schramm, 1954): Added feedback to the linear model — communication as an alternating process, like a tennis match. Sender sends, receiver receives and sends feedback, original sender receives that feedback. Improvement: adds feedback. Weakness: still treats sending and receiving as alternating roles rather than simultaneous processes; still relatively linear.

Transactional Model (Barnlund, 1970): The dominant current model. Communication is simultaneously sending and receiving — participants are co-communicators, not senders and receivers in alternating turns. Communication is mutually influential — your message shapes and is shaped by mine at the same moment. Adds: time dimension (shared communication history affects current interaction), psychological context (each person's unique interpretation filter), and cultural context (shared meaning systems). This model most accurately reflects how communication actually works.

TYPES OF COMMUNICATION NOISE
Noise is anything that interferes with message transmission or reception. Types:
- Physical noise: Environmental distractions (loud music, poor lighting, a crowded room).
- Physiological noise: Internal physical conditions (hunger, fatigue, illness, hearing impairment).
- Psychological noise: Internal mental/emotional distractions (daydreaming, anxiety, strong emotions, prejudice).
- Semantic noise: Differences in how words and symbols are understood (jargon, technical language, ambiguity). A medical professional telling a patient she has "renal insufficiency" when the patient doesn't know "renal" means kidney.

COMMUNICATION COMPETENCE
Communication competence is the ability to achieve your goals in a way that maintains or enhances your relationship with the other person. Two dimensions: effectiveness (achieving the intended outcome) and appropriateness (meeting the relational and contextual expectations). Being effective but inappropriate (getting what you want by being rude) is not competent communication.

DISCUSSION QUESTIONS
1. Think of a recent miscommunication you experienced. Which component of the communication model failed? Was it encoding, channel, decoding, noise, or context?
2. The transactional model says communication is simultaneously sending and receiving. What does this mean practically? Give an example.
3. Is it possible to NOT communicate? Some theorists argue that "you cannot not communicate" — behavior itself is always message-bearing. Do you agree? What are the implications?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Listening',
        materialType: 'lecture',
        content: `MODULE 2: LISTENING
Active Listening, Listening Barriers, and Note-Taking Strategies

THE FORGOTTEN COMMUNICATION SKILL
Of the four primary communication activities (listening, speaking, reading, writing), listening takes the most time — adults spend approximately 40–45% of their communication time listening. Yet listening receives the least formal instruction, and most people are poor listeners. Research shows that immediately after listening to a 10-minute presentation, the average person retains only 50% of the content; after 48 hours, only 25%.

The consequences of poor listening are significant: misunderstandings in relationships, medical errors (patients who don't retain what doctors told them), workplace failures, and academic underperformance (80% of classroom learning depends on listening).

TYPES OF LISTENING
Discriminative Listening: The most basic level — distinguishing sounds and recognizing meaningful patterns. Required for all other types. We use discriminative listening to identify who is calling our name in a crowd.

Comprehensive Listening: Understanding the message. Requires attending to content, identifying main ideas, recognizing structure, and retaining information. Lecture listening is primarily comprehensive listening.

Critical/Evaluative Listening: Analyzing and evaluating the message — assessing evidence quality, identifying logical fallacies, distinguishing fact from opinion, evaluating credibility. Required for debates, political speeches, advertising.

Empathic Listening: Listening to understand and share the emotional experience of another — not to evaluate, advise, or respond. Therapeutic and relational contexts require empathic listening. This is the hardest type and the one most people are worst at.

Appreciative Listening: Listening for enjoyment or aesthetic experience — music, storytelling, performance. The goal is personal satisfaction, not information.

BARRIERS TO EFFECTIVE LISTENING
Physical Barriers: Noise, physical discomfort, poor acoustics, visual distractions.

Physiological Barriers: Fatigue, hunger, hearing impairment, illness. The brain is less efficient at processing language when tired.

Psychological Barriers:
- Preoccupation/Daydreaming: The average rate of speech is 125–150 words per minute; the brain can process at 400–600 words per minute. This "thought gap" allows the mind to wander.
- Emotional Triggers: Words or topics that provoke strong emotional reactions hijack listening — attention goes to the emotional response rather than the message.
- Confirmation Bias: We attend to information that confirms our existing beliefs; discount information that challenges them.
- Prejudging the Speaker: Dismissing the message because we've already judged the speaker.

Semantic Barriers: Unfamiliar vocabulary, jargon, technical language — when words aren't understood, we stop listening.

Pseudo-Listening and Selective Listening: Pretending to listen while not actually attending; or attending only to preferred parts of the message.

THE LISTENING PROCESS: HURIER MODEL
Hearing → Understanding → Remembering → Interpreting → Evaluating → Responding
Each stage is a potential failure point. A listener might hear the words but not understand the meaning; or understand and remember but misinterpret the intent; or interpret correctly but respond ineffectively.

ACTIVE LISTENING TECHNIQUES
Active listening is purposeful, engaged listening that requires effort and practice.
- Give full attention: Remove distractions; face the speaker; make appropriate eye contact (culturally variable); put down the phone.
- Don't interrupt: Allow the speaker to complete their thought. Finish listening before you begin constructing your response.
- Use minimal encouragers: Nodding, "mm-hmm," brief verbal acknowledgments signal that you are tracking without interrupting.
- Paraphrase: Restate what you've heard in your own words to verify understanding. "So what you're saying is..." This is the single most powerful active listening technique.
- Ask clarifying questions: "Can you give me an example?" "What did you mean by...?" — seek to understand, not to challenge.
- Reflect feelings: "It sounds like you're frustrated." Demonstrates that you're attending to emotional content, not just words.
- Suspend judgment: Commit to understanding before evaluating. Evaluation closes listening down.

NOTE-TAKING STRATEGIES FOR LECTURE LISTENING
- Cornell Method: Divide the page into three sections: narrow left column (cues/questions written after class), wide right column (lecture notes), bottom section (summary written after class). Forces active processing post-lecture.
- Outline Method: Hierarchical structure with main ideas indented; subordinate points below. Best for well-organized, sequential lectures.
- Mind Map: Visual representation with the central concept in the middle; branches for key topics; sub-branches for details. Best for brainstorming and connecting concepts.
- The testing effect: After note-taking, close your notes and try to recall key points — this consolidates memory far more than re-reading.

DISCUSSION QUESTIONS
1. A friend starts telling you about a problem she's having at work. Almost immediately, you start thinking of advice to give her. Is this helpful listening? What type of listening does she probably need?
2. Think about a class where you consistently zone out. Which listening barriers apply? What could you actively do to improve your listening in that class?
3. Research shows that taking notes on paper (vs. laptop) produces better learning outcomes. Why might this be? What does it suggest about the relationship between listening and processing?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Verbal and Nonverbal Communication',
        materialType: 'lecture',
        content: `MODULE 3: VERBAL AND NONVERBAL COMMUNICATION
Language Choices, Body Language, and Proxemics

VERBAL COMMUNICATION: LANGUAGE AND MEANING
Language is a system of symbols (words) governed by rules (grammar, syntax, semantics) that enables humans to communicate. Words are symbolic — the connection between a word and what it represents is arbitrary (there's nothing inherently "tree-like" about the word "tree") and culturally agreed upon. This means language is a shared social construct, not a transparent window onto reality.

Denotation vs. Connotation: A word's denotation is its dictionary definition — the literal, agreed-upon meaning. Its connotation is the emotional or evaluative associations attached to it. "Slender" and "skinny" have similar denotations but very different connotations. Choosing between them is a communicative act with consequences.

Abstraction: Words can be concrete (a specific, observable referent — "this red 2019 Ford F-150") or abstract (broad, general — "vehicle," "transportation," "progress"). High-abstraction language is prone to misunderstanding because the gap between what the speaker means and what the listener understands is larger. "I'll clean the kitchen soon" — when is soon?

Language and Power: Language choices reflect and reinforce power structures. Who gets to name things? Whose dialect is treated as "standard"? Linguistic discrimination (judging intelligence, education, or trustworthiness based on dialect) is a pervasive form of bias. Research shows identical credentials elicit different evaluations depending on whether the applicant is heard speaking in a "standard" accent vs. a regional or non-native accent.

Gender and Language (Deborah Tannen's work): Men often use language to establish status and solve problems (report talk); women often use language to build connection and share experiences (rapport talk). This is a tendencies-based generalization, not a deterministic claim about all individuals.

NONVERBAL COMMUNICATION
Albert Mehrabian's widely misquoted "7%/38%/55% rule" — that communication is 7% words, 38% tone, 55% body language — applies only to specific conditions (emotionally inconsistent messages about feelings). It is NOT a general rule. However, nonverbal communication is profoundly important — especially for conveying relational meaning, emotion, and attitudes.

Functions of Nonverbal Communication:
- Repeating: Nodding while saying "yes" reinforces the verbal message.
- Contradicting: Saying "I'm fine" while avoiding eye contact and speaking in a flat tone contradicts the words. When verbal and nonverbal conflict, we generally trust the nonverbal.
- Substituting: A thumbs-up substitutes for "good job" entirely.
- Complementing: Tone of voice and facial expression modify verbal meaning.
- Regulating: Eye contact, head nods, and pauses regulate turn-taking in conversation.
- Accenting: Pounding the table while saying "This must stop" accents the verbal message.

TYPES OF NONVERBAL BEHAVIOR

Kinesics (Body Movement):
- Emblems: Gestures with direct verbal equivalents that are culturally agreed upon (OK sign, peace sign). Culturally variable — the "OK" gesture is obscene in some countries.
- Illustrators: Gestures accompanying speech that illustrate the verbal message (sweeping arm movement when describing something large).
- Affect Displays: Facial expressions and body movements expressing emotion.
- Regulators: Cues that manage conversational flow (leaning in to indicate readiness to speak).
- Adaptors: Self-touching or object-manipulation behaviors often associated with discomfort (touching hair, clicking a pen).

Facial Expression: The face is the primary vehicle for emotional expression. Paul Ekman's research identified six basic emotions with universal facial expressions: anger, disgust, fear, happiness, sadness, surprise. Microexpressions (brief, involuntary expressions lasting a fraction of a second) can reveal true emotional states even when people try to conceal them.

Proxemics (Edward Hall): The study of how people use space in communication. Hall identified four spatial zones (for middle-class North Americans):
- Intimate space (0–18 inches): Reserved for intimate relationships (romantic partners, close family). Intrusion causes discomfort.
- Personal space (18 inches–4 feet): Comfortable for conversations with friends.
- Social space (4–12 feet): Formal interactions, business settings, classroom discussions.
- Public space (12+ feet): Public speaking, performance.
Proxemic norms vary dramatically across cultures. Northern Europeans and North Americans tend to prefer larger personal space than Southern Europeans, Latin Americans, and Middle Easterners.

Paralanguage (Vocalics): How something is said, not what is said. Includes pitch, rate, volume, vocal quality, and fillers ("um," "uh"). Excessive fillers, upward inflection (making statements sound like questions), and low volume affect speaker credibility.

Haptics (Touch): The most primitive communication channel. Touch can communicate support, affection, power, and aggression. Highly culturally variable. In professional settings, appropriate touch (handshakes, brief shoulder touches) differs from inappropriate touch — understanding these boundaries is a professional competency.

DISCUSSION QUESTIONS
1. Recall a conversation where someone said something verbally but their nonverbal behavior communicated something different. Which did you believe? Why?
2. How does the concept of proxemics explain why video calls (everyone in their own separate box) feel different from in-person meetings, even with the same words and facial expressions?
3. Describe a situation where the same gesture would be interpreted completely differently by two people from different cultural backgrounds. What does this tell us about the relationship between nonverbal communication and culture?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Interpersonal Communication',
        materialType: 'lecture',
        content: `MODULE 4: INTERPERSONAL COMMUNICATION
Relationship Development, Self-Disclosure, and Conflict Resolution

DEFINING INTERPERSONAL COMMUNICATION
Interpersonal communication is communication between two individuals (a dyad) in which the participants treat each other as unique individuals rather than as objects or role occupants. A transaction with a cashier ("paper or plastic?") is not interpersonal in this sense — it's role-based. A conversation in which you genuinely engage with that cashier as a person becomes interpersonal. The distinction is relational: do the participants treat each other as unique human beings?

RELATIONSHIP DEVELOPMENT: KNAPP'S STAIRCASE MODEL
Mark Knapp's relational development model proposes that relationships move through predictable stages — upward (coming together) and downward (coming apart). The stages are not always sequential; people can skip or cycle back.

Coming Together:
1. Initiating: First impressions, attractiveness cues, opening lines. "Nice weather."
2. Experimenting: Small talk, exploring commonalities, testing compatibility. "Where are you from? What do you study?"
3. Intensifying: Deeper sharing, increasing frequency of contact, developing in-group language and rituals.
4. Integrating: Merging social networks, sense of "we"; assumption of exclusive relationship.
5. Bonding: Public commitment — formal announcement of the relationship (marriage, business partnership).

Coming Apart:
6. Differentiating: Re-establishing individuality; "I" vs. "we" emphasis increases.
7. Circumscribing: Topics and time of communication narrow; avoidance of certain subjects.
8. Stagnating: Relationship feels stuck; communication is minimal and predictable.
9. Avoiding: Active physical and communication avoidance.
10. Terminating: The relationship ends formally or informally.

SELF-DISCLOSURE AND SOCIAL PENETRATION THEORY
Irwin Altman and Dalmas Taylor's Social Penetration Theory: Relationships develop as people reveal increasingly personal information about themselves. Two dimensions of self-disclosure:
- Breadth: The variety of topics discussed.
- Depth: The personal and sensitive level of the information shared.

Early relationships are characterized by wide breadth but shallow depth — many topics, none of them intimate. Deep friendships are characterized by both wide breadth and deep depth — wide-ranging and intimate topics. Social penetration is like peeling an onion — outer layers (public self) before inner layers (private self).

Reciprocity norm: Self-disclosure tends to be reciprocal — if I share something personal, you are expected to share something of equivalent vulnerability. Violations of this norm (sharing something very intimate with someone you barely know, or not reciprocating appropriate sharing) create discomfort.

Johari Window (Luft and Ingham): A four-quadrant model of self-awareness:
- Open/Arena: Known to self and others.
- Blind Spot: Known to others but not self.
- Hidden/Façade: Known to self but not others.
- Unknown: Known to neither self nor others.
Self-disclosure reduces the hidden quadrant; feedback reduces the blind spot. Healthy relationships have a large open window.

CONFLICT IN RELATIONSHIPS
Conflict is an expressed struggle between at least two interdependent parties who perceive incompatible goals, scarce resources, or interference from the other party in achieving their goals. Key elements: expressed (must be communicated, not just felt internally), interdependence (conflict exists because parties need each other), perceived (doesn't require objective incompatibility — only perceived incompatibility).

Conflict is inevitable in close relationships — shared lives create genuine conflicts of interest. The goal is not to eliminate conflict but to manage it productively.

Conflict Styles (Thomas-Kilmann):
- Competing (high assertiveness, low cooperation): "I win, you lose." Appropriate for genuine emergencies; destructive when used habitually.
- Collaborating (high assertiveness, high cooperation): "Win-win." Time-consuming but produces durable solutions.
- Compromising (moderate assertiveness, moderate cooperation): "We both give and take." Efficient but leaves both parties partially unsatisfied.
- Accommodating (low assertiveness, high cooperation): "You win, I defer." Appropriate for low-stakes issues; destructive when used to avoid necessary conflict.
- Avoiding (low assertiveness, low cooperation): "I won't deal with this." Appropriate for trivial issues or when cooling down; destructive as a habitual conflict response.

Destructive Conflict Patterns (John Gottman's Four Horsemen):
- Criticism: Attacking the person's character rather than a specific behavior. "You're always so selfish." vs. "I felt hurt when you didn't ask about my day."
- Contempt: Treating the other with disrespect, mockery, or disdain — the strongest predictor of relationship dissolution.
- Defensiveness: Responding to perceived attacks with counter-complaints or excuses.
- Stonewalling: Emotional withdrawal; shutting down; refusing to engage.

DISCUSSION QUESTIONS
1. Using Knapp's model, describe a relationship you've observed that seemed "stuck" in a coming-apart stage without terminating. What keeps people in stagnating relationships?
2. Think of someone you know who self-discloses at an appropriate level vs. someone who self-discloses too much (or too little). How do these extremes affect your relationship with each person?
3. Gottman's research shows that contempt is the "kiss of death" for relationships. Why do you think contempt is so much more destructive than other negative communication patterns?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Informative Speaking',
        materialType: 'lecture',
        content: `MODULE 5: INFORMATIVE SPEAKING
Speech Structure, Evidence, and Delivery Techniques

THE PURPOSE OF INFORMATIVE SPEAKING
An informative speech aims to increase the audience's knowledge, understanding, or skills regarding a topic — not to change their attitudes or behavior (that's persuasion). Effective informative speeches are specific (focused on a single, manageable topic), audience-centered (calibrated to what the audience already knows), organized (clear structure the audience can follow), and memorable (use examples, stories, and vivid language).

SPEECH STRUCTURE
Every formal speech has an introduction, body, and conclusion.

Introduction (10–15% of total speech time):
1. Attention-getter: An opening device that immediately engages the audience — a striking statistic ("Every 8 seconds, someone in the world goes blind from a preventable cause"), a compelling story, a provocative question, a brief demonstration, or a relevant quotation. Never start with "Hi, my name is..." or "Today I'm going to talk about..."
2. Audience relevance: Why should the audience care about this topic?
3. Speaker credibility: Why are you qualified to speak on this topic?
4. Preview statement: "Today I'll cover three aspects of X: first A, then B, and finally C." This "roadmap" reduces audience cognitive load.

Body (75–80% of total speech time):
Organize your main points using one of these patterns:
- Topical: Most common. Two to four main points, each covering a different aspect of the topic.
- Chronological: Events in time order. Good for historical topics, processes, biographies.
- Spatial: Organization by physical space or location. Good for geographic topics.
- Causal: Cause(s) followed by effect(s) or vice versa.
- Problem-Solution: Describes a problem then proposes a solution. (More common in persuasion.)

Each main point should be stated clearly, supported with evidence, and transitioned smoothly to the next point. Transitions ("Now that we've examined A, let's turn to B") are crucial — they prevent the audience from getting lost.

Conclusion (5–10% of total speech time):
1. Signal the end: "In conclusion..." or "Let me leave you with this..." — do not say "So... yeah" or just stop.
2. Restate the thesis and main points.
3. Memorable close: End with something that gives the audience something to take away — a callback to the introduction, a final compelling statistic, or a thought-provoking question.
Never introduce new content in the conclusion.

SUPPORTING MATERIALS (EVIDENCE)
Every main point should be supported:
- Examples: Specific cases that illustrate an abstract point. Hypothetical examples are permissible when labeled as such.
- Statistics: Numerical evidence. Must be recent, from credible sources, and interpreted for the audience. "One in four Americans experiences a mental health condition in any given year — that means about six people in this room."
- Testimony: Expert quotations lend credibility; peer testimony creates relatability.
- Narratives: Stories are the most memorable form of evidence. "Tell me a fact and I'll learn; tell me a truth and I'll believe; but tell me a story and it will live in my heart forever."
- Definitions: Especially important when using technical terms unfamiliar to the audience.

DELIVERY TECHNIQUES
Delivery modes: Manuscript (reading word-for-word — rarely appropriate; kills eye contact), Memorized (risky — forgetting = panic), Extemporaneous (prepared from notes or an outline, delivered conversationally — the professional standard), Impromptu (unprepared, on the spot — a separate skill).

Voice:
- Rate: 125–150 words per minute for most content; slow for emphasis, faster to convey excitement; vary for engagement.
- Volume: Project to the back of the room without shouting; vary for emphasis.
- Pitch and Inflection: Use natural variation; avoid monotone; avoid upward inflection on statements.
- Pause: Use silence deliberately — before a key point, after a quote, at transitions. Silence is not failure; it is a delivery tool.

Body Language:
- Eye contact: Engage with all sections of the audience; spend 3–5 seconds per person/zone before moving on; avoid staring at the floor, ceiling, or a fixed point.
- Gestures: Natural, purposeful gestures reinforce meaning; avoid repetitive or nervous gestures (rocking, playing with hair or notes).
- Posture and movement: Stand balanced and stable; move purposefully (to emphasize a transition); don't pace nervously.
- Facial expression: Match the emotional content of your speech.

DISCUSSION QUESTIONS
1. Think of the most memorable speech or presentation you've ever heard. What made it memorable? How many of the principles from this module did the speaker use?
2. A classmate asks if she can just read her speech from her phone. What would you tell her, and why? What is she sacrificing by reading?
3. Why is the attention-getter the most critical part of the introduction? What happens if the first 30 seconds of a speech are boring?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Persuasive Speaking',
        materialType: 'lecture',
        content: `MODULE 6: PERSUASIVE SPEAKING
Argument Construction, Audience Analysis, and Monroe's Motivated Sequence

WHAT IS PERSUASION?
Persuasion is communication intended to influence the attitudes, beliefs, values, or behaviors of an audience through legitimate means. "Legitimate" is important — persuasion differs from coercion (threatening consequences) and manipulation (misleading the audience). Ethical persuasion shares accurate information, acknowledges counterarguments, and respects the audience's right to make informed choices.

ARISTOTLE'S RHETORICAL APPEALS
Aristotle identified three fundamental modes of persuasion, still the bedrock of persuasion theory:
- Ethos (Credibility): The audience's perception of the speaker's character, competence, and goodwill. Ethos is earned — through demonstrated expertise, honest acknowledgment of limitations, consistent behavior, and genuine care for the audience's well-being. A speaker who is credible before arguing hasn't even started arguing; she's already persuading.
- Logos (Logic): Reasoned argument — claims supported by evidence. Types of logical argument: deductive (if premises are true, conclusion must be true — "All antibiotics kill bacteria; penicillin is an antibiotic; therefore penicillin kills bacteria") and inductive (specific cases support a general claim — "In five separate studies, exercise reduced depression symptoms; therefore exercise reduces depression"). Strength of logos depends on quality of evidence and validity of reasoning.
- Pathos (Emotion): Emotional appeals that resonate with the audience's values, fears, hopes, and experiences. Pathos is not manipulative by definition — it can be a legitimate appeal when the emotion is relevant to the argument and accurate. A speaker discussing drunk driving who shares a true story of a family devastated by a drunk driver is using pathos legitimately.

AUDIENCE ANALYSIS
The most common mistake beginning public speakers make is preparing the speech for themselves rather than for the audience. Audience-centered speaking requires knowing:
- Audience demographics: Age, gender, cultural background, academic major, political leaning (if relevant) — these create baseline assumptions about shared knowledge and values.
- Audience attitudes toward the topic: Already agree? Oppose? Neutral? Uninformed? The approach differs dramatically.
- Audience values: What do they care about? Persuasion that connects to audience values is far more effective than persuasion that asks the audience to adopt your values.
- The hostile audience: Acknowledge their position before arguing; establish common ground; don't strawman their objection; use evidence from sources they respect.

TYPES OF PERSUASIVE CLAIMS
- Claims of Fact: Assertions that something is true or false. "Vaping causes lung damage." Requires empirical evidence.
- Claims of Value: Assertions about the worth or morality of something. "The death penalty is unjust." Requires appeals to shared values and normative reasoning.
- Claims of Policy: Assertions that something should be done. "The university should expand mental health services." Requires demonstrating need, feasibility, and benefit.

Most persuasive speeches combine all three.

MONROE'S MOTIVATED SEQUENCE (Alan Monroe, 1930s)
Monroe's Motivated Sequence is a five-step organizational pattern designed specifically for persuasion. It follows the psychological process of moving an audience from comfortable inattention to motivated action.

Step 1 — ATTENTION: Get the audience's attention with something startling, dramatic, or personally relevant. "Every 11 minutes, someone in the United States dies of an opioid overdose."

Step 2 — NEED: Establish that a problem exists and that it affects the audience directly. Develop the problem fully — statistics, expert testimony, examples. The audience must feel the problem before they'll care about the solution.

Step 3 — SATISFACTION: Present your solution to the need established. Be specific — "we should do something" is not a satisfaction step. Explain how the solution works and addresses the need.

Step 4 — VISUALIZATION: Help the audience see what the world looks like with your solution adopted vs. without it. Use vivid language and narrative. "Imagine a campus where every student struggling with depression can access a counselor within three days..."

Step 5 — ACTION: Make a specific call to action — something the audience can do right now or in the near future. "Sign the petition on this table as you leave today." General calls to action ("let's all care more about this issue") are ineffective.

LOGICAL FALLACIES TO AVOID
- Ad hominem: Attacking the person making the argument rather than the argument itself.
- Straw man: Misrepresenting an opponent's argument to make it easier to attack.
- False dilemma: Presenting only two options when others exist. "Either you're with us or against us."
- Post hoc ergo propter hoc: "After this, therefore because of this" — correlation confused with causation.
- Bandwagon: "Everyone is doing it." Popularity is not proof.
- Appeal to Authority: Using a non-expert's opinion as evidence.

DISCUSSION QUESTIONS
1. You are about to give a persuasive speech to a skeptical audience on a controversial topic. What can you do in your introduction to build ethos and create openness before you begin arguing?
2. Take any claim and identify which type it is (fact, value, or policy). What type of evidence would best support each?
3. Why is Monroe's Motivated Sequence psychologically effective? Which step do you think most speeches leave out, and what is the consequence?`,
      },
      {
        moduleNumber: 8,
        title: 'Persuasive Speech Rubric',
        materialType: 'rubric',
        content: `COM 101 PERSUASIVE SPEECH RUBRIC
Assignment: Persuasive Speech (25% of course grade)
Total Points: 100 points
Time Limit: 6–8 minutes (–2 points per 30 seconds over or under)
Visual Aid: Required (1–3 slides or equivalent)
Notes: One 4x6 index card permitted

GRADING CRITERIA

1. CLAIM AND ARGUMENT (25 points)
- 22–25 pts: Clear, specific thesis (claim of fact, value, or policy) stated in introduction and maintained throughout; all main points directly support the central claim; arguments are logically sound (no fallacies); claims of fact supported by evidence from credible sources cited verbally.
- 17–21 pts: Thesis clear; most arguments support the claim; minor logical inconsistencies; most evidence cited.
- 12–16 pts: Thesis present but vague; some arguments tangential; evident logical gaps; evidence weak or uncited.
- 0–11 pts: No clear thesis; arguments disconnected; evidence absent or unreliable.

2. EVIDENCE AND SUPPORT (20 points)
- 18–20 pts: Uses at least 3 different types of support (statistics, expert testimony, examples, narratives); evidence is recent (within 5 years for factual claims), from credible sources, and verbally cited; statistics interpreted in audience-relevant terms.
- 14–17 pts: At least 2 types of evidence; most sources credible and cited; some statistics not interpreted.
- 10–13 pts: Relies on one type of evidence or anecdotes only; sources questionable or uncited.
- 0–9 pts: Little or no supporting evidence; relies on unsupported personal opinion.

3. ORGANIZATION — MONROE'S MOTIVATED SEQUENCE (25 points)
- 22–25 pts: All five steps (Attention, Need, Satisfaction, Visualization, Action) clearly present and developed; transitions between steps are smooth and explicit; Attention step is compelling; Need is fully developed; Action is specific and achievable.
- 17–21 pts: All five steps present; one step underdeveloped; transitions mostly present.
- 12–16 pts: 3–4 steps present; Monroe's sequence not clearly followed; or organization is unclear.
- 0–11 pts: Fewer than 3 steps; organizational pattern unclear; Action step absent.

4. DELIVERY (20 points)
- 18–20 pts: Conversational, extemporaneous delivery (not reading); sustained and distributed eye contact across audience; natural, purposeful gestures; appropriate rate, volume, and vocal variation; minimal fillers; confident posture; within time limit.
- 14–17 pts: Mostly extemporaneous; occasional reading from notes; mostly good eye contact; some vocal monotony or filler usage; within 1 minute of limit.
- 10–13 pts: Heavy reliance on notes or index card; limited eye contact; monotone or excessive fillers; posture suggests nervousness; slightly out of time limit.
- 0–9 pts: Reading from manuscript; no eye contact; delivery significantly detracts from message; greatly over/under time.

5. AUDIENCE ADAPTATION (10 points)
- 9–10 pts: Speech clearly adapted to this specific classroom audience — references shared experiences or course material; addresses anticipated objections; establishes audience relevance in introduction; uses appropriate vocabulary for this audience.
- 7–8 pts: Some audience adaptation; relevance partially established.
- 5–6 pts: Generic speech that could be given to any audience; no acknowledgment of who is in the room.
- 0–4 pts: Speech is clearly repurposed from another context with no adaptation.

TIME PENALTY: –2 points per 30 seconds outside the 6–8 minute window (cumulative)
MANUSCRIPT PENALTY: –10 points for reading from a prepared full text
VISUAL AID PENALTY: –5 points if required visual aid is absent`,
      }
    ]
  },


  // ────────────────────────────────────────────────
  // AT-200-STARTER — Introduction to Athletic Training
  // College of Health Sciences
  // ────────────────────────────────────────────────
  {
    courseCode: 'AT-200-STARTER',
    title: 'Introduction to Athletic Training',
    description: 'Introduces the athletic training profession, injury prevention, assessment, therapeutic modalities, emergency action planning, and clinical documentation. Students complete 40 clinical rotation hours and must hold current CPR/AED certification before clinical placement.',
    college: 'College of Health Sciences',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `AT 200 — Introduction to Athletic Training
College of Health Sciences, University of Kentucky
Spring 2026 | Lecture: MWF 10:00–10:50 AM | Health Sciences Building 205
Clinical Lab: Wednesday 1:00–4:00 PM | Sports Medicine Lab, HS 110

INSTRUCTOR
Dr. Katie Thompson, Department of Athletic Training
Office: Health Sciences Building 318
Office Hours: Monday & Wednesday 11:00 AM–12:30 PM; Tuesday 2:00–4:00 PM (Zoom)
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
AT 200 introduces students to the athletic training profession and foundational clinical competencies. Topics include professional scope of practice, injury prevention strategies, injury assessment, therapeutic modalities, emergency action planning, and clinical documentation. The course integrates lecture with hands-on skills lab and a 40-hour clinical rotation. Prerequisites: Admission to the Athletic Training Program.

REQUIRED MATERIALS
- Arnheim, D. D. & Prentice, W. E. (2023). Principles of Athletic Training: A Guide to Evidence-Based Clinical Practice (17th ed.). McGraw-Hill. ISBN: 978-1264266043
- NATA Position Statements (current) — available free at nata.org
- Lab notebook (bound, not spiral)
- Athletic training kit (contents list on Canvas; available at UK Bookstore)

GRADING BREAKDOWN
Clinical Rotation Logs & Supervisor Evaluations   30%
Practical Exams (2 practicals)                    30%
Written Exams (3 written exams)                   25%
SOAP Notes (5 SOAP notes)                         15%
TOTAL                                            100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

WRITTEN EXAM SCHEDULE
Exam 1 (Week 4): Modules 1–2 — profession overview, injury prevention, PPE
Exam 2 (Week 9): Modules 3–4 — HOPS assessment, therapeutic modalities
Exam 3 (Week 14): Modules 5–6 — emergency action planning, documentation, SOAP notes
All exams are 60 minutes; 40 multiple-choice + 2 short-answer questions.

PRACTICAL EXAMS (30%)
Practical Exam 1 (Week 7): Students demonstrate taping/bracing techniques and vital sign assessment on a lab partner. Evaluated by faculty using a standardized skills checklist.
Practical Exam 2 (Week 13): Students demonstrate a complete HOPS assessment for an assigned injury scenario and complete a SOAP note within 20 minutes.
Each practical is scored pass/fail per skill; a cumulative score of 75% or higher is required to pass each practical. Students who score below 75% on a practical have one remediation opportunity within one week. Failure of the second attempt results in a mandatory advising meeting and possible course failure.

CERTIFICATIONS REQUIRED BEFORE CLINICAL ROTATION
Students must hold current certifications in ALL of the following before beginning clinical rotation hours (Week 5):
1. CPR/AED for the Professional Rescuer (American Heart Association BLS for Healthcare Providers or equivalent) — must be current (within 2 years); in-person skills check required, online-only courses not accepted.
2. First Aid certification (can be combined with AHA BLS course).
Students who have not completed certifications by Week 4 will not be permitted to begin clinical rotation and may not be able to complete the required hours, resulting in course failure. Submit proof of certification (card or certificate) to the course coordinator by the end of Week 4.

CLINICAL ROTATION (30%)
Students complete 40 hours of supervised clinical experience in an approved athletic training setting (UK Athletics, campus recreation, or affiliate high school). Clinical hours begin Week 5 and must be completed by Week 15. Students log hours in the online clinical management system (ATrack); supervisors verify hours weekly.
Clinical Evaluation: At the end of the rotation, the site supervisor completes a standardized evaluation of the student's professional conduct, technical skills, communication, and work ethic (submitted through ATrack). This evaluation constitutes 50% of the Clinical Rotation grade; the remaining 50% is based on submitted log entries.
Log Entries: Students submit a weekly reflection (minimum 200 words) for each week of clinical hours describing: skills observed/performed, learning moments, and questions for follow-up. Logs submitted more than 1 week late receive a 50% deduction.

UNIFORM POLICY
Clinical lab and rotation uniform: Khaki pants or shorts (no ripped jeans, sweatpants, or athletic shorts except during field settings), white or UK blue polo shirt with AT logo, closed-toe athletic shoes. Hair pulled back. Name badge worn at all times during clinical. Students out of uniform will be sent home; absence counts as unexcused.

SOAP NOTES (15%)
Students submit 5 SOAP notes based on assigned clinical scenarios (Weeks 4, 6, 8, 11, 13). SOAP notes must be typed, professional in format, and demonstrate accurate clinical reasoning. See SOAP Note Guidelines on Canvas. Late SOAP notes: –10 points per day.

ACADEMIC INTEGRITY AND HIPAA
All patient/athlete information encountered during clinical rotation is confidential. HIPAA violations, including social media posting of any identifiable patient information, result in immediate removal from the clinical rotation and possible program dismissal.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: The Athletic Training Profession',
        materialType: 'lecture',
        content: `MODULE 1: THE ATHLETIC TRAINING PROFESSION
Scope of Practice, BOC, State Licensure, and the Healthcare Team

WHAT IS ATHLETIC TRAINING?
Athletic training is a health care profession recognized by the American Medical Association. Athletic trainers (ATs) are healthcare professionals who collaborate with physicians to optimize the activity and participation of patients and clients across the lifespan. The scope of AT practice includes prevention, clinical evaluation and diagnosis, immediate care, treatment, rehabilitation, and reconditioning, as well as organization and administration and professional responsibility.

ATs work in diverse settings: collegiate and professional athletics (the "traditional" setting), secondary school athletics, clinics and hospitals, military and tactical, performing arts, occupational/industrial settings, and physician offices. The image of an AT running onto the football field to help a fallen player represents only a small slice of the profession's actual scope.

PROFESSIONAL ORGANIZATIONS AND CREDENTIALING
Board of Certification (BOC): The BOC issues and maintains the ATC credential (Athletic Trainer Certified). To sit for the BOC examination, candidates must:
1. Graduate from a CAATE-accredited professional program (Masters or post-baccalaureate level as of 2022)
2. Complete required clinical education hours
3. Have a current CPR/AED certification

The BOC examination tests knowledge across five domains: injury and illness prevention and wellness promotion; examination, assessment, and diagnosis; immediate and emergency care; therapeutic intervention; and health care administration and professional responsibility.

National Athletic Trainers' Association (NATA): The professional membership organization for ATs. Founded 1950. Publishes the Journal of Athletic Training, advocates for the profession, and sets professional standards. NATA position statements provide evidence-based guidance on major clinical topics.

State Licensure: Athletic training is regulated in all 50 U.S. states plus the District of Columbia. Kentucky requires licensure through the Kentucky Board of Medical Licensure. The ATC credential (BOC) is required for licensure. Practicing athletic training without a license is illegal. Each state has a scope of practice defined in statute — ATs must know the specific limits of their state's scope.

THE ATHLETE HEALTHCARE TEAM
ATs work within an interprofessional team, always under the direction of a licensed physician. Understanding each team member's role prevents scope conflicts and ensures optimal patient care:
- Team Physician: The medical director; diagnoses injury and illness; prescribes treatment; makes return-to-play decisions (ultimate authority).
- Certified Athletic Trainer: Day-to-day prevention, assessment, treatment, and rehabilitation; implements physician's plan of care; primary healthcare contact for athletes.
- Physical Therapist: Rehabilitation specialist; ATs often work alongside or refer to PTs for complex rehabilitation.
- Orthopedic Surgeon: Surgical management of severe musculoskeletal injuries (ACL reconstruction, fracture fixation).
- Sport Psychologist: Mental health support, performance psychology.
- Registered Dietitian/Nutritionist: Performance nutrition, body composition management, disordered eating management.
- Strength and Conditioning Coach: Periodized training; injury prevention programming.
- Emergency Medical Services (EMS): Activated in life-threatening emergencies.

PROFESSIONAL STANDARDS AND ETHICS
The NATA Code of Ethics and the BOC Standards of Professional Practice govern athletic trainer conduct. Core principles: members must not misrepresent their qualifications, must practice only within their education and scope, must maintain patient confidentiality (HIPAA), must prioritize patient welfare over personal interest, and must respect the dignity and autonomy of patients.

Athletic trainers are mandatory reporters in most states — they are required to report suspected abuse of a minor to appropriate authorities regardless of employer direction.

DISCUSSION QUESTIONS
1. An AT's coach tells him to clear a player to return to play after a concussion because "we need him for Friday's game." The AT does not believe the player is ready. What should the AT do? What professional and legal obligations apply?
2. What is the difference between a CAATE-accredited program and any other exercise science degree? Why does accreditation matter for professional practice?
3. Compare the scope of practice of an AT to that of a physical therapist. Where do they overlap? Where do they differ?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Injury Prevention',
        materialType: 'lecture',
        content: `MODULE 2: INJURY PREVENTION
Pre-Participation Exams, Protective Equipment, and Taping and Bracing

THE PREVENTION PRIORITY
Athletic trainers operate within the injury prevention framework before anything else — preventing injury is always better than treating it. A well-structured prevention program reduces injury incidence, reduces healthcare costs, reduces athlete downtime, and improves performance.

PRE-PARTICIPATION PHYSICAL EXAMINATION (PPE)
The PPE is a medical evaluation conducted before an athlete begins participation in a sport, designed to:
1. Detect conditions that predispose an athlete to injury or illness
2. Detect conditions that may be life-threatening or disabling (cardiac, neurological)
3. Meet legal and insurance requirements
4. Establish baseline health data (especially for concussion: ImPACT baseline testing)

PPE Components: Health history questionnaire (the most valuable part — most disqualifying conditions are identified here), physical examination (vital signs, height/weight, cardiovascular exam, musculoskeletal screening), vision screening, and sport-specific testing.

Cardiovascular Screening: Sudden cardiac death (SCD) in young athletes, while rare, is the leading cause of non-traumatic sport-related death. The most common cause is hypertrophic cardiomyopathy (HCM) — a genetic condition causing pathological thickening of the heart wall. Standard PPE cardiovascular screening: history questions targeting symptoms (syncope, exertional chest pain, palpitations, dyspnea), family history of premature cardiac death, and physical exam (heart rate, blood pressure, auscultation). The AHA recommends a 14-element cardiovascular screening history and physical.

PROTECTIVE EQUIPMENT
The AT is responsible for selecting, fitting, maintaining, and inspecting protective equipment. Improperly fitted equipment can cause injury rather than prevent it.

Helmets: Certification standards (NOCSAE for football, hockey, lacrosse helmets). Fitting: should sit level, one to two finger-widths above the eyebrow; no movement with jaw pads inflated; facemask should be appropriate for position. Annual inspection; recertification required; helmets cannot prevent concussion — they reduce the risk of skull fracture and catastrophic brain injury.

Football Shoulder Pads: Cantilevered (linemen) vs. flat (skill positions). Fit: epaulets cover AC joint; deltoid coverage; cantilever extends to mid-upper arm.

Mouth Guards: Required in collision sports; reduce dental and oral injuries; do NOT prevent concussion.

Bracing: Functional braces (post-injury support for ACL, ankle) and prophylactic braces (preventive — controversial evidence for knee bracing). Ankle bracing (lace-up braces) has strong evidence for reducing ankle sprain recurrence.

TAPING AND BRACING PRINCIPLES
Athletic taping is one of the most visible and foundational AT skills. Principles:
- Always begin with a pre-wrap (underwrap) to protect skin; avoid taping over bare skin for extended periods.
- Anchor strips first to establish the base of the taping job.
- Apply appropriate tension — supportive but not compressive enough to impair circulation.
- Skin integrity check before each taping application; do not tape over open wounds, blisters, or active dermatitis without coverage.
- Heel and lace pads protect bony prominences.

Common taping procedures:
Closed Basketweave Ankle Taping (preventive): Anchors → stirrups (vertical strips under heel, up both sides) → horseshoes (horizontal strips completing the basketweave) → heel lock → closing strips. Restricts inversion without impeding dorsiflexion.

Preventive knee taping (McConnell technique): Patellar mobilization taping for patellofemoral pain syndrome — repositions the patella using rigid tape to reduce lateral tracking.

Wrist/Thumb Spica Taping: Supports the ulnar collateral ligament of the thumb (gamekeeper's thumb); frequently used in contact sports.

NEUROMUSCULAR TRAINING PROGRAMS
Beyond equipment, injury prevention involves neuromuscular training:
- FIFA 11+: An evidence-based warm-up protocol reducing soccer injuries by 30–50%. Incorporates running mechanics, core stability, plyometrics, and balance training.
- Balance training: Single-leg balance, BOSU exercises — reduces ankle sprains by improving proprioception.
- ACL prevention programs (PEP Program, ACL-STOP): Neuromuscular training reducing ACL injury incidence, especially in female athletes who have 2–8× higher ACL injury rates than males.

DISCUSSION QUESTIONS
1. A high school athlete discloses during her PPE history that she has had two episodes of syncope during exercise. What does this indicate, and what should happen next?
2. Why does ankle bracing have stronger evidence for recurrence prevention than for primary prevention? What does this tell us about how prevention evidence should be interpreted?
3. What factors contribute to female athletes' higher ACL injury rates compared to male athletes? What prevention implications follow?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Assessment Foundations — The HOPS Model',
        materialType: 'lecture',
        content: `MODULE 3: ASSESSMENT FOUNDATIONS
The HOPS Model — History, Observation, Palpation, Special Tests

THE SYSTEMATIC ASSESSMENT IMPERATIVE
A systematic approach to injury assessment is essential for two reasons: (1) it ensures no critical component is missed, and (2) it produces reproducible, defensible documentation. The HOPS model is the standard framework for musculoskeletal injury assessment used by athletic trainers.

H — HISTORY
The history is the most informative part of the assessment — approximately 80% of diagnoses can be determined from a thorough history alone. Key questions:

Chief Complaint: What is the primary problem? Let the athlete describe it in their own words before directing the interview.
Mechanism of Injury (MOI): How did the injury happen? Direction of force, position of the limb, contact vs. non-contact? The MOI often tells you which structures are at risk before you touch the athlete.
  - Inversion + plantarflexion → lateral ankle ligaments (ATFL, CFL)
  - Valgus force at the knee → MCL, possibly ACL + medial meniscus (O'Donoghue's triad)
  - Direct blow to lateral knee → LCL
  - Non-contact deceleration/cutting → ACL
  - Overhead throw → rotator cuff, UCL of elbow

Location of Pain: Where exactly? Point to it. Radiating? Local vs. diffuse?
Onset: Acute (sudden, specific moment) vs. chronic/insidious (gradual, no specific incident)?
Severity: Pain scale (0–10); what activities provoke or relieve it?
Previous Injury: Same location? How was it managed? Did it fully heal? Prior injury is the strongest risk factor for re-injury.
Disability Level: Can the athlete bear weight? Continue playing? Function?
Medical History: Current medications? Allergies? Other conditions? Recent illness (viral myocarditis can present as chest pain during exercise)?

O — OBSERVATION
Visual inspection before touching the athlete:
- Compare bilaterally — the uninjured side is your reference standard.
- Posture and alignment (standing, seated, lying)
- Swelling: Localized (specific structure) vs. diffuse (joint effusion). The knee is one of the fastest joints to develop an effusion after injury — significant hemarthrosis within 2 hours suggests ACL or osteochondral injury.
- Ecchymosis (bruising): Indicates hemorrhage. Note location and extent. Delayed bruising (24–48 hours after injury) is common as blood tracks superficially through tissue planes.
- Muscle atrophy: Asymmetrical muscle bulk suggests chronic disuse or nerve injury.
- Deformity: Fracture, dislocation, or significant muscular injury can produce visible deformity. If deformity is present, defer palpation and special tests — stabilize and refer immediately.
- Skin integrity: Lacerations, abrasions, rashes, blistering.

P — PALPATION
Systematic palpation of the injured region to identify specific anatomical structures involved:
- Begin away from the point of maximal tenderness and work toward it — touching the most painful point first causes guarding that compromises the entire exam.
- Bony palpation first (rule out fracture) → then ligamentous and musculotendinous structures → then neural and vascular structures.
- Point tenderness over a bone = fracture until proven otherwise. Use the Ottawa Rules (validated decision rules for ankle and knee radiograph requirements) to guide X-ray decisions.
- Temperature assessment: Increased warmth suggests acute inflammation or infection; decreased temperature suggests vascular compromise.

S — SPECIAL TESTS
Orthopaedic special tests are designed to stress specific anatomical structures, provocatively reproducing symptoms to implicate specific pathology.

Sensitivity vs. Specificity:
- Sensitivity: A test's ability to correctly identify injured athletes (few false negatives). A highly sensitive test rules OUT injury when negative — "SnNout."
- Specificity: A test's ability to correctly identify uninjured athletes (few false positives). A highly specific test rules IN injury when positive — "SpPin."
No single special test is definitive. Cluster tests (using multiple tests together) improves diagnostic accuracy.

Selected Special Tests:
Anterior Drawer Test (ankle): Stabilize distal tibia; apply anterior force to calcaneus; excessive anterior translation = ATFL tear.
Lachman Test (knee): Most sensitive test for ACL integrity. Knee at 20–30° flexion; stabilize distal femur; apply anterior force to proximal tibia; excessive translation + soft endpoint = ACL injury. Sensitivity ~86%, specificity ~91%.
McMurray Test (meniscus): Knee flexion/extension with tibial rotation; a palpable/audible click with pain = meniscal pathology.
Valgus Stress Test (MCL): Apply valgus force at knee with leg extended (0°) and at 30° flexion; gapping at 30° = MCL injury; gapping at 0° = possible PCL/capsular involvement.
Empty Can Test (supraspinatus): Arm elevated to 90°, 30° horizontal abduction (scapular plane), internally rotated (thumb down); manual resistance applied; pain or weakness = supraspinatus pathology.

FUNCTIONAL TESTING
After special tests, if no fracture or serious injury is suspected, functional testing assesses the athlete's ability to perform sport-specific activities: weight-bearing status, walking, jogging, cutting. This guides return-to-play decisions.

DISCUSSION QUESTIONS
1. A basketball player presents with acute knee swelling immediately after a non-contact landing. She heard a "pop." Using your HOPS assessment, what structures are most likely injured, and what special tests would you prioritize?
2. Why does a highly sensitive test failing to find injury give you more confidence the athlete is uninjured than a test with low sensitivity doing the same? Use Lachman as your example.
3. A coach insists on knowing "what's wrong" with his athlete immediately after the injury occurs. What should the AT communicate, and what should he NOT communicate until assessment is complete?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Therapeutic Modalities',
        materialType: 'lecture',
        content: `MODULE 4: THERAPEUTIC MODALITIES
Cryotherapy, Heat, Ultrasound, and Electrical Stimulation

PRINCIPLES OF THERAPEUTIC MODALITIES
Therapeutic modalities are physical agents applied to facilitate tissue healing, reduce pain, decrease inflammation, and restore function. ATs must understand: the physiological mechanism of each modality, the indications (when to use it), contraindications (when not to use it, because it may cause harm), and the research evidence supporting its use. Modalities are adjuncts — not substitutes — for exercise rehabilitation.

CRYOTHERAPY (ICE/COLD)
Physiological Effects of Cold Application:
- Vasoconstriction → reduces blood flow and edema in acute injury
- Decreased nerve conduction velocity → reduces pain transmission (analgesic effect)
- Decreased metabolic rate → reduces secondary hypoxic injury in surrounding tissue
- Decreased muscle spasm (via decreased spindle excitability)

Indications: Acute injury (first 72 hours, though evidence for the classic RICE/PRICE protocol is mixed and evolving), post-exercise recovery, post-surgical management, spasticity reduction.

Types: Ice pack (most common), ice massage (small localized area — excellent for tendinopathy), ice bath/cold whirlpool (limb immersion — good for ankle/foot), vapocoolant spray (immediate field use).

Application: Ice pack — wet towel barrier between ice and skin; 15–20 minutes maximum; allow rewarming before reapplication. Ice massage — direct application, circular motion, 5–10 minutes.

Contraindications: Cold hypersensitivity (cryoglobulinemia, Raynaud's phenomenon), impaired circulation, open wounds, area of compromised sensation (risk of frostbite).

THERMOTHERAPY (HEAT)
Physiological Effects of Heat Application:
- Vasodilation → increased blood flow, nutrient delivery, metabolite removal
- Increased tissue extensibility (collagen) → improved ROM when combined with stretching
- Increased nerve conduction velocity → reduces pain (counter-stimulation theory)
- Increased metabolic rate → accelerates healing (subacute and chronic phases)

Indications: Subacute and chronic conditions (>72 hours post-injury), pre-exercise warm-up for chronic conditions, muscle spasm, joint stiffness.

Types: Superficial heat — hot pack (moist heat, 6–8 towel layers), paraffin bath (hands/feet), whirlpool, fluidotherapy (dry heat through agitated cellulose particles — excellent for desensitization of hypersensitive extremities).

Contraindications: Acute injury (first 48–72 hours), impaired sensation, peripheral vascular disease, malignancy over treatment area, open wounds, pregnancy (over lower back/abdomen), areas with decreased circulation.

THERAPEUTIC ULTRASOUND
Ultrasound uses high-frequency sound waves (1 or 3 MHz) to produce either thermal (continuous mode) or non-thermal (pulsed mode) effects in deep tissue (up to 5 cm depth, depending on frequency).

Thermal effects (continuous mode, >50% duty cycle): Deep tissue heating beyond what superficial heat can achieve — increases tissue extensibility, promotes remodeling.
Non-thermal/mechanical effects (pulsed mode): Acoustic cavitation (stable — creation of microscopic gas bubbles that oscillate, increasing membrane permeability) and acoustic streaming → promotes cell membrane permeability, protein synthesis, and wound healing. Used in acute phase when thermal effects are contraindicated.

Parameters:
- Frequency: 1 MHz — deep tissue (3–5 cm); 3 MHz — superficial tissue (<1.5 cm)
- Intensity: 0.5–2.0 W/cm² (thermal); 0.1–1.0 W/cm² (non-thermal)
- Duty cycle: 100% = continuous; 20% or 50% = pulsed (non-thermal)
- Duration: 5–10 minutes per treatment area; move sound head continuously (1–4 cm/sec)

Contraindications: Do not use over: epiphyseal plates (growing children), the eye, the heart, pacemakers, the spine (post-laminectomy), malignancy, thrombophlebitis, reproductive organs.

ELECTRICAL STIMULATION (E-STIM)
Various electrical current forms are used for different purposes:
Neuromuscular Electrical Stimulation (NMES): Elicits muscle contractions; used for muscle re-education, prevention of atrophy during immobilization, strengthening.
Transcutaneous Electrical Nerve Stimulation (TENS): Pain management via gate control theory (large-diameter afferent fibers stimulated, "closing the gate" to pain signals) or endorphin release. Does not heal tissue; manages pain.
Interferential Current (IFC): Two medium-frequency currents that "interfere" at depth, producing a low-frequency therapeutic current with deep tissue penetration and high patient comfort.
Russian Stimulation: High-frequency sinusoidal current for maximal muscle strength gains (post-surgical ACL, quadriceps inhibition).

DISCUSSION QUESTIONS
1. An athlete sprains her ankle on Tuesday. On Thursday, should you apply ice or heat? Justify your answer using the physiological mechanisms.
2. A colleague sets up ultrasound at 1.0 W/cm² continuous mode over the distal tibia of a 14-year-old athlete. What concern do you have, and what parameter would you change?
3. A patient asks you: "Does ice actually speed up healing or just help with pain?" How would you answer, referencing current evidence?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Emergency Action Planning',
        materialType: 'lecture',
        content: `MODULE 5: EMERGENCY ACTION PLANNING
Concussion Protocol, Heat Illness, and Spine Injury Management

THE EMERGENCY ACTION PLAN (EAP)
An Emergency Action Plan is a written, practiced protocol specifying the exact steps to be taken when a life-threatening emergency occurs at an athletic venue. Every venue must have its own EAP — a plan for the football stadium does not cover the aquatic center. NATA requires ATs to have site-specific EAPs for every venue they cover.

EAP Components:
1. Emergency personnel roles and communication chain (who calls EMS, who meets the ambulance, who manages the crowd)
2. Emergency communication procedures (phone numbers, location of nearest phone if cell service is poor)
3. Emergency equipment location and availability (AED, emergency kit, spine board)
4. Venue-specific directions for EMS access (which gate, which field)
5. Documentation and review schedule

EAP Activation: Any life-threatening condition activates the EAP. Criteria: unresponsiveness, absent or agonal breathing, suspected spinal injury with neurological deficits, cardiovascular emergency, anaphylaxis, exertional heat stroke, status epilepticus.

CONCUSSION MANAGEMENT
A concussion is a traumatic brain injury caused by a biomechanical force (direct or indirect) that results in neurological dysfunction. It does NOT require loss of consciousness — LOC occurs in fewer than 10% of concussions.

Recognition:
- Reported symptoms: Headache (most common), pressure in the head, dizziness, foggy feeling, nausea, memory impairment, sensitivity to light/noise.
- Signs: Appears dazed, moves clumsily, answers questions slowly, shows behavior or personality changes, cannot recall events before or after the injury.
- Assessment tools: Sport Concussion Assessment Tool 5 (SCAT5) — standardized sideline evaluation. Vestibular/Ocular Motor Screening (VOMS). ImPACT neurocognitive test — compared to baseline obtained in pre-participation exam.

Same-Day Return-to-Play is NOT permitted: Any athlete suspected of having a concussion must be removed from play immediately and not returned the same day. This is consensus guideline across all major sports medicine organizations.

Return-to-Play (RTP) Protocol: Graduated stepwise protocol once asymptomatic at rest:
Stage 1: Symptom-limited activity
Stage 2: Light aerobic exercise (walking, swimming)
Stage 3: Sport-specific exercise
Stage 4: Non-contact training drills
Stage 5: Full contact practice (following medical clearance)
Stage 6: Return to competition
Each stage minimum 24 hours; any return of symptoms → drop back one stage. Medical clearance by a physician required before Stage 5.

EXERTIONAL HEAT ILLNESS
Heat illnesses exist on a spectrum of severity:
Heat Cramps: Painful muscle spasms from fluid and electrolyte depletion. Treatment: rest, oral fluid and electrolyte replacement, gentle stretching.
Heat Exhaustion: Heavy sweating, weakness, cold/pale/clammy skin, weak pulse, nausea, fainting. Temperature may be elevated but <104°F (40°C). Treatment: move to cool environment, remove excess clothing, cool the athlete (wet towels, fans, cool water immersion), oral fluids if alert.
Exertional Heat Stroke (EHS) — LIFE-THREATENING EMERGENCY: Core temperature ≥104°F (40°C) WITH central nervous system dysfunction (confusion, combativeness, loss of consciousness, seizure). EHS is a medical emergency. Treatment: cold water immersion (the most effective cooling method) — submerge to neck in ice water while awaiting EMS. Do NOT wait for EMS before cooling. The motto: "Cool first, transport second." Delayed cooling dramatically increases mortality and morbidity.

CERVICAL SPINE MANAGEMENT
Any athlete with head/neck trauma who presents with neck pain, neurological symptoms (numbness, tingling, weakness), or altered consciousness must be managed for a potential spinal injury until proven otherwise.

On-field management priorities:
1. Stabilize the head and cervical spine manually — do not allow movement.
2. Assess airway, breathing, circulation (ABCs).
3. If airway management required: jaw thrust maneuver (not head-tilt/chin-lift — maintains spinal alignment).
4. Apply rigid cervical collar while maintaining manual stabilization.
5. Log-roll to spine board with minimum 5-person team; maintain spinal alignment throughout.
6. Secure to spine board with straps and head immobilization device.
7. Transport to emergency facility.

Helmet Removal: For sports with helmets, leave the helmet in place unless (a) you cannot control the airway with the helmet on, or (b) the helmet fit is so poor that it does not immobilize the head in neutral position. Face mask is removed immediately to provide airway access.

ANAPHYLAXIS MANAGEMENT
Anaphylaxis: A severe, potentially fatal allergic reaction. Signs: hives, swelling, difficulty breathing, hypotension, loss of consciousness. Treatment: Epinephrine auto-injector (EpiPen) administered to the lateral thigh immediately — there is no "wait and see" with anaphylaxis. Activate EAP/call 911. Epinephrine wears off in 15–20 minutes; patient must be transported to hospital for observation and possible additional treatment.

DISCUSSION QUESTIONS
1. An athlete takes a hit, walks to the sideline, and says her head hurts a little but she "feels fine now." She wants to return to play. What do you do?
2. Why is cold water immersion the preferred treatment for exertional heat stroke rather than ice packs or a cooling vest? Be specific about the physiological reason.
3. Your venue has no EAP when you start a new AT position. What steps would you take, and who would you involve in developing one?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Documentation — SOAP Notes',
        materialType: 'lecture',
        content: `MODULE 6: DOCUMENTATION
SOAP Notes, Injury Tracking, and Insurance and Liability Basics

WHY DOCUMENTATION MATTERS
Clinical documentation is simultaneously a legal record, a communication tool between providers, a billing document, and a quality improvement resource. In athletic training, documentation serves an additional function: establishing that the AT provided appropriate care within their scope of practice — critical for liability protection.

"If it isn't documented, it wasn't done" is a foundational principle of healthcare documentation. An AT who performs excellent care but documents nothing has no defense if a patient later claims negligent treatment.

THE SOAP NOTE FORMAT
SOAP (Subjective, Objective, Assessment, Plan) is the universal format for clinical encounter documentation in athletic training and many other healthcare professions. It was developed by Dr. Lawrence Weed in the 1960s as part of problem-oriented medical records and remains the standard today.

S — SUBJECTIVE
Information provided by the athlete/patient (their words, not your interpretation). Includes:
- Chief complaint (in the athlete's own words, often quoted): "My ankle hurts on the outside when I roll it inward."
- History of present illness: When did it happen? How? Was there a pop or snap? Previous injury?
- Symptom description: Location, character (sharp vs. dull, burning vs. aching), intensity (0–10 scale), aggravating factors, relieving factors, disability.
- Relevant medical history, medications, allergies, recent illnesses.

Write in third person and use direct quotes when possible: "Athlete reports 7/10 pain along the lateral ankle following inversion mechanism during practice today. States she heard a 'pop' at time of injury. Denies previous ankle injury. No medications or allergies reported."

O — OBJECTIVE
Measurable, reproducible clinical findings — what you observed and measured. Includes:
- Vital signs (if relevant)
- Observation findings: swelling present (diffuse vs. localized), ecchymosis (absent/present, location), deformity (absent/present), weight-bearing status
- Range of motion measurements (use goniometer; document in degrees)
- Strength testing (manual muscle testing grades 0–5)
- Palpation findings: point tenderness (specify exact anatomical location), crepitus
- Special test results: name the test, describe the finding, indicate positive or negative: "Anterior Drawer Test: positive — excessive anterior translation with absent endpoint compared to contralateral side"
- Functional test results: single-leg balance, weight-bearing assessment

Write objectively: "Moderate diffuse swelling noted lateral ankle. Moderate ecchymosis present over lateral malleolus. Palpation reveals point tenderness over ATFL. Anterior Drawer Test: positive. Active ROM: dorsiflexion 15°, plantarflexion 45° (WNL), inversion limited to 10° due to pain."

A — ASSESSMENT
Your clinical interpretation of the subjective and objective findings — what you think the diagnosis or problem is. ATs use the term "clinical impression" or "working diagnosis" (ATs can assess, not diagnose in the medical-legal sense in some states — know your state scope):
- Working diagnosis or clinical impression: "Clinical impression consistent with Grade II lateral ankle sprain (ATFL), left ankle."
- Problem list if multiple issues present.
- Severity and prognosis: "Moderate severity; anticipated return to limited participation in 5–7 days."
- Referral decision: "Referred to team physician for X-ray evaluation to rule out fracture" — indicate any referrals made.

P — PLAN
The management plan: What will you do, when, how often?
- Immediate treatment: "Ice pack applied 20 minutes. Compression wrap applied. Elevation."
- Short-term plan: "Crutches provided; non-weight bearing × 48 hours. RICE protocol continued."
- Rehabilitation plan: "ROM exercises to begin when pain-free at rest. Strengthening to follow."
- Follow-up: "Re-evaluate tomorrow morning before practice."
- Patient education: "Athlete educated on RICE, signs of worsening (increasing pain, numbness, inability to bear weight after 48 hours → ER)."
- Return-to-play criteria: "Full weight-bearing, full ROM, adequate strength, passing functional tests."

INJURY TRACKING AND SURVEILLANCE
Systematic injury tracking across a team or program:
- Required for identifying injury patterns (e.g., ACL injuries cluster pre-season → training load issue?)
- Enables outcome measurement (are rehabilitation protocols working?)
- Supports insurance documentation and liability defense
- Tools: Paper logs, electronic medical records (ATrack, Sports Ware, DragonFly), institutional systems

INSURANCE AND LIABILITY BASICS
ATs should carry professional liability (malpractice) insurance — provided by employer in most settings, but personal coverage is strongly recommended.

Liability exposure: Negligence (failure to provide care meeting the standard of a reasonably prudent AT in similar circumstances), scope of practice violations, failure to refer (when referral was indicated), and failure to document.

Good Samaritan Laws: Protect healthcare providers who render emergency aid outside their professional setting. Kentucky's Good Samaritan law provides immunity for emergency aid rendered in good faith unless the provider was grossly negligent or acted willfully or wantonly.

DISCUSSION QUESTIONS
1. An AT provides outstanding emergency care for a severe knee injury but doesn't document it because she was "too busy." A month later, the athlete's family claims the AT did nothing. What is the AT's position?
2. Read the following objective finding: "Athlete looked like he was in a lot of pain and could barely walk." Rewrite this as proper objective documentation.
3. If the SOAP format is so effective, why do some healthcare providers resist using it? What barriers exist to thorough documentation in busy clinical environments?`,
      },
      {
        moduleNumber: 8,
        title: 'SOAP Note Rubric',
        materialType: 'rubric',
        content: `AT 200 SOAP NOTE RUBRIC
Assignment: SOAP Note (5 SOAP notes, each worth 3% of course grade; total 15%)
Total Points per SOAP Note: 100 points
Due: Weeks 4, 6, 8, 11, and 13 (Sunday 11:59 PM on Canvas)
Each SOAP note is based on an assigned clinical scenario.

GRADING CRITERIA

1. SUBJECTIVE SECTION (20 points)
- 18–20 pts: Chief complaint recorded in athlete's own words (quoted); complete history including mechanism, onset, location, severity (0–10 scale), aggravating/relieving factors, disability, previous injury, and relevant medical history; clearly written in third person; all information is subjective (no objective measurements included in this section).
- 14–17 pts: Most subjective elements present; minor omissions (e.g., pain scale missing); mostly third person.
- 10–13 pts: Chief complaint present; significant history gaps; subjective and objective elements mixed.
- 0–9 pts: Section largely absent; no chief complaint; does not capture athlete's report accurately.

2. OBJECTIVE SECTION (25 points)
- 22–25 pts: All relevant objective findings documented with specificity — includes observation (swelling, ecchymosis, deformity described precisely and bilaterally compared), palpation (exact anatomical structures palpated, point tenderness location), ROM (degrees with goniometry or estimated), special tests (test name + finding + positive/negative), strength (MMT grade), and functional status; no subjective language; uses correct anatomical terminology.
- 17–21 pts: Most objective findings present; some imprecision in structure names or test results; minor mixing of objective and subjective.
- 12–16 pts: Significant omissions (no special tests, or no ROM); anatomical terminology imprecise; subjective language present.
- 0–11 pts: Objective section largely absent or describes the injury rather than clinical findings.

3. ASSESSMENT SECTION (20 points)
- 18–20 pts: Clear clinical impression with anatomical structure(s) involved and severity/grade where applicable; assessment logically follows from objective findings; referral recommendation included where appropriate; no new information introduced that wasn't in S or O sections.
- 14–17 pts: Working diagnosis present; partially supported by findings; referral noted.
- 10–13 pts: Assessment vague ("sprained ankle") without structure specificity; does not follow clearly from findings.
- 0–9 pts: Assessment absent; or restates symptoms rather than interpreting findings.

4. PLAN SECTION (25 points)
- 22–25 pts: Complete plan with immediate treatment (modality, parameters, duration), short-term management (weight-bearing status, supports, home care instructions), rehabilitation progression stages, follow-up schedule, and return-to-play criteria; each intervention is specific (modality name + parameters) and evidence-based; patient/athlete education documented.
- 17–21 pts: Most plan components present; one or two specific parameters missing; some evidence basis.
- 12–16 pts: Plan present but generic; parameters absent; progression unclear; no return-to-play criteria.
- 0–11 pts: Plan largely absent; non-specific ("rest and ice"); no progression or follow-up.

5. FORMAT, TERMINOLOGY, AND PROFESSIONALISM (10 points)
- 9–10 pts: Correct SOAP format; professional clinical writing style (no slang, no first person); correct anatomical and clinical terminology throughout; no spelling/grammar errors affecting comprehension; typed; proper heading with date, provider, athlete identification.
- 7–8 pts: Format correct; mostly professional language; minor terminology or spelling errors.
- 5–6 pts: Format partially correct; unprofessional language or significant terminology errors.
- 0–4 pts: Format not followed; clinical language absent; multiple errors impede professional interpretation.

PENALTIES
- Late submission: –10 points per day
- Incomplete heading (missing date, provider, or athlete ID): –5 points`,
      }
    ]
  },

  // ────────────────────────────────────────────────
  // PHE-201-STARTER — Introduction to Public Health
  // College of Public Health
  // ────────────────────────────────────────────────
  {
    courseCode: 'PHE-201-STARTER',
    title: 'Introduction to Public Health',
    description: 'A survey of the field of public health covering core functions, epidemiological methods, social determinants of health, health behavior theory, environmental health, and health policy. Students complete a community project with a local partner organization and write a policy memorandum.',
    college: 'College of Public Health',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `PHE 201 — Introduction to Public Health
College of Public Health, University of Kentucky
Spring 2026 | TR 2:00–3:15 PM | College of Public Health Building 108

INSTRUCTOR
Dr. Katie Thompson, Department of Epidemiology and Environmental Health
Office: College of Public Health 240
Office Hours: Tuesday 3:30–5:00 PM; Thursday 3:30–4:30 PM; Wednesday by Zoom appointment
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
PHE 201 introduces the science and practice of public health. Students explore core public health functions, epidemiological tools, social and environmental determinants of health, behavior change theory, and health policy processes. The course integrates a required community project with a local public health partner. No prerequisites.

REQUIRED MATERIALS
- Schneider, M. J. (2023). Introduction to Public Health (6th ed.). Jones & Bartlett Learning. ISBN: 978-1284220100
- Additional readings on Canvas (peer-reviewed articles, CDC/WHO reports — free)

GRADING BREAKDOWN
Community Project (team, due Week 13)       30%
Policy Memorandum (individual, due Week 11) 20%
Exams (2 exams)                             30%
Weekly Reflections (11 total, drop 2)       20%
TOTAL                                      100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM SCHEDULE
Exam 1 (Week 7, Thursday): Covers Modules 1–3 (public health functions, epidemiology, social determinants)
Exam 2 (Week 14, Thursday): Covers Modules 4–6 (behavior theory, environmental health, policy) plus integration of all modules
All exams: 75 minutes, 40 multiple-choice + 2 short-answer questions requiring application of concepts.

COMMUNITY PROJECT (30%)
Teams of 3–4 students partner with an assigned community organization (Lexington-Fayette County Health Department, United Way of the Bluegrass, or other approved partners — assigned in Week 2). The project involves: a community health needs assessment for the partner's target population, application of epidemiological data and social determinants framework, and a health promotion recommendation. Deliverables: written report (15–20 pages) due end of Week 13 and a 15-minute team presentation to the partner organization in Week 13. Teams meet with their community partner at least twice (Weeks 4 and 9 minimum).

Community Partner Requirement: Students must engage substantively with their assigned partner — attending at least 2 partner meetings, collecting data or information from the community context (not just library research), and aligning recommendations with the partner organization's capacity and resources. Students who do not engage with the community partner receive a maximum score of 70% on the community project.

POLICY MEMORANDUM (20%)
Individual 4–6 page memo analyzing a current public health policy issue (topic approved by instructor, due Week 8). Format: problem statement, background evidence (epidemiological data), analysis of at least two policy options, recommendation with justification, and implications for health equity. APA citations required. Due end of Week 11 (Sunday 11:59 PM on Canvas). Topic approval due Week 7.

WEEKLY REFLECTIONS (20%)
Each week (Weeks 2–12), students submit a 250–350 word reflection connecting that week's course content to a current event or their community project experience. Due by 11:59 PM Sunday each week. Lowest 2 scores dropped. Reflections are graded on depth of connection to course concepts, engagement with evidence, and originality — not summarization.

WEEKLY SCHEDULE
Week 1  — Introduction: What is public health? History, core functions, public health vs. healthcare
Week 2  — Core Functions and Essential Services: The 10 Essential Public Health Services framework
Week 3  — Epidemiology I: Measures of frequency — incidence, prevalence, mortality rates
Week 4  — Epidemiology II: Outbreak investigation; case-control and cohort studies; causal inference
Week 5  — Social Determinants of Health: Income, education, housing, race, structural factors
Week 6  — Health Disparities: Measuring disparities; historical context; structural racism in health
Week 7  — EXAM 1 + Health Behavior Theory I: Health Belief Model, Theory of Planned Behavior
Week 8  — Health Behavior Theory II: Social Cognitive Theory, ecological model, motivational interviewing
Week 9  — Environmental Health I: Air quality, water safety, food safety — risk assessment
Week 10 — Environmental Health II: Climate change and health; environmental justice
Week 11 — Health Policy I: The policy cycle; how bills become law; policy analysis frameworks (Policy Memo due)
Week 12 — Health Policy II: Advocacy and community organizing; stakeholder analysis
Week 13 — Community Project Presentations (Thursday); reports due Sunday
Week 14 — EXAM 2 + Course synthesis: the future of public health
Week 15 — Student-led discussions; career paths in public health

LATE POLICY
Written assignments: –10 points per day. Exam: no make-up without documented emergency submitted within 24 hours. Community project report: –5% per day (affects whole team). Reflections: not accepted after the following Monday.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: What Is Public Health?',
        materialType: 'lecture',
        content: `MODULE 1: WHAT IS PUBLIC HEALTH?
Core Functions, 10 Essential Services, and Health vs. Healthcare

DEFINING PUBLIC HEALTH
Public health is the science and art of preventing disease, prolonging life, and promoting health through organized efforts of society. The focus is populations — not individual patients — and the primary tools are surveillance, policy, and community-level intervention rather than clinical treatment. The famous quote from C.-E.A. Winslow (1920): public health is "the science and art of preventing disease, prolonging life, and promoting physical health and efficiency through organized community efforts."

KEY DISTINCTION: HEALTHCARE vs. PUBLIC HEALTH
Healthcare treats disease in individuals who are already sick. Public health prevents disease from occurring and creates the conditions for health across populations. Consider:
- A cardiologist treating a heart attack patient: healthcare.
- A public health program reducing trans fats in the food supply to prevent heart disease across the entire population: public health.
Both are essential; they are complementary, not competing. But historically, the U.S. invests approximately 3% of health spending on public health prevention and 97% on healthcare treatment — despite evidence that social and environmental determinants of health account for 80–90% of health outcomes.

PUBLIC HEALTH HISTORY: LANDMARK ACHIEVEMENTS
The 10 Great Public Health Achievements of the 20th Century (CDC):
1. Vaccination (eliminated smallpox; dramatically reduced polio, measles)
2. Motor vehicle safety (seatbelts, drunk driving laws, road design — reduced fatality rates 90%)
3. Safer workplaces (occupational health regulations — reduced injury death rates 40%)
4. Control of infectious diseases (clean water, sanitation, antibiotics)
5. Decline in cardiovascular disease deaths (tobacco control, blood pressure treatment, lifestyle)
6. Safer and healthier foods (fortification, hygiene regulations, reduced foodborne illness)
7. Healthier mothers and babies (prenatal care, newborn screening)
8. Family planning (contraception, reproductive health services)
9. Fluoridation of drinking water (reduced tooth decay 68%)
10. Recognition of tobacco as a health hazard (anti-smoking campaigns, policy — saved 800,000+ lives)

These achievements were not primarily medical — they were legal, environmental, behavioral, and social interventions.

THREE CORE FUNCTIONS OF PUBLIC HEALTH (IOM, 1988)
1. Assessment: Systematically collecting, analyzing, and sharing information about the health conditions, risks, and assets of a population. Includes: disease surveillance, vital statistics, community health needs assessments, epidemiological investigations.
2. Policy Development: Using scientific knowledge to develop policies and plans that support individual and community health efforts. Includes: laws, regulations, ordinances, strategic plans.
3. Assurance: Ensuring that all people have access to necessary and cost-effective public health services. Includes: enforcement of laws, linking people to services, evaluating effectiveness.

THE 10 ESSENTIAL SERVICES OF PUBLIC HEALTH
The 10 Essential Services (updated 2020) operationalize the three core functions:

Assessment:
1. Monitor health status to identify and solve community health problems
2. Diagnose and investigate health problems and health hazards in the community

Policy Development:
3. Inform, educate, and empower people about health issues
4. Mobilize community partnerships and action to identify and solve health problems
5. Develop policies and plans that support individual and community health efforts

Assurance:
6. Enforce laws and regulations that protect health and ensure safety
7. Link people to needed personal health services and assure the provision of healthcare when otherwise unavailable
8. Assure competent public and personal healthcare workforce
9. Evaluate effectiveness, accessibility, and quality of personal and population-based health services

Foundation:
10. Research for new insights and innovative solutions to health problems (2020 addition: equity is embedded throughout all 10 services)

THE SOCIAL-ECOLOGICAL MODEL
Public health approaches health at multiple levels: individual (biology, behavior), interpersonal (family, social networks), organizational (schools, worksites), community (social norms, physical environment), and policy (laws, regulations). Effective public health intervenes at multiple levels simultaneously rather than focusing exclusively on individual behavior change.

DISCUSSION QUESTIONS
1. A pediatrician sees 20 children with asthma in a single week — all from the same neighborhood near an industrial facility. What would a public health response look like, versus what a healthcare response looks like?
2. The U.S. spends far more per capita on healthcare than other high-income countries but has worse health outcomes on most measures. How does the public health framework help explain this paradox?
3. Fluoridation of water (Essential Service 6) has been controversial — some argue it's "mass medication" without individual consent. How would a public health ethicist respond to this argument?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Epidemiology Basics',
        materialType: 'lecture',
        content: `MODULE 2: EPIDEMIOLOGY BASICS
Incidence, Prevalence, Rates, and Outbreak Investigation

WHAT IS EPIDEMIOLOGY?
Epidemiology is the study of the distribution and determinants of disease in populations, and the application of this study to control health problems. The "distribution" component asks who is getting sick, where, and when (descriptive epidemiology). The "determinants" component asks why — what causes disease (analytical epidemiology). Both are essential for effective public health action.

John Snow and the Broad Street Pump: The foundational case study of epidemiology. In 1854 London during a cholera epidemic, Snow mapped cholera cases by home address, identified a cluster around the Broad Street water pump, interviewed residents, and removed the pump handle — ending the local outbreak. Snow identified the waterborne transmission route of cholera decades before germ theory was established and before the cholera bacterium was identified. Lesson: epidemiological evidence can drive effective action even without complete mechanistic understanding.

MEASURES OF DISEASE FREQUENCY

Incidence vs. Prevalence — The Key Distinction:
Incidence measures NEW cases of a disease occurring in a population during a specific time period. It reflects the risk of developing the disease.
  Incidence Rate = (New cases in time period) / (Population at risk at start of period) × 1,000 (or 10,000, or 100,000)

Prevalence measures ALL existing cases (new and old) in a population at a point in time or over a period of time. It reflects the burden of disease.
  Period Prevalence = (All cases existing during a time period) / (Population during that period) × 100%
  Point Prevalence = (Cases existing on a specific date) / (Total population on that date) × 100%

The Bathtub Analogy: Think of disease cases as water in a bathtub. Incidence is the faucet (new cases flowing in). Prevalence is the water level (all existing cases). The drain is recovery or death. Prevalence = Incidence × Duration. A disease with high incidence but short duration (influenza) may have lower prevalence than a disease with lower incidence but long duration (HIV before effective treatment).

Practical Example:
- In Fayette County (population 300,000), 150 new cases of diabetes were diagnosed last year.
  Incidence rate = 150/300,000 × 1,000 = 0.5 per 1,000 per year
- At the end of the year, 12,000 people in Fayette County are living with diabetes.
  Prevalence = 12,000/300,000 × 100% = 4%
A policymaker planning for healthcare services needs prevalence; a researcher studying risk factors needs incidence.

OTHER IMPORTANT MEASURES
Mortality Rate: Deaths from a cause / Population at risk × 100,000. Overall vs. cause-specific vs. age-specific.
Case Fatality Rate (CFR): Deaths from a disease / Cases of that disease × 100%. Measures how deadly a disease is among those who get it. COVID-19 CFR varied enormously by age, vaccination status, and healthcare access.
Attack Rate: Cases / Persons at risk × 100%. Used in outbreak investigations — how many people exposed to a source developed disease.

OUTBREAK INVESTIGATION — THE 10-STEP PROCESS (CDC)
An outbreak is a greater-than-expected occurrence of disease in a defined place and time. Outbreak investigation:
1. Prepare for fieldwork (safety, logistics, IRB if needed)
2. Establish the existence of an outbreak (compare to baseline rates)
3. Verify the diagnosis (confirm cases with lab testing)
4. Define and identify cases (case definition — who counts as a case?)
5. Describe data by person, place, and time (create an epidemic curve)
6. Develop hypotheses (what source and transmission route?)
7. Evaluate hypotheses with analytical studies (case-control: compare cases to non-cases)
8. Refine hypotheses and implement additional studies if needed
9. Implement control and prevention measures
10. Communicate findings

Epidemic Curve: A histogram of cases by time of onset. The shape indicates transmission:
- Point source (single exposure, e.g., food at a common event): sharp rise, single peak, rapid decline
- Person-to-person (propagated): multiple peaks, each separated by the incubation period
- Continuous source: gradual rise, plateau while exposure continues

STUDY DESIGNS IN EPIDEMIOLOGY
Cross-sectional: Measures exposure and disease at the same time — good for prevalence; cannot establish temporal relationship.
Case-Control: Compares people with disease (cases) to people without disease (controls) on prior exposure. Efficient for rare diseases; retrospective; measures Odds Ratio.
Cohort: Follows exposed and unexposed groups forward in time to observe who develops disease. Measures Relative Risk (incidence rate ratio). Best for establishing causality; expensive and time-consuming.
Randomized Controlled Trial: Random assignment to intervention or control; gold standard for causality; often not feasible for public health questions.

DISCUSSION QUESTIONS
1. HIV prevalence in a city increases over 5 years while HIV incidence decreases. Is this good news or bad news? Explain using the bathtub model.
2. In an outbreak of foodborne illness at a catered event, 80 of 200 attendees become ill. The attack rate for those who ate the shrimp is 70%; for those who did not eat shrimp, 20%. What do these numbers suggest?
3. Why is a randomized controlled trial often not feasible for testing whether air pollution causes childhood asthma? What alternative study design would you use?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Social Determinants of Health',
        materialType: 'lecture',
        content: `MODULE 3: SOCIAL DETERMINANTS OF HEALTH
Income, Education, Housing, and Structural Racism

WHAT ARE SOCIAL DETERMINANTS?
The World Health Organization defines social determinants of health as "the conditions in which people are born, grow, live, work, and age." These social, economic, and environmental conditions are the primary drivers of health disparities — differences in health outcomes across groups. Extensive evidence shows that social factors account for between 30–55% of health outcomes; healthcare accounts for only about 10–20% of population health outcomes.

The social determinants include: income and wealth, education, employment and working conditions, housing and neighborhood characteristics, food access, transportation, social support networks, exposure to discrimination and violence, and access to health services.

INCOME AND HEALTH
The income-health gradient is one of the most robust findings in public health: higher income is associated with better health outcomes across every measure and at every level of income. This is not simply about being able to afford healthcare — it operates through multiple pathways:
- Material: Ability to afford food, safe housing, healthcare.
- Psychosocial: Chronic stress from financial insecurity elevates cortisol, impairing immune function, cardiovascular health, and mental health.
- Behavioral: Poverty constrains healthy behavior choices (safe places to exercise, time to prepare healthy food, reduced access to tobacco cessation programs).

Relative inequality, not just absolute poverty, matters for health. Countries with greater income inequality (higher Gini coefficients) have worse average health outcomes than more equal countries with comparable overall wealth — suggesting that inequality itself creates psychosocial harms.

EDUCATION AND HEALTH
Education is the most powerful single predictor of health across the lifespan. Better-educated people live longer, have lower rates of nearly every chronic disease, are more likely to adopt healthy behaviors, and are better able to navigate healthcare systems. Mechanisms include: higher earning potential (income pathway), greater health literacy (ability to understand and act on health information), and greater sense of control and efficacy.

HOUSING AND NEIGHBORHOOD
Safe, stable, affordable housing is a health necessity. Housing-related health impacts:
- Substandard housing: Lead paint (cognitive impairment in children), mold (respiratory disease), overcrowding (infectious disease spread), pest infestation (asthma triggers).
- Unstable housing/homelessness: High rates of mental illness, substance use disorder, infectious disease, trauma exposure.
- Neighborhood effects: Access to healthy food (food deserts), walkable infrastructure, safe parks, environmental pollution exposure, neighborhood violence — all concentrated in low-income, minority neighborhoods.
Residential segregation in U.S. cities historically concentrated poverty and environmental hazards in communities of color through discriminatory policies (redlining, restrictive covenants, discriminatory lending) — creating health inequities that persist today.

STRUCTURAL RACISM AS A SOCIAL DETERMINANT
Structural racism refers to the cumulative and compounding effects of policies, practices, cultural representations, and norms that work in various ways to perpetuate racial group inequity. It is not primarily about individual bias — it operates through institutions, policies, and systems.

Evidence of structural racism as a health determinant:
- Black Americans die of cardiovascular disease, diabetes, COVID-19, and maternal mortality at dramatically higher rates than White Americans — differences explained by structural factors (residential segregation, wealth gap, discrimination in healthcare settings, environmental exposure) not genetic factors.
- Provider implicit bias studies: In experimental studies, physicians recommend less aggressive treatment, prescribe less pain medication, and are less likely to refer for specialty care for Black patients compared to identical White patients.
- The SDOH (social determinants of health) cannot be fully addressed without addressing structural racism.

PLACE-BASED HEALTH DISPARITIES: KENTUCKY
Kentucky illustrates dramatic place-based health disparities. Eastern Kentucky counties rank among the worst in the nation for cancer mortality, cardiovascular disease, diabetes, and life expectancy — driven by decades of economic disinvestment, environmental extraction (coal), high rates of poverty, and limited healthcare access. This is not a lifestyle choice issue — these disparities have structural and historical roots that require structural solutions.

DISCUSSION QUESTIONS
1. A public health official proposes addressing obesity by funding a media campaign encouraging individuals to eat better and exercise more. Based on the social determinants framework, what are the limitations of this approach? What additional interventions would address root causes?
2. How does understanding structural racism change what public health interventions are needed to reduce health disparities? Give a specific example.
3. If someone's ZIP code predicts their health outcomes more strongly than their genetic code, what does this tell us about where health is "made"? What policy implications follow?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Health Behavior Theory',
        materialType: 'lecture',
        content: `MODULE 4: HEALTH BEHAVIOR THEORY
Health Belief Model, Social Cognitive Theory, and the Ecological Model

WHY THEORY MATTERS IN PUBLIC HEALTH PRACTICE
Health behavior theory provides a systematic framework for understanding why people behave as they do regarding their health, and therefore what levers can be used to promote healthier behavior. Without theory, health promotion is guesswork. With theory, interventions can be targeted at the specific beliefs, skills, or environmental factors that drive — or block — healthy behavior in a specific population. Theory also allows evaluation: if a theoretically-based intervention fails, you know which component of the theory was wrong.

THE HEALTH BELIEF MODEL (HBM)
The Health Belief Model (Rosenstock, 1966; Becker, 1974) is the oldest and most widely used health behavior theory. It proposes that people will adopt a health behavior if:
1. Perceived Susceptibility: They believe they are vulnerable to the health threat. ("I am at risk for Type 2 diabetes.")
2. Perceived Severity: They believe the health threat has serious consequences. ("Diabetes causes blindness, amputation, and early death.")
3. Perceived Benefits: They believe the recommended action will reduce the threat. ("Losing 10 lbs will significantly reduce my diabetes risk.")
4. Perceived Barriers: They believe the costs (time, money, discomfort, social pressure) of taking action are manageable. Barriers are the most powerful predictor of behavior — identifying and addressing barriers is critical.
5. Cues to Action: A trigger — internal (a symptom) or external (a friend's diagnosis, an advertisement) — that motivates action.
6. Self-Efficacy (added later): Confidence that one can successfully perform the recommended behavior.

Intervention Application: Cervical cancer vaccine (HPV) uptake. HBM suggests: increase perceived susceptibility (parents who don't vaccinate don't believe their child is at risk), increase perceived severity (HPV causes multiple cancers, not just cervical), reduce perceived barriers (address concerns about side effects and misinformation), increase self-efficacy (make the vaccination process simple and accessible), provide cues to action (provider recommendation — the single most effective cue).

Limitations: HBM is cognitively focused — it assumes people make rational, information-based decisions. It underemphasizes the role of habits, social norms, environment, and unconscious decision-making. It is better for explaining behavior than for predicting behavior.

SOCIAL COGNITIVE THEORY (SCT)
Albert Bandura's Social Cognitive Theory emphasizes the continuous interaction among behavior, personal factors (cognitions, emotions), and the environment (reciprocal determinism). Key concepts:
- Self-Efficacy: The most important concept in SCT — confidence in one's ability to perform a specific behavior in a specific context. Self-efficacy is domain-specific: you can have high self-efficacy for jogging but low self-efficacy for preparing healthy meals.
  Sources of self-efficacy: Mastery experience (actually succeeding), vicarious learning (seeing someone similar to you succeed), verbal persuasion (being told you can do it), physiological state (managing anxiety about the behavior).
- Outcome Expectations: Beliefs about the consequences of a behavior. People must believe the behavior will produce a valued outcome AND that they are capable of performing it.
- Observational Learning (Modeling): People learn health behaviors (both healthy and unhealthy) by observing others. Role models who demonstrate the behavior and its positive consequences are powerful.
- Behavioral Capability: Having the knowledge and skills to perform the behavior.

Intervention Application: Physical activity programs for older adults. SCT suggests: build self-efficacy through gradual, achievable goals (mastery experience); use peer models of similar age performing the activities; address outcome expectations (activity reduces fall risk and improves mood); teach specific skills (proper walking shoes, safe exercise progression).

THE ECOLOGICAL MODEL (McLeroy, 1988)
The ecological model recognizes that health behavior is shaped at multiple levels simultaneously: intrapersonal (individual beliefs, skills, biology), interpersonal (family, peers, social networks), organizational (school, worksite, healthcare organization), community (neighborhood, media, social norms), and public policy (laws, regulations, resource allocation).

Why the ecological model matters: Interventions targeting only one level are less effective than multi-level interventions. Example: School-based obesity prevention. An intrapersonal approach (nutrition education) alone produces modest effects. Adding interpersonal (family involvement) + organizational (school lunch menu changes) + community (after-school activity programs) + policy (physical education requirements) dramatically improves outcomes.

The ecological model also explains why blaming individuals for unhealthy behavior is often unfair: when environmental and policy factors make healthy choices difficult or impossible, individual-level interventions will fail. Telling a resident of a food desert to "eat more vegetables" without addressing food access is an ecological model failure.

DISCUSSION QUESTIONS
1. A worksite wellness program offers financial incentives for employees to complete a health risk assessment but participation remains at 20%. Using HBM, identify three barriers that might explain low participation and propose how to address each.
2. A public health researcher wants to increase HPV vaccination rates among rural adolescents. How would she apply Social Cognitive Theory to design an intervention? Identify three specific SCT concepts she would address.
3. A city wants to reduce pedestrian traffic deaths. List one intervention at each level of the ecological model. Which single level do you think is most important, and why?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Environmental Health',
        materialType: 'lecture',
        content: `MODULE 5: ENVIRONMENTAL HEALTH
Air Quality, Water Safety, Food Safety, and Climate Change

WHAT IS ENVIRONMENTAL HEALTH?
Environmental health focuses on the interactions between the environment and human health — how exposures to physical, chemical, biological, and social environmental factors influence health outcomes. The WHO estimates that 23% of global deaths are attributable to preventable environmental causes. In the U.S., air pollution alone causes approximately 100,000 premature deaths per year.

AIR QUALITY AND HEALTH
Outdoor Air Pollution: The Clean Air Act (1970) established national ambient air quality standards (NAAQS) for six "criteria pollutants": particulate matter (PM), ozone (ground-level), carbon monoxide, nitrogen dioxide, sulfur dioxide, and lead. Sources: vehicle emissions, power plants, industrial facilities, wildfires.

Particulate Matter (PM): Most important for health. PM2.5 (fine particles ≤2.5 micrometers) are the most dangerous — they penetrate deep into the lungs and enter the bloodstream. Causes: cardiovascular disease, respiratory disease, lung cancer, premature death. PM2.5 exposure has no safe threshold.

Ozone: Formed by photochemical reactions between NOx and VOCs in sunlight. Causes bronchospasm, asthma exacerbation, reduced lung function. Ground-level ozone is not the same as protective stratospheric ozone (ozone layer).

Air Quality Index (AQI): The EPA's daily color-coded index (0–500) communicating health risk from air pollution. Action levels trigger advisories for sensitive groups (children, elderly, people with respiratory/cardiovascular disease).

Indoor Air Quality: Americans spend ~90% of time indoors, and indoor air can be 2–5× more polluted than outdoor air. Key indoor pollutants: radon (second leading cause of lung cancer — odorless, colorless, accumulates in basements from soil uranium decay), secondhand smoke, volatile organic compounds (VOCs from paints, cleaning products, furniture), mold (asthma, hypersensitivity), and carbon monoxide.

WATER SAFETY
The Safe Drinking Water Act (1974) established standards for public water systems. The EPA regulates over 90 contaminants. Key water safety concepts:

Water Treatment Process: Source water → Coagulation/Flocculation (chemicals added to clump particles) → Sedimentation (particles settle) → Filtration (removes remaining particles) → Disinfection (chlorine kills pathogens) → Distribution.

The Flint, Michigan Lead Crisis: In 2014, Flint switched water sources without proper corrosion control. Lead pipes leached lead into drinking water. Children with blood lead levels ≥5 µg/dL increased from 2.4% to 4.9%. Lead causes irreversible neurodevelopmental harm — there is no safe blood lead level in children. The Flint crisis was both a public health failure and an environmental justice failure — it occurred in a majority-Black, low-income city and was ignored by state officials for months.

Waterborne Disease: Contamination of water with pathogens (bacteria, viruses, protozoa — Cryptosporidium, Giardia) causes gastrointestinal illness. Greatest risk in systems with inadequate treatment or aging infrastructure.

FOOD SAFETY
The food system is the most common source of infectious disease outbreaks. Each year in the U.S.: ~48 million cases of foodborne illness, 128,000 hospitalizations, 3,000 deaths. Major pathogens: Salmonella (poultry, eggs), Listeria (deli meats, soft cheeses, produce), E. coli O157:H7 (ground beef, raw produce), Norovirus (most common cause of all outbreaks).

HACCP (Hazard Analysis Critical Control Points): The science-based framework for identifying and controlling food safety hazards at critical points in food production, processing, and distribution. Mandatory for meat, poultry, and seafood processing; adopted voluntarily by many food manufacturers.

CLIMATE CHANGE AND HEALTH
Climate change is the greatest long-term threat to global public health. Health impacts:
- Direct: Heat-related illness and death (increasing extreme heat events). Flooding (drowning, injury, disease). Hurricane intensity.
- Indirect: Extended allergy and infectious disease seasons (Lyme disease, West Nile Virus, dengue fever expanding geographic range). Air quality worsening (wildfires increase PM2.5; higher temperatures increase ground-level ozone). Drought (food and water security).
- Mental health: Eco-anxiety, post-disaster PTSD, community disruption.

Health Equity and Climate: Low-income communities and communities of color bear disproportionate climate health burdens — they live in more heat-exposed neighborhoods (less green space, more pavement — urban heat island effect), have less air conditioning, work outdoor jobs, and have less capacity to adapt or relocate.

DISCUSSION QUESTIONS
1. A school district is considering eliminating its radon testing program to save money. Using what you know about radon, make the public health argument for maintaining the program.
2. What environmental justice principles were violated in the Flint water crisis? What should a public health system do differently when there are early warning signs of a water safety problem in a low-income community?
3. A local health department wants to address heat-related deaths in its city. List three interventions at different levels of the ecological model (individual, community, policy).`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Health Policy and Advocacy',
        materialType: 'lecture',
        content: `MODULE 6: HEALTH POLICY AND ADVOCACY
Policy Analysis Framework, How Bills Become Law, and Advocacy Tools

WHAT IS HEALTH POLICY?
Health policy encompasses decisions, plans, and actions undertaken to achieve specific health goals in a society. Health policy includes: laws and regulations, budget decisions (what gets funded), institutional protocols, and cultural norms. Policy is public health's most powerful tool — a single policy (seatbelt laws, tobacco taxes, water fluoridation) can improve the health of millions of people simultaneously without requiring individual behavior change.

THE POLICY PROCESS
The policy cycle is not a neat linear sequence — it is iterative, messy, and politically contested. Frameworks:

Stage Model:
1. Agenda Setting: A problem must be recognized as warranting government action. Problems compete for attention — policy windows open when problems align with political momentum and available solutions (Kingdon's Streams Framework: problem stream, policy stream, politics stream).
2. Policy Formulation: Designing specific policy options. Technical analysis, stakeholder input, negotiation, compromise.
3. Policy Adoption: The formal decision process — legislative action, executive orders, regulatory rulemaking.
4. Policy Implementation: Translating policy into action — agencies write regulations, allocate resources, train personnel. Implementation gaps are common.
5. Policy Evaluation: Does the policy achieve its goals? What are unintended consequences? Evidence feeds back into agenda setting.

HOW FEDERAL LEGISLATION IS PASSED
The U.S. legislative process:
1. Introduction: A bill is introduced in the House or Senate by a sponsor. Any member can introduce a bill.
2. Committee Referral: The bill is referred to the relevant committee (e.g., Senate HELP Committee for health legislation; House Energy and Commerce Committee).
3. Committee Action: The committee holds hearings, marks up (amends) the bill, and votes on whether to advance it. Most bills die in committee.
4. Floor Debate and Vote: If advanced, the bill is debated and voted on by the full chamber. Simple majority required in most cases.
5. Conference Committee: If the House and Senate pass different versions, a conference committee reconciles them into a single bill.
6. Presidential Action: The President signs (enacts into law) or vetoes. Congress can override a veto with 2/3 majority in both chambers.
7. Rulemaking: Agencies write detailed regulations implementing the law. Notice and comment rulemaking allows public input.

POLICY ANALYSIS FRAMEWORK
Analyzing a policy option requires examining:
- Problem Definition: What problem does this policy address? Whose problem is it?
- Goals and Objectives: What outcomes should the policy achieve? Are they measurable?
- Options: What are the feasible alternatives (including doing nothing)?
- Criteria: What values or metrics matter — effectiveness, equity, cost-effectiveness, political feasibility, rights-protection?
- Evaluation: For each option, how does it perform on each criterion?
- Recommendation: Which option best balances the criteria given the context?

THE POLICY MEMO FORMAT
A policy memo is the primary written format for communicating policy analysis to decision-makers who are time-constrained. Structure:
- Memo header (To, From, Date, Subject)
- Executive Summary (2–3 sentences: problem, recommendation)
- Problem Statement (what is the problem, who is affected, why act now)
- Background/Evidence (relevant epidemiological data, prior policy attempts)
- Policy Options (2–3 specific options, brief analysis of each)
- Recommendation (which option, with clear justification)
- Implementation Considerations (key stakeholders, barriers, equity implications)

PUBLIC HEALTH ADVOCACY
Public health professionals have an ethical obligation to advocate for policies that protect health — not merely to do science and wait for policymakers to find it. Advocacy tools:
- Coalition building: Public health issues rarely get policy traction without diverse coalitions — clinical providers, community organizations, business groups, faith communities.
- Data-based messaging: Quantify the problem with local data; connect to values the target audience holds. "In Fayette County, X children are exposed to lead paint."
- Legislative visits and testimony: Meeting with legislators (or their staff) and providing expert testimony at hearings.
- Community organizing: Building grassroots power to demand policy change; amplifying community voices in policy processes.
- Media advocacy: Earning news coverage to shape the political environment; op-eds, social media campaigns, press conferences.

DISCUSSION QUESTIONS
1. A public health researcher produces rigorous evidence that a state's permissive gun laws increase firearm injury rates. Why might this evidence fail to change policy? What else is needed?
2. What is the difference between lobbying (generally restricted for public health employees in government agencies) and advocacy (generally permissible)? Why does the distinction matter?
3. The Affordable Care Act took decades of advocacy to pass and has survived multiple repeal attempts. Using the policy cycle, identify the key moments when different actors influenced the process.`,
      },
      {
        moduleNumber: 8,
        title: 'Policy Memo Rubric',
        materialType: 'rubric',
        content: `PHE 201 POLICY MEMORANDUM RUBRIC
Assignment: Policy Memorandum (20% of course grade)
Total Points: 100 points
Length: 4–6 pages (not including references)
Format: Standard policy memo format (To/From/Date/Subject header; APA citations)
Due: End of Week 11 (Sunday 11:59 PM on Canvas)
Topic approval required by end of Week 7.

GRADING CRITERIA

1. PROBLEM STATEMENT AND SIGNIFICANCE (20 points)
- 18–20 pts: Problem is precisely defined with epidemiological data quantifying magnitude (incidence, prevalence, mortality, or burden); affected populations identified with specificity; clear explanation of why this problem warrants policy action now; relevant health equity dimensions addressed.
- 14–17 pts: Problem clearly stated; data present but not fully contextualized; equity dimension mentioned but not developed.
- 10–13 pts: Problem described but vaguely; limited data; significance asserted rather than demonstrated.
- 0–9 pts: Problem undefined; no supporting data; unclear why policy action is warranted.

2. EVIDENCE BASE (20 points)
- 18–20 pts: Uses peer-reviewed evidence and authoritative public health data sources (CDC, WHO, state health departments) to support problem description and policy options; evidence is current (within 5 years); properly cited in APA format; distinguishes between evidence quality (RCT vs. observational evidence vs. expert consensus).
- 14–17 pts: Evidence present and mostly peer-reviewed; minor citation errors; some sources outdated.
- 10–13 pts: Evidence present but relies heavily on non-peer-reviewed sources; citation errors.
- 0–9 pts: Little or no evidence; relies on opinion or news articles only; uncited claims.

3. POLICY OPTIONS ANALYSIS (25 points)
- 22–25 pts: Presents at least two distinct, specific policy options (not "do nothing vs. the ideal"); each option analyzed on at least three criteria (effectiveness, equity, cost-effectiveness, political feasibility, rights implications); analysis is balanced and evidence-based; options are genuinely distinct (not minor variations of each other).
- 17–21 pts: Two options present; analysis covers most criteria; one option underdeveloped.
- 12–16 pts: Options present but vaguely described; analysis superficial; criteria not explicitly stated.
- 0–11 pts: Fewer than two options; no comparative analysis; options indistinguishable.

4. RECOMMENDATION AND JUSTIFICATION (20 points)
- 18–20 pts: Clear, specific recommendation (which option, with what specific provisions); justification directly references the option analysis; acknowledges trade-offs; addresses health equity implications of the recommendation; includes a key implementation consideration.
- 14–17 pts: Recommendation clear; justification present but thin; equity mentioned.
- 10–13 pts: Recommendation present but vague ("policymakers should do more"); justification does not clearly follow from analysis.
- 0–9 pts: No recommendation; or recommendation contradicts the preceding analysis.

5. WRITING QUALITY AND MEMO FORMAT (15 points)
- 13–15 pts: Correct memo header format; executive summary in opening paragraph; clear headings; accessible writing for a non-specialist policy audience; no jargon without explanation; APA citations complete and accurate; within page limit.
- 10–12 pts: Mostly correct format; writing generally clear; minor APA errors.
- 7–9 pts: Format problems; writing too technical or too informal; multiple APA errors.
- 0–6 pts: Memo format not followed; writing impedes comprehension; citations absent.

PENALTIES
- Late submission: –10 points per day
- No topic approval obtained: –10 points
- Under 3 pages: –10 points`,
      }
    ]
  },


  // ────────────────────────────────────────────────
  // SW-200-STARTER — Introduction to Social Work
  // College of Social Work
  // ────────────────────────────────────────────────
  {
    courseCode: 'SW-200-STARTER',
    title: 'Introduction to Social Work',
    description: 'Introduces the social work profession, its history, values, and practice methods across micro, mezzo, and macro levels. Students examine the NASW Code of Ethics, generalist practice, systems theory, anti-oppressive practice, and field practicum expectations through two required field agency visits.',
    college: 'College of Social Work',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `SW 200 — Introduction to Social Work
College of Social Work, University of Kentucky
Spring 2026 | MWF 12:00–12:50 PM | College of Social Work Building 110

INSTRUCTOR
Dr. Katie Thompson, College of Social Work
Office: College of Social Work 225
Office Hours: Monday & Wednesday 1:00–2:30 PM; Friday 1:00–2:00 PM; Tuesday by Zoom
Zoom: https://uky.zoom.us/j/placeholder
Email: katie.thompson@uky.edu

COURSE DESCRIPTION
SW 200 introduces students to the social work profession, its historical development, core values, ethical principles, and generalist practice model. Students examine theoretical frameworks — systems theory, strengths perspective, anti-oppressive practice — and explore social work practice at micro (individual), mezzo (group/community), and macro (policy/organization) levels. Two required field agency visits provide grounded exposure to professional practice. Prerequisites: SOC 101 or PSY 100, or instructor permission.

REQUIRED MATERIALS
- Kirst-Ashman, K. K. & Hull, G. H. (2024). Understanding Generalist Practice (9th ed.). Cengage. ISBN: 978-0357765968
- NASW Code of Ethics (current, 2021 revision) — free download at socialworkers.org
- Professional writing style guide on Canvas (APA 7th edition required for all papers)

GRADING BREAKDOWN
Field Journal (ongoing, due Weeks 6, 10, 14)   25%
Case Study Paper (due Week 12)                  30%
Exams (2 exams)                                 25%
Class Participation                             20%
TOTAL                                          100%

Grade Scale: A = 90–100, B = 80–89, C = 70–79, D = 60–69, E = below 60

EXAM SCHEDULE
Exam 1 (Week 6, Friday): Covers Modules 1–2 (profession history, NASW Code of Ethics)
Exam 2 (Week 13, Friday): Covers Modules 3–6 (systems theory, diversity, practice methods, field practicum)
Both exams: 60 minutes, 40 multiple-choice + 2 short-answer questions.

FIELD AGENCY VISITS (REQUIRED — 2 VISITS)
Students must complete two field agency visits during the semester. Agencies are assigned by the field education coordinator in Week 1; students do NOT arrange their own visits. Transportation is the student's responsibility.

Field Visit 1 (Week 5 or 6, scheduled during class time): Visit to a direct services agency (e.g., Family & Children's Place, UK Counseling Center, or similar). Students observe client intake processes, interview a social worker about their role and ethical decision-making, and submit a 1–2 page reflection (due within 1 week of the visit).

Field Visit 2 (Week 10 or 11, scheduled during class time): Visit to a community or macro-practice organization (e.g., KY Equal Justice Center, Community Action Council, or legislative office). Students observe macro-level social work practice and interview a practitioner about policy and systems change. Reflection 1–2 pages due within 1 week.

Students who miss a field visit without a documented excuse will receive a zero for that visit's reflection and are expected to make up the visit independently with faculty guidance (may not be possible for all sites).

FIELD JOURNAL (25%)
Students maintain a reflective field journal throughout the semester. Three journal submissions:
- Submission 1 (due end of Week 6): Weeks 1–6 reflection — 3–4 pages on your developing understanding of social work as a profession and your own social location (privilege, marginalization, identity). Include reflection on Field Visit 1.
- Submission 2 (due end of Week 10): Weeks 7–10 reflection — 3–4 pages on systems theory, diversity, and anti-oppressive practice applied to a social issue you care about.
- Submission 3 (due end of Week 14): Weeks 11–14 reflection — 3–4 pages on your Field Visit 2 experience and what you learned about macro social work. Integrate all course themes.

CASE STUDY PAPER (30%)
A 10–12 page paper analyzing a provided case study through multiple theoretical lenses and developing a generalist practice plan. Requires: comprehensive bio-psycho-social assessment, theoretical framework application (minimum 2 course theories), micro/mezzo/macro intervention plan, ethical analysis, and evaluation approach. Uses APA 7th edition format. Due end of Week 12. Topic/case assigned in Week 7. Late penalty: –10 points per day.

NASW CODE OF ETHICS ASSIGNMENT
Embedded in Case Study Paper — students must include a section explicitly analyzing at least two ethical principles from the NASW Code of Ethics as they relate to the case. This section is required for a passing case study grade.

PROFESSIONAL WRITING STANDARDS
Social work is a profession that communicates in writing — case records, court reports, policy briefs, grant applications. All written work in this course must meet professional standards: person-first language (not "schizophrenic," but "person living with schizophrenia"), no jargon without explanation, APA 7th edition citations, no first-person in formal papers except reflection journals, no casual or colloquial language.

WEEKLY SCHEDULE
Week 1  — Introduction: Social work as a profession; the "dual focus" (person + environment)
Week 2  — History of Social Work: Settlement house movement; NASW founding; welfare state history
Week 3  — NASW Code of Ethics I: Core values; ethical principles; the 6 values framework
Week 4  — NASW Code of Ethics II: Ethical dilemmas; decision-making frameworks
Week 5  — Systems Theory: Ecosystems perspective; person-in-environment; family systems
Week 6  — EXAM 1 + Diversity and Social Justice: Privilege, oppression, intersectionality
Week 7  — Anti-Oppressive Practice: Power, cultural humility, decolonizing social work
Week 8  — Generalist Practice Model: The planned change process; problem-solving phases
Week 9  — Micro Practice: Individual and family interventions; strengths perspective
Week 10 — Mezzo Practice: Group work; community organizing; coalition building
Week 11 — Macro Practice: Policy advocacy; organizational change; social action
Week 12 — Field Practicum Overview: What to expect; professional conduct; supervision (Case Study Paper due)
Week 13 — EXAM 2 + Field practicum Q&A
Week 14 — Integration: Bringing it all together; your social work identity
Week 15 — Career pathways in social work; graduate school; licensure`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Social Work as a Profession',
        materialType: 'lecture',
        content: `MODULE 1: SOCIAL WORK AS A PROFESSION
History, NASW, and the Generalist Practice Model

WHAT IS SOCIAL WORK?
Social work is a practice-based profession and an academic discipline that promotes social change and development, social cohesion, and the empowerment and liberation of people. The NASW (National Association of Social Workers) defines social work as the professional activity of helping individuals, families, groups, and communities enhance or restore their capacity for social functioning and creating social conditions favorable to that goal.

Social work has a dual focus: it works with individuals AND works to change the systems, policies, and structures that create and perpetuate the problems individuals face. A social worker helping a client navigate homelessness is also a social worker advocating for affordable housing policy. Both functions are essential; neither alone is sufficient.

HISTORICAL DEVELOPMENT
The social work profession emerged in the late 19th century in response to the social dislocations caused by industrialization, urbanization, and mass immigration. Two parallel traditions:

The Settlement House Movement: Reformers (Jane Addams, Lillian Wald, Florence Kelley) moved into poor urban neighborhoods to live alongside immigrant communities and understand their needs from the inside. Hull House (Chicago, 1889) is the most famous example. Settlement workers combined direct services with research and policy advocacy — lobbying for child labor laws, workers' compensation, public health regulations. Jane Addams won the Nobel Peace Prize in 1931. The settlement movement established social work's macro tradition.

The Charity Organization Society (COS): Scientific charity — the belief that poverty was a moral condition requiring individual transformation. "Friendly visitors" (middle-class volunteers) visited poor families to provide moral guidance. Mary Richmond (1861–1928) systematized COS methods into what became casework — the forerunner of modern clinical social work. Richmond's Social Diagnosis (1917) is often considered the first social work text. The COS established social work's micro tradition.

20th-Century Development: Social work became professionalized — formal educational requirements, licensing, the NASW (founded 1955), and the Council on Social Work Education (CSWE, the accreditor). Social workers played central roles in creating the New Deal programs (1930s), the Civil Rights Movement, and the Great Society welfare programs (1960s).

NATIONAL ASSOCIATION OF SOCIAL WORKERS (NASW)
NASW is the largest membership organization of professional social workers in the world (~120,000 members). Functions: advocates for the profession and for social policy, publishes the Social Work journal, sets ethical standards (Code of Ethics), lobbies at state and federal levels, and provides professional development.

Licensing: Social workers are licensed at the state level. In Kentucky:
- LBSW (Licensed Bachelor Social Worker): BSW degree
- LCSW (Licensed Certified Social Worker): MSW + 2 years supervised experience; can provide independent clinical practice
- LCSWA (Associate): MSW without supervised experience completed

Practicing clinical social work without a license is illegal. The LCSW is required for independent private practice and for third-party insurance billing.

THE GENERALIST PRACTICE MODEL
Generalist practice is the foundational model taught in BSW and first-year MSW programs. It prepares social workers to practice at any level (micro, mezzo, macro) and in any setting. Core assumptions:
1. Social workers must understand and intervene at multiple levels — the same practitioner who helps a client with substance use must also understand the community resources, systemic barriers, and policy context that shape that client's situation.
2. The Planned Change Process (a systematic problem-solving approach) guides all levels of practice.
3. Knowledge, values, and skills integrate equally — technical skill without values is dangerous; values without knowledge are insufficient.

The Planned Change Process:
- Engagement: Building a working relationship (rapport, trust, contracting)
- Assessment: Collecting and organizing information about the client system and their situation
- Planning: Identifying goals and developing an intervention plan (collaboratively with the client)
- Implementation: Carrying out the plan
- Evaluation: Assessing progress toward goals
- Termination: Planned ending of the professional relationship
- Follow-up: Monitoring outcomes after formal termination

DISCUSSION QUESTIONS
1. The settlement house movement and the Charity Organization Society had very different assumptions about the causes of poverty. How do these historical tensions show up in contemporary debates about social welfare policy?
2. Why does social work require licensure? What risks to the public would exist without professional regulation?
3. The generalist practice model requires social workers to be competent at multiple levels. What are the challenges of being both an individual counselor AND a policy advocate? Can one person do both effectively?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: The NASW Code of Ethics',
        materialType: 'lecture',
        content: `MODULE 2: THE NASW CODE OF ETHICS
Core Values, Ethical Principles, and Ethical Dilemmas

THE PURPOSE OF THE CODE OF ETHICS
The NASW Code of Ethics serves multiple purposes: it articulates the profession's core values and commitments, provides ethical standards to guide practice, establishes principles for resolving conflicts, and provides a basis for adjudicating grievances. The Code does not provide rules for every situation — ethical practice requires professional judgment, not just rule-following.

THE SIX CORE VALUES OF SOCIAL WORK
The NASW Code identifies six core values, each associated with an ethical principle:

1. SERVICE
Principle: Social workers' primary goal is to help people in need and address social problems.
Social workers elevate service above self-interest. Social workers draw on their knowledge, values, and skills to help people in need and to address social problems. Social workers are encouraged to contribute pro bono professional services to the extent possible.

2. SOCIAL JUSTICE
Principle: Social workers challenge social injustice.
Social workers pursue social change — particularly with and on behalf of vulnerable and oppressed individuals and groups. Social workers' social change efforts focus on poverty, unemployment, discrimination, and other forms of social injustice.

3. DIGNITY AND WORTH OF THE PERSON
Principle: Social workers respect the inherent dignity and worth of the person.
Social workers treat each person in a caring and respectful fashion, mindful of individual differences and cultural and ethnic diversity. Social workers promote clients' socially responsible self-determination and seek to enhance clients' capacity and opportunity to change and address their own needs.

4. IMPORTANCE OF HUMAN RELATIONSHIPS
Principle: Social workers recognize the central importance of human relationships.
Relationships among people are an important vehicle for change. Social workers seek to strengthen relationships among people in a purposeful effort to promote, restore, maintain, and enhance the well-being of individuals, families, social groups, organizations, and communities.

5. INTEGRITY
Principle: Social workers behave in a trustworthy manner.
Social workers are continuously aware of the profession's mission, values, ethical principles, and ethical standards. They act honestly and responsibly.

6. COMPETENCE
Principle: Social workers practice within their areas of competence and develop and enhance their professional expertise.
Social workers continually strive to increase professional knowledge and skills, applying them in practice. Social workers do not misrepresent their professional qualifications, education, or competence.

ETHICAL RESPONSIBILITIES IN PRACTICE
The Code establishes ethical responsibilities to clients, colleagues, practice settings, the profession, and society. Key provisions:
- Self-Determination (1.02): Social workers respect and promote the right of clients to self-determination and assist clients in their efforts to identify and clarify their goals. Limits: when clients' actions or potential actions pose a serious, foreseeable, and imminent risk to themselves or others.
- Informed Consent (1.03): Clients have the right to receive understandable information about services, limits of confidentiality, their right to refuse or withdraw consent.
- Confidentiality (1.07): Social workers must protect the confidentiality of client information. Exceptions: mandatory reporting of child/elder abuse, risk of harm to self or others, court orders.
- Dual Relationships (1.06c): Social workers do not engage in dual or multiple relationships with clients or former clients in which there is a risk of exploitation or potential harm to the client.
- Conflicts of Interest (1.06): Social workers should be alert to and avoid conflicts of interest.

ETHICAL DILEMMA DECISION-MAKING
An ethical dilemma exists when two or more ethical principles conflict and you cannot honor both simultaneously. Example: A client discloses she is using illicit drugs (confidentiality vs. potential harm). Another: A client's family demands information about the client's treatment (family's interests vs. client's self-determination and confidentiality).

Ethical decision-making frameworks:
1. Identify the ethical standards at stake (Code provisions)
2. Identify any relevant laws or regulations
3. Consult with supervisors and colleagues
4. Identify options and analyze likely consequences for each
5. Select the option that best honors the profession's values while minimizing harms
6. Document your reasoning — not just what you decided but why

Rank ordering values when they conflict: Life and safety > Legal obligations > Ethical principles > Agency policy > Personal preferences. This is a general guide, not an absolute rule.

DISCUSSION QUESTIONS
1. A teenager in a middle school social work program discloses to you that her father hits her with a belt regularly but says she doesn't want you to tell anyone because "it'll make things worse." What do you do? Identify the ethical conflict and your obligations.
2. The value of self-determination seems to conflict with paternalistic intervention when a client is making a harmful choice. How should social workers navigate this tension?
3. A social worker's friend needs services from the same agency where the social worker is employed. Can the social worker serve this friend as a client? Why or why not?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Systems Theory and the Ecosystems Perspective',
        materialType: 'lecture',
        content: `MODULE 3: SYSTEMS THEORY AND THE ECOSYSTEMS PERSPECTIVE
Person-in-Environment, Ecological Systems, and Strengths Perspective

THE PERSON-IN-ENVIRONMENT FRAMEWORK
Social work's defining theoretical orientation is person-in-environment (PIE) — the understanding that human behavior and experience can only be understood in the context of the social and physical environments in which people live. This distinguishes social work from psychology (which focuses primarily on the individual) and sociology (which focuses primarily on society). Social workers attend simultaneously to the person and their context.

SYSTEMS THEORY BASICS
Systems theory, derived from biology (von Bertalanffy, 1940s), provides a framework for understanding the interdependence of parts within a whole. Key concepts:
- System: A set of elements in mutual interaction. Families, organizations, communities, ecosystems are all systems.
- Boundaries: What separates the system from its environment. Open systems exchange information/energy with the environment; closed systems do not. Most social systems are open.
- Subsystems: Parts within a system (the sibling subsystem within a family; a department within an organization).
- Inputs, throughputs, outputs, feedback loops: Systems receive inputs (information, resources), process them (throughputs), produce outputs, and receive feedback that allows adjustment.
- Equifinality: Different paths can lead to the same outcome.
- Homeostasis: Systems tend toward stability and resist change. Homeostasis explains why families often return to dysfunctional patterns after intervention.
- Entropy: Without new inputs, systems deteriorate toward disorder.

ECOLOGICAL SYSTEMS THEORY (BRONFENBRENNER)
Urie Bronfenbrenner's ecological systems model provides a developmental framework for understanding the multiple environmental contexts influencing human development, widely adopted in social work:
- Microsystem: The immediate environments where direct interaction occurs — family, school, peer group, neighborhood.
- Mesosystem: The relationships among microsystems — the connection between home and school, or between peer group and family.
- Exosystem: Settings that affect the individual indirectly — parent's workplace (if a parent loses their job, the child is affected though the child doesn't work there).
- Macrosystem: Cultural values, laws, ideologies, economic systems — the overarching societal context.
- Chronosystem: Change over time — how events (divorce, moving, war) and historical periods affect development.

THE ECOSYSTEMS PERSPECTIVE IN SOCIAL WORK PRACTICE
The ecosystems perspective integrates systems theory and ecological concepts:
- Habitat and niche: Where people live and their social position within that habitat.
- Adaptation and coping: How people and environments mutually influence and change each other.
- Goodness of fit: The degree to which person and environment are matched — poor fit creates stress and problems; good fit supports growth.
- Life stressors: Challenging life conditions or events — poverty, discrimination, illness, family conflict — that tax coping resources.
- Transactions: The ongoing, reciprocal exchanges between people and environments.

Social workers assess the quality of transactions between clients and their environments, identify sources of stress and lack of resources, and intervene to improve fit — either by helping the person adapt (changing coping, building skills) or by changing environmental conditions (connecting to resources, advocating for policy change).

THE STRENGTHS PERSPECTIVE (Saleebey)
The strengths perspective is a foundational approach in social work that contrasts with deficit-based models. Rather than focusing on pathology, problems, and deficits, the strengths perspective starts from the assumption that every client has strengths, resources, and capacities — and that these become the foundation for intervention.
Key principles:
- Every individual, family, group, and community has strengths.
- Trauma and abuse do not eliminate capacity — they may coexist with remarkable resilience.
- Collaboration: The practitioner is not the expert on the client's life — the client is.
- Possibilities: Practice should be oriented toward hopes, dreams, and aspirations, not just problem reduction.
- Avoid diagnosing and labeling: DSM diagnoses, "at-risk" labels, and deficit framing can become self-fulfilling.

The strengths perspective directly challenges the medical model of social work practice. It aligns with social work values of dignity and self-determination.

FAMILY SYSTEMS CONCEPTS
When working with families, social workers attend to:
- Communication patterns (direct vs. indirect; clear vs. ambiguous)
- Power and boundaries (enmeshed — overly close; disengaged — overly distant)
- Roles (who plays what role in family functioning?)
- Rules (explicit and implicit rules governing behavior)
- Triangulation (introducing a third party to reduce tension between two — typically dysfunctional)
- Identified patient: The family member who presents with symptoms may not be the source of the problem — they may be expressing a family system dysfunction.

DISCUSSION QUESTIONS
1. A mother brings her 10-year-old son to your agency because he is "acting out at school." Using the ecosystems perspective, map the systems affecting this child's behavior. What questions would you ask, and at what level would you intervene?
2. How does the strengths perspective change how a social worker writes a case assessment compared to a medical model or deficit-based approach? What are the practical implications for the client relationship?
3. Homeostasis in family systems means the family resists change even when change would be beneficial. What does this predict about the effectiveness of one-session interventions with families, and what does effective family change require?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Diversity and Anti-Oppressive Practice',
        materialType: 'lecture',
        content: `MODULE 4: DIVERSITY AND ANTI-OPPRESSIVE PRACTICE
Privilege, Intersectionality, and Cultural Humility

THE CENTRALITY OF SOCIAL JUSTICE IN SOCIAL WORK
Social justice — the elimination of oppression and the equitable distribution of resources — is not optional in social work; it is a core professional value. Social workers practice in contexts saturated with power differentials, systemic inequities, and the legacies of historical oppression. Practitioners who are unaware of these dynamics will inadvertently reproduce them.

PRIVILEGE AND OPPRESSION
Privilege refers to unearned advantages conferred on members of dominant social groups by virtue of their group membership. These advantages are systemic and often invisible to those who hold them.

Peggy McIntosh's foundational essay "White Privilege: Unpacking the Invisible Knapsack" (1989) made visible the daily advantages of whiteness through a checklist of experiences: "I can go shopping alone most of the time, fairly well assured that I will not be followed or harassed." Privilege is not about individual virtue or fault — it is a structural reality.

Social workers must understand privilege in multiple dimensions: race/ethnicity, gender, sexual orientation, class, ability, religion, immigration status, and more. These dimensions intersect and compound.

Oppression is the systematic subordination of one social group by another based on social group membership, supported by institutional power and ideology. Oppression operates at:
- Individual level: Prejudice, discrimination, microaggressions
- Institutional level: Discriminatory policies, unequal resource distribution, disparate enforcement
- Cultural/societal level: Norms, values, and representations that normalize dominant group perspectives and marginalize others

INTERSECTIONALITY (Kimberlé Crenshaw)
Intersectionality, coined by legal scholar Kimberlé Crenshaw (1989), describes how overlapping systems of oppression (racism, sexism, classism, heterosexism) create distinct forms of discrimination for people with multiple marginalized identities that cannot be understood by examining each identity in isolation.

Classic example: Black women in the workplace face discrimination that is neither "racism" as Black men experience it nor "sexism" as White women experience it — it is a distinct, intersectional form of discrimination. A framework that addresses only race (and assumes Black experience = Black male experience) or only gender (and assumes women's experience = White women's experience) will miss the specific barriers Black women face.

For social work practice: Intersectionality means that practice must be individualized — no client can be fully understood through a single lens. A Latina, undocumented, lesbian woman's experience of domestic violence cannot be adequately addressed without understanding how each of her identities shapes her access to services, risk of deportation, community support, and institutional treatment.

CULTURAL COMPETENCE AND CULTURAL HUMILITY
Cultural Competence: The ability to work effectively with people from diverse cultural backgrounds, using culturally appropriate knowledge, skills, and practices. Limitation: the metaphor of "competence" implies mastery and an end state — "I am now competent with Hmong clients." This misrepresents cultural learning, which is ongoing.

Cultural Humility (Tervalon and Murray-García, 1998): A lifelong process of self-reflection and self-critique, openness to learning, and recognition of the power imbalances inherent in service relationships. Cultural humility:
- Acknowledges the limitations of one's own cultural knowledge
- Commits to ongoing self-learning
- Recognizes the client as the expert on their own cultural experience
- Challenges power imbalances in the helping relationship
- Advocates at the institutional level for policies that reduce disparate treatment

ANTI-OPPRESSIVE PRACTICE (AOP)
Anti-oppressive practice is an approach to social work that explicitly names, challenges, and works to dismantle systems of oppression. It moves beyond individual cultural sensitivity to structural analysis and action.

AOP requires social workers to:
- Examine their own social location (privileges and oppressions they carry)
- Recognize how power operates in the helping relationship (the social worker has institutional power over clients)
- Make power visible and work to equalize it in practice
- Advocate for structural change as part of practice, not as a bonus activity
- Challenge practices, policies, and organizations that perpetuate oppression

PROFESSIONAL USE OF SELF
Social work requires "professional use of self" — bringing your authentic self into the professional relationship while maintaining appropriate boundaries. This means: awareness of your own biases, values, triggers, and social location; using your emotional responses as clinical data; maintaining appropriate professional boundaries.

Self-care and secondary traumatic stress: Social workers regularly encounter suffering, trauma, and injustice. Secondary traumatic stress (compassion fatigue) is an occupational hazard. Professional self-care is an ethical obligation in the NASW Code, not a luxury.

DISCUSSION QUESTIONS
1. A social worker working with a homeless LGBTQ+ youth from a conservative religious family must navigate the youth's spiritual identity (deeply important to them), their sexual orientation, their family's values, and the systems that affect their housing. How does intersectionality help you think about this case?
2. How is "cultural humility" different from "I treat everyone the same"? Why might treating everyone the same perpetuate inequality?
3. Anti-oppressive practice requires social workers to challenge their employing organizations when those organizations perpetuate oppression. What risks does this create for social workers, and how does the NASW Code support them?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Social Work Practice Methods',
        materialType: 'lecture',
        content: `MODULE 5: SOCIAL WORK PRACTICE METHODS
Micro, Mezzo, and Macro Levels of Practice

THE GENERALIST PRACTICE CONTINUUM
Social work practice spans three interconnected levels:
- Micro practice: Direct services with individuals and families
- Mezzo practice: Work with small groups, organizations, and communities
- Macro practice: Policy advocacy, community organizing, social change

These levels are not separate silos — effective generalist social workers move fluidly among them. A school social worker helps individual students (micro), facilitates a student support group (mezzo), and advocates to the school board for a trauma-informed discipline policy (macro). The distinction is analytical, not organizational.

MICRO PRACTICE: WORKING WITH INDIVIDUALS AND FAMILIES
The direct services relationship is the vehicle for change. Key components:
Engagement: Building rapport and a working alliance. First interactions establish trust (or fail to). Social workers meet clients "where they are" — at home if needed, in their primary language, without judgment about their lifestyle or choices.

The Therapeutic Relationship: Research consistently shows that the quality of the working alliance predicts outcomes more than any specific technique. Active listening, empathy, genuineness, unconditional positive regard (Rogers) are foundational relational skills.

Assessment Tools:
- Genogram: A visual map of a family's intergenerational structure, relationships, and patterns. Reveals family dynamics (triangulation, cut-offs, repeated patterns) across generations.
- Ecomap: A visual representation of a client's relationships with systems in their environment — family, school, work, friends, community organizations, government agencies. Shows the quality of these connections (supportive, stressed, one-directional).
- Bio-psycho-social assessment: Comprehensive narrative assessment covering biological (physical health, substance use, medications), psychological (mental health, cognition, emotional functioning), and social (family, support, housing, finances, work, culture) dimensions.

Evidence-Based Practices (EBP):
- Cognitive-Behavioral Therapy (CBT): Addresses the relationship between thoughts, feelings, and behaviors. Evidence-based for depression, anxiety, trauma, substance use.
- Motivational Interviewing (MI): A collaborative, person-centered approach to eliciting behavior change by exploring and resolving ambivalence. Core spirit: partnership, acceptance, compassion, evocation. Four processes: engaging, focusing, evoking, planning.
- Trauma-Informed Care: Recognizes that trauma is pervasive and affects behavior, relationships, and health. Principles: safety, trustworthiness, peer support, collaboration and mutuality, empowerment, cultural sensitivity.

MEZZO PRACTICE: GROUPS AND COMMUNITY WORK
Group Work: Social workers facilitate therapeutic groups (mutual aid groups, psychoeducational groups, support groups) and task groups (committees, coalitions). Groups harness the power of peer relationships for change. Yalom's curative factors: universality (not alone), imparting information, instilling hope, altruism, group cohesion, interpersonal learning.

Community Organization Models (Rothman):
- Locality Development: Building community capacity and civic engagement through consensus-based processes. Assumes community members can identify and solve their own problems if organized effectively.
- Social Planning: Expert-driven, data-based problem-solving. Used by public agencies planning services or programs.
- Social Action: Confrontational approach addressing power imbalances — advocacy, protests, organizing. Assumes the community has been wronged and needs to build power to address injustice.

MACRO PRACTICE: POLICY AND SYSTEMS CHANGE
Policy Advocacy: Working to change laws, regulations, and policies that create or perpetuate social problems. Social workers engage at local (city council, school board), state (Kentucky General Assembly), and federal levels.

Community Organizing: Building collective power among marginalized communities to demand systemic change. The Alinsky tradition (Industrial Areas Foundation) emphasizes relational power, identifying self-interest, confronting institutions, and negotiating for concrete wins.

Program Development: Designing, implementing, and evaluating social service programs. Grant writing, needs assessment, logic model development, program evaluation.

Administrative Practice: Social workers in management positions lead agencies, supervise staff, manage budgets, and create organizational cultures that support good practice.

THE STRENGTHS OF MACRO PRACTICE
Individual-level interventions address the symptoms of structural problems, not their causes. Macro practice addresses root causes. Example: Poverty is not primarily caused by individual deficits in motivation or financial literacy — it is caused by wage structures, housing costs, discrimination, and policy choices. Individual financial coaching helps one person; living wage legislation helps millions. Both matter; macro practice multiplies the impact of micro work.

DISCUSSION QUESTIONS
1. A social worker in a domestic violence shelter notices that the same patterns appear in case after case: abusers face minimal criminal consequences, and clients can't afford to leave because of economic dependence. What micro, mezzo, AND macro interventions might address this issue simultaneously?
2. Why is motivational interviewing more consistent with social work values than directive advice-giving? What ethical principles does MI uphold?
3. Rothman's community organization models represent different assumptions about power and change. Which model would you use to address disproportionate suspension rates for Black students in a school district? Justify your choice.`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Field Practicum Overview',
        materialType: 'lecture',
        content: `MODULE 6: FIELD PRACTICUM OVERVIEW
What to Expect, Professional Conduct, and Supervision

FIELD EDUCATION AS THE SIGNATURE PEDAGOGY
The Council on Social Work Education (CSWE) designates field education as social work's "signature pedagogy" — the primary method through which professional identity, values, and practice competence are developed. Classroom learning provides the conceptual framework; field practicum is where that framework becomes embodied practice. CSWE requires a minimum of 400 field hours for BSW programs (800+ for MSW).

WHAT IS FIELD PRACTICUM?
Field practicum is supervised professional practice in an approved agency setting. Students are assigned to an agency that matches their learning goals, under the supervision of a Licensed Clinical Social Worker (LCSW) field instructor. Unlike an internship or job, field practicum is explicitly educational — the primary purpose is learning, not agency productivity.

Students in practicum:
- Carry a small caseload of real clients under supervision
- Attend and participate in team meetings, case conferences, and agency training
- Complete agency-standard documentation (case notes, assessments, treatment plans)
- Meet weekly with their field instructor for formal supervision
- Complete learning plan goals established at the start of placement
- Participate in integrative seminar connecting field experience to course content

FIELD AGENCY SETTINGS AT UK
The UK College of Social Work has established field partnerships across:
- Direct services: Child welfare (DCBS), domestic violence agencies, mental health centers, substance use treatment, school social work, medical social work, hospice
- Community/macro: Legal aid organizations, community development agencies, advocacy organizations, legislative offices
- Criminal justice: Public defender offices, reentry programs, diversion programs

Students typically complete their first practicum (BSW) in a generalist setting and can specialize in advanced practice (MSW) with specific populations or methods.

PROFESSIONAL CONDUCT IN FIELD
The field setting is a professional environment governed by the NASW Code of Ethics, agency policy, and client rights. Key expectations:
- Confidentiality: Everything observed and all client information is confidential. Do NOT discuss clients by name outside clinical supervision. Do NOT identify clients on social media in any form. Do NOT take photographs or recordings without explicit authorization.
- Professional Appearance: Follow the agency dress code. First impressions matter to clients and colleagues. Remove distracting accessories.
- Punctuality and Attendance: Arriving late or being absent affects clients and the agency. Same-day absences require immediate notification to both the field supervisor and field faculty liaison.
- Mandatory Reporting: Social workers are mandatory reporters of suspected child abuse and elder abuse. This obligation exists from the moment you are a student in a field placement — ignorance is not a defense.
- Boundaries: Maintain professional boundaries with clients at all times. Do not give clients your personal phone number or social media contact. Do not accept gifts (beyond minimal token items). Do not have contact with clients outside the agency setting without authorization.

SUPERVISION IN SOCIAL WORK
Professional supervision is a cornerstone of social work education and career-long practice. Social work supervision serves three functions (Kadushin):
1. Administrative: Ensuring agency policies are followed and work quality meets standards.
2. Educational: Developing the supervisee's knowledge, skills, and professional judgment.
3. Supportive: Addressing the emotional impact of the work on the supervisee — preventing burnout and secondary traumatic stress.

How to Use Supervision Effectively:
- Come prepared: Bring specific questions, cases, and dilemmas to supervision — don't wait to be asked.
- Be honest: Supervision works only when you disclose uncertainty, mistakes, and emotional reactions. Supervisors cannot help with what they don't know about.
- Use parallel process: The supervisor-supervisee relationship often mirrors the worker-client relationship. Understanding this dynamic is a learning tool.
- Document supervision: Keep a record of what was discussed, what decisions were made, and what follow-up was planned.

SOCIAL WORK LICENSURE AND CAREER PATHS
Kentucky LCSW Pathway: BSW → LBSW → MSW (2 years) → LCSWA → 2 years supervised post-MSW practice → LCSW.
Career settings: Child welfare (CPS, foster care, adoption), school social work, healthcare (hospital, hospice, cancer care), mental health (community mental health, private practice), substance use treatment, corrections, military, policy/advocacy, community development, administration.
Median annual salary (BLS 2024): $60,000–$70,000; varies significantly by setting and location. MSW degree substantially increases both options and earnings.

DISCUSSION QUESTIONS
1. During your field placement, you witness a licensed social worker at the agency behave in a way that you believe violates the NASW Code of Ethics. What are your obligations? What would you do first?
2. A client you've been working with for three months tells you she no longer needs services and is doing well. Termination feels abrupt to you because you feel invested in her progress. How do you handle your own emotional reaction professionally?
3. Social work supervision requires disclosing mistakes and uncertainties to someone who evaluates you. Why is this vulnerability necessary? What organizational culture conditions make it safe?`,
      },
      {
        moduleNumber: 8,
        title: 'Case Study Paper Rubric',
        materialType: 'rubric',
        content: `SW 200 CASE STUDY PAPER RUBRIC
Assignment: Case Study Paper (30% of course grade)
Total Points: 100 points
Length: 10–12 pages (excluding references and cover page)
Format: APA 7th edition; professional writing standards; person-first language throughout
Due: End of Week 12 (Sunday 11:59 PM on Canvas)

GRADING CRITERIA

1. COMPREHENSIVE ASSESSMENT (20 points)
- 18–20 pts: Bio-psycho-social assessment addresses all three dimensions (biological, psychological, social) with specificity; uses person-first language; organizes information clearly; identifies strengths AND challenges; incorporates relevant systems and environmental context (ecosystems perspective evident); no deficit-only framing.
- 14–17 pts: Assessment covers most dimensions; strengths partially addressed; systems context partially developed.
- 10–13 pts: Assessment incomplete — one dimension underdeveloped; deficit-focused without strengths; systems context absent.
- 0–9 pts: Assessment missing major components; not organized; demonstrates fundamental misunderstanding of bio-psycho-social model.

2. THEORETICAL FRAMEWORK APPLICATION (25 points)
- 22–25 pts: Applies at least two course theories (systems theory, ecosystems perspective, strengths perspective, anti-oppressive practice, or other explicitly taught theory) correctly and specifically to the case; theory is used analytically — explaining the case, not merely named; theories are connected (not just listed separately); application demonstrates deep understanding.
- 17–21 pts: Two theories identified; application of one strong, one superficial; theories mostly connected to the case.
- 12–16 pts: Only one theory applied, or theories mentioned but not meaningfully applied to the case data.
- 0–11 pts: Theories absent; or theoretical concepts used incorrectly; cannot demonstrate understanding through application.

3. MULTI-LEVEL INTERVENTION PLAN (20 points)
- 18–20 pts: Specific intervention recommendations at ALL THREE levels (micro, mezzo, macro); each recommendation is concrete (specific action, not vague aspiration); each is feasible and appropriate to the case context; the three levels are connected (macro intervention addresses root causes of micro-level problems).
- 14–17 pts: All three levels addressed; one level underdeveloped or less concrete.
- 10–13 pts: Only two levels addressed; interventions vague; levels disconnected.
- 0–9 pts: Single-level intervention only; no awareness of practice continuum.

4. ETHICAL ANALYSIS (20 points)
- 18–20 pts: Identifies at least two ethical dilemmas or tensions present in the case; applies specific NASW Code provisions (cited by number); reasons through the dilemma using an ethical decision-making framework; acknowledges competing values; does not oversimplify — recognizes that ethical dilemmas do not have clear right answers.
- 14–17 pts: Two ethical issues identified; Code provisions cited; reasoning partially developed.
- 10–13 pts: Ethical section present but identifies only one issue; Code cited superficially; reasoning not worked through.
- 0–9 pts: Ethical section absent or so vague it adds no substance (e.g., "I would follow the Code of Ethics").

5. EVALUATION APPROACH AND WRITING QUALITY (15 points)
- 13–15 pts: Proposes a specific, feasible plan for evaluating the effectiveness of the intervention (what indicators, what timeline, what constitutes success?); APA 7th edition used correctly throughout; professional writing throughout (no first person, person-first language, no jargon without definition); within page length.
- 10–12 pts: Evaluation approach present; APA mostly correct; writing professional with minor lapses.
- 7–9 pts: Evaluation approach vague; APA errors throughout; writing occasionally informal.
- 0–6 pts: Evaluation absent; APA largely ignored; writing unprofessional.

PENALTIES
- Person-first language violations (persistent use of "the schizophrenic," "addict," etc.): –5 points
- Missing NASW Code ethical analysis section: automatic score of no more than 70/100
- Late submission: –10 points per day`,
      }
    ]
  },

  // ────────────────────────────────────────────────
  // ARC-151-STARTER — Foundations of Architecture
  // College of Design
  // ────────────────────────────────────────────────
  {
    courseCode: 'ARC-151-STARTER',
    title: 'Foundations of Architecture',
    description: 'An introductory design studio course exploring the fundamental elements of architecture — space, form, light, and materiality — through drawing, physical model-making, and iterative design projects. Studio-based with portfolio reviews, desk critiques, and a rigorous studio attendance requirement.',
    college: 'College of Design',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `ARC 151 — Foundations of Architecture
College of Design, University of Kentucky
Spring 2026 | Studio Hours: MWF 1:00–5:00 PM | Pence Hall Studio 115

INSTRUCTOR
Professor Katie Thompson, Department of Architecture
Office: Pence Hall 220
Office Hours: Monday & Wednesday 11:00 AM–12:30 PM; by appointment
Email: katie.thompson@uky.edu
Studio desk critiques by appointment; in-studio critique time most studio sessions.

COURSE DESCRIPTION
ARC 151 introduces students to the fundamentals of architectural design through studio-based learning. Working at the intersection of concept and craft, students explore how architecture communicates meaning, how the elements of design (line, form, space, light, texture) operate in built work, and how architects communicate through drawing and physical models. Studio culture, iterative design process, and critical dialogue are emphasized. No prerequisites; required for Architecture major, open to interested students.

MATERIALS LIST (REQUIRED BY WEEK 1)
- Drafting supplies: Mechanical pencil (0.5 and 0.7), lead (HB, 2B), architect's scale ruler, 30-60-90 and 45-degree triangles, T-square or parallel bar
- Sketching: Spiral-bound sketchbook (at least 9"×12"), extra sketch paper pads
- Tracing paper: Two rolls (12" width minimum)
- Cutting: X-Acto knife (#1 with spare blades), self-healing cutting mat (18"×24" minimum), metal straight edge
- Model materials: Chipboard (2-ply and 4-ply, available at UK Bookstore), bass wood strips (1/8" and 1/4"), white glue, rubber cement
- Drawing tools: 18"×24" drafting board or drawing board with clips
- Portfolio case: 18"×24" flat file or portfolio case (for transporting finished work)
Approximate cost: $120–$180. Budget carefully; some materials can be shared. A complete materials list with vendor options is posted on Canvas.

GRADING BREAKDOWN
Portfolio Reviews (3 reviews)           40%
Studio Projects (3 projects)            30%
Sketchbook                              15%
Desk Critiques and Studio Participation 15%
TOTAL                                  100%

PORTFOLIO REVIEWS (40%)
Three formal portfolio reviews assess cumulative progress. Criteria: concept clarity, drawing quality, model craft, presentation, and process documentation.

Portfolio Review Schedule:
- Review 1: End of Week 5 (Friday): Project 1 portfolio — Architecture and Culture + Elements of Design explorations
- Review 2: End of Week 10 (Friday): Project 2 portfolio — Drawing Fundamentals + Scale and Proportion exercises
- Review 3: End of Week 15 (Thursday, during finals period): Final portfolio — all projects plus Site and Context and Materials/Structure work; cumulative process documentation included

Reviews are formal events — work presented on pin-up boards; faculty from the entire Architecture department and sometimes external critics attend Review 3. Professional presentation standards apply.

STUDIO PROJECTS (30%)
Project 1: Reading a Building (Weeks 1–5): Select and analyze a significant building from photographs and documentation. Produce a series of analytical drawings (plan, section, elevation, axonometric, detail studies) and a brief written statement (1 page) about what the building communicates architecturally.
Project 2: Light and Form Study (Weeks 6–10): Design a small architectural object (a pavilion, shelter, or light-catching device) that uses the interaction of form and light to create a meaningful spatial experience. Produce drawings and a physical model (min. 1:20 scale).
Project 3: Site Response (Weeks 11–14): Design a simple outdoor room or contemplative space for a real site on or near the UK campus. Produce full documentation: site plan, floor plan, two elevations, two sections, two perspectives, physical model (1:50 or 1:100), and a process sketchbook.

SKETCHBOOK (15%)
The sketchbook is a continuous record of your visual thinking — observational drawings, design exploration, material studies, sketches of buildings you encounter, notes on readings. Not a finished product; an honest record of your process. Evaluated at each portfolio review. Assessment criteria: regularity of use (minimum 5 pages per week), variety (not just one type of drawing), evidence of observation, and engagement with course themes.

DESK CRITIQUES AND STUDIO PARTICIPATION (15%)
Studio culture requires active engagement. Desk critiques are one-on-one or small group conversations with the instructor or visiting critics during which you discuss your work in progress, receive feedback, and revise. They are not passive feedback sessions — you are expected to explain your thinking, defend design decisions, and propose revisions. Quality of engagement in desk critiques, peer critiques, and class discussions constitutes this grade component.

STUDIO ATTENDANCE POLICY
Studio attendance is MANDATORY. Architecture is learned in the studio through making, looking, discussing, and iterating — you cannot learn studio culture by reading notes at home.
- 0–2 absences: No penalty
- 3 absences: One full letter grade reduction (e.g., B → C)
- 4 absences: Two full letter grade reductions
- 5 or more absences: Automatic course failure regardless of work quality

An "absence" is defined as missing more than 30 minutes of a studio session. Arriving significantly late (>30 min) or leaving significantly early (<30 min remaining) counts as a half absence. Three tardies = one absence. No exceptions for athletic travel, work schedules, or personal convenience — contact the instructor before the studio session if there is a conflict.

LATE WORK POLICY
Projects submitted after portfolio review time: –10% per calendar day. No late work accepted after 5 days. Sketchbook: must be present for all reviews; no exceptions.

ACADEMIC INTEGRITY
All design work must be your own original work. Submitting another person's design as your own, digitally manipulating or tracing copyrighted architectural drawings without attribution, or fabricating process documentation are all violations of academic integrity. Collaboration in studio (discussing ideas with peers) is strongly encouraged; submitting collaborative work as individual work is not.`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Architecture and Culture',
        materialType: 'lecture',
        content: `MODULE 1: ARCHITECTURE AND CULTURE
What Buildings Communicate and Reading the Built Environment

ARCHITECTURE AS COMMUNICATION
Buildings are not merely functional containers. They communicate meaning — about power, culture, belief, aspiration, and identity — through their form, materials, siting, and spatial organization. A courthouse with a grand colonnade and elevated base communicates authority and permanence. A glass-and-steel office tower communicates transparency, corporate power, and technological optimism. A vernacular wooden farmhouse communicates rootedness, practicality, and relationship to the land. Understanding what buildings say — and how they say it — is a foundational architectural skill.

Architecture is simultaneously:
- Utilitarian: It must work functionally. A hospital must support healing; a school must support learning; a house must support dwelling.
- Technical: It must stand up, shed water, and provide comfort through structural and environmental systems.
- Cultural: It reflects and shapes the values, beliefs, and social organization of the culture that produces it.
- Artistic: It can be beautiful, moving, and transcendent beyond its utilitarian and technical requirements.

The tension between these four demands is the creative territory of architecture.

READING BUILDINGS: KEY ANALYTICAL LENSES

Typology: Building types carry cultural meaning. A library is not just a room of books — the institutional library type developed in the 19th century communicated democratic access to knowledge (hence the grand civic scale of many public libraries). Understanding typology means reading a building against the conventions of its type: how does this library conform to or challenge what a library "should" be?

Precedent: Architects learn by studying what has been built before. A precedent study is not copying — it is understanding the design moves that solved (or created) a problem, and considering whether they apply to a new situation. Every skilled architect carries an extensive mental library of precedent.

Plan, Section, Elevation: Architecture's primary drawing types:
- Plan (horizontal slice): Reveals spatial organization, circulation, relationship of rooms, structural grid. The plan is where most design decisions are made.
- Section (vertical slice): Reveals height, light, structural logic, the experience of moving through space vertically.
- Elevation (flat frontal view): Reveals proportion, rhythm of openings, material expression, relationship to the ground.
Learning to read all three simultaneously is essential for spatial literacy.

Proportion: The ratio of parts to whole. Classical architecture was governed by mathematical proportion systems (the orders — Doric, Ionic, Corinthian). Modern architecture uses proportion intuitively but proportion remains fundamental: a building with poor proportions feels wrong even if you can't articulate why.

Context: A building exists in a place — physical, cultural, historical. Context includes: the adjacent buildings (scale, material, style), topography, climate, views, circulation patterns, historical layers. A contextual building responds to its setting; an iconoclastic building deliberately departs from it. Neither approach is inherently superior — both require awareness of context.

EXAMPLES: READING THREE BUILDINGS

1. The Parthenon (Athens, 447–432 BCE): Ostensibly a temple to Athena; actually a statement of Athenian cultural supremacy after defeating Persia. Elevated on the Acropolis to be visible throughout the city. Refinements of "perfect" geometry (subtle curves in columns, platform, entablature — to correct for optical distortions) demonstrate technological mastery. The building communicates: this civilization has achieved perfection.

2. Fallingwater (Frank Lloyd Wright, 1935, Mill Run, PA): A weekend house cantilevered over a waterfall, built for the Kaufmann family. Wright's "organic architecture" principle — buildings should grow from and respond to their site, not be imposed on it. Horizontal forms echo the rock ledges; local stone used throughout; the house is in the landscape, not on it. Communicates: nature and habitation can be integrated; modernism need not be alienating.

3. The Holocaust Museum Washington DC (James Ingo Freed, 1993): Uses architectural sequence as emotional narration. Visitors enter freely, then are progressively constricted — narrowing corridors, exposed brick, industrial materials evoking concentration camp architecture. The architecture prepares the visitor psychologically for what is about to be learned. Architecture can carry moral and historical weight.

DISCUSSION QUESTIONS
1. Visit a significant building in Lexington (or any city you know). Using the analytical lenses from this module, describe what the building communicates. Consider: typology, proportion, materials, context, plan organization.
2. Is "ugly" architecture a failure? Can a building that makes people uncomfortable be architecturally successful?
3. The Parthenon was built with enslaved labor. The great plantation houses of the American South were built by enslaved people and designed to display the wealth that slavery generated. Should this history change how we evaluate these buildings architecturally?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Elements of Design',
        materialType: 'lecture',
        content: `MODULE 2: ELEMENTS OF DESIGN
Line, Form, Space, Light, and Texture in Architecture

THE VOCABULARY OF ARCHITECTURAL DESIGN
Before making buildings, architects must develop a vocabulary for understanding and manipulating the formal elements that constitute architectural experience. These elements — line, form, space, light, and texture — are the raw material of design. Mastery comes not from memorizing definitions but from training your eye and hand through sustained observation and making.

LINE
In drawing, line is the primary tool for representing form. In space, line appears as edges — the meeting of surfaces, structural elements, and borders of openings. The quality of a line — its weight, direction, continuity, and precision — communicates information and intention.

In architecture, line creates:
- Direction and movement: Long horizontal lines suggest repose (the horizon, a prairie house); vertical lines suggest aspiration and energy (Gothic cathedrals, skyscrapers).
- Rhythm: Repeated lines create rhythm — columns in a colonnade, floor lines in a facade, structural bays in a shed.
- Boundary: Lines define edges — of rooms, of sites, of materials.

FORM
Form is three-dimensional shape. The primary forms — cube, cylinder, cone, sphere, pyramid — were identified by Le Corbusier as the "great primary forms" that are always beautiful because they are geometrically pure and fully legible. Real architectural forms are created by: addition (combining pure forms), subtraction (carving into a solid form), transformation (stretching, compressing, rotating a basic form), and aggregation (grouping multiple forms).

Solid vs. Void: Architecture is the manipulation of solid (wall, column, floor) and void (open space, opening, courtyard). The relationship between solid and void — positive and negative — determines spatial character. A heavy, solid building with punched window openings feels very different from a lightweight building where glass dissolves the wall.

SPACE
Space is the medium of architecture — the void that architecture creates and defines. Unlike sculpture (experienced from the outside), architecture is primarily experienced from within its spaces. Spatial qualities:
- Volume: The three-dimensional extent of a space — the soaring nave of a cathedral vs. a compressed corridor.
- Scale: The relationship of space to the human body. Intimate (ceiling at 7 feet, walls close), monumental (30-foot ceiling, distant walls), compressed, expanded.
- Sequence and procession: Architecture is experienced in time and movement. A building is a sequence of spaces — compression followed by release, darkness followed by light, complexity followed by simplicity.
- Threshold: The passage from outside to inside, from one space to another. Thresholds mark transitions that can be ritualized (the vestibule of a church) or minimized (a sliding glass door).

LIGHT
Louis Kahn said: "No space, architecturally, is a space unless it has natural light." Light is the most powerful experiential dimension of architecture — it changes hour by hour, season by season, and gives spaces their emotional character.

Types of natural light in architecture:
- Direct light: Sunlight entering through windows or skylights. Creates hard shadows, warm color, dynamism.
- Diffuse light: Soft, even light from overcast sky or from north-facing windows (in the northern hemisphere). Minimizes shadows; favored in art studios and galleries.
- Reflected light: Light bouncing off surfaces before entering a space. Softer than direct; can be colored by the reflecting surface.

Strategic Light: Le Corbusier's chapel at Ronchamp uses massive wall thickness (variable) to control light direction and intensity; Tadao Ando's Church of Light creates a cross of white light in an otherwise dark space; Alvar Aalto's Viipuri Library uses circular skylights to distribute even reading light without shadow.

TEXTURE AND MATERIAL
Texture is the surface quality of materials — actual texture (physically rough or smooth) and visual texture (the pattern created by material assembly). Materials communicate:
- Permanence and weight: Stone and concrete feel enduring; light steel and glass feel ephemeral.
- Human scale and craft: Brick courses, hand-hewn timber, and rough-cut stone register human scale and labor; smooth pre-cast panels and mirror glass obscure it.
- Local identity: Using local materials connects a building to its place — vernacular architecture worldwide demonstrates this.

The junctions between materials — how brick meets glass, how wood meets concrete — are architectural moments. Details matter.

DISCUSSION QUESTIONS
1. Walk across UK's campus and find three spaces with dramatically different light qualities. Describe each using the vocabulary from this module. What design decisions created these light conditions?
2. Le Corbusier argued that pure geometric forms are always beautiful. Do you agree? Can you think of buildings where complex, irregular forms create architectural beauty that pure geometry cannot?
3. Why does the same room feel different in the morning vs. late afternoon? How does this affect how you would design a library reading room vs. a meditation space?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Drawing Fundamentals',
        materialType: 'lecture',
        content: `MODULE 3: DRAWING FUNDAMENTALS
Orthographic Projection, Axonometric, and Freehand Sketch

DRAWING AS THINKING
In architecture, drawing is not primarily a communication tool (though it is that) — it is a thinking tool. The process of drawing a building teaches you things about it that no amount of looking or writing can reveal. The discipline of producing an accurate plan forces you to understand the spatial relationships between rooms. The discipline of producing an accurate section forces you to understand height, structure, and light. Drawing is where architectural thinking happens.

The studio tradition of hand drawing — in an era of ubiquitous digital tools — is not nostalgia. Hand drawing develops spatial intelligence, trains observation, and creates an intimate understanding of form that digital modeling alone cannot produce. Learn both; neglect neither.

ORTHOGRAPHIC PROJECTION
Orthographic projection represents three-dimensional objects on a two-dimensional surface by projecting parallel lines perpendicular to the drawing plane. The three primary orthographic views in architecture:

Floor Plan: A horizontal cut made at approximately 4 feet above the floor, looking down. Shows: room layout and dimensions, wall thickness, column locations, door swing direction, window locations, stairs (shown with direction arrows and step count), built-in elements (kitchen counters, bathroom fixtures). Plan is drawn to scale and dimensioned.

Section: A vertical cut made through the building, looking in one direction. Shows: floor-to-floor heights, ceiling heights, structure (beams, joists, slabs), wall construction, stair geometry, relationship of interior floors to site grade. Sections are cut to reveal the most interesting or important spatial relationships.

Elevation: A projection onto a vertical plane parallel to a building face, looking straight on. Shows: proportion of openings, material expression, height, relationship to grade. An elevation does not show depth — for depth, use section.

Drawing Standards:
- Lines cut by the section plane are drawn in heavy (thick) lineweight
- Lines visible but not cut are drawn in medium lineweight
- Lines hidden behind visible surfaces are drawn as dashed lines (light weight)
- Dimensions placed outside the building outline; extension lines and dimension lines clearly organized
- Scale notation: "1/8" = 1'-0"" or "1:100" in title block
- North arrow on all plans

AXONOMETRIC DRAWING
Axonometric drawings show three-dimensional form in a single view that preserves parallel lines without converging to a vanishing point (unlike perspective). Most common types:
- Isometric: All three axes at 30° from horizontal; equal scaling on all three axes. Measurable directly from the drawing.
- Plan Oblique (Axonometric Plan): The floor plan is drawn at a chosen angle (30°, 45°, or 60°); vertical elements are drawn straight up. The plan is preserved true-shape. Excellent for showing spatial relationships and is measurable.
- Paraline Drawing: The general term for non-perspective parallel projection drawings.

Axonometric drawings show spatial organization clearly and are a primary tool in architectural presentation. They are constructed geometrically from plan and elevation, not drawn freehand.

FREEHAND SKETCH
Freehand sketching is the fastest form of architectural communication and the first tool used in design. Good freehand sketching is not about artistic talent — it is about trained observation and the willingness to put lines on paper.

Types of freehand architectural sketches:
- Gesture sketches: Quick proportional studies (30 seconds to 2 minutes). Goal: capture the essence of form, proportion, and massing. Not detail.
- Observational drawing: Sustained direct observation of a building or space (20–60 minutes). Goal: deep understanding of what you are looking at. Notice things you would otherwise miss.
- Design exploration sketches: Working out a design idea. Multiple small alternatives on one sheet; no commitment to any single solution.

Technique:
- Loose grip on pencil; draw from the shoulder, not the wrist (for long lines)
- Multiple light lines rather than one heavy line — build to the final line through accumulated marks
- Vary lineweight — heavier for foreground and outline, lighter for detail and background
- Resist erasing — treat corrections as additional information

PERSPECTIVE DRAWING
Perspective constructs the appearance of depth by having parallel lines converge at vanishing points. One-point perspective: parallel lines converge to a single vanishing point on the horizon. Good for interior spaces and axial views. Two-point perspective: lines of the building recede to two vanishing points; the most common type for exterior building views. Three-point perspective: adds a third vanishing point for vertical lines; creates dramatic bird's-eye or worm's-eye views.

DISCUSSION QUESTIONS
1. Why is a floor plan "the most important drawing in architecture"? What can it communicate that a photograph cannot?
2. Try this: draw a cube in isometric, then draw the same cube in two-point perspective. How do they look different? What does each communicate better?
3. Many architects claim that they "think with their pencils." What does this mean, and have you ever experienced thinking through drawing in any context?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Scale and Proportion',
        materialType: 'lecture',
        content: `MODULE 4: SCALE AND PROPORTION
Human Scale, Module, and the Golden Ratio

SCALE IN ARCHITECTURE
Scale is the relationship between the size of something and a reference standard. In architecture, the primary reference standard is the human body — architectural scale is always ultimately about the relationship of space and form to the person within it.

Types of Scale:
- Human Scale: Elements sized to feel comfortable in relation to the body. A door that is exactly the height of the tallest person who will use it is technically functional but feels wrong — it lacks head clearance, lacks the psychological comfort margin that makes a doorway feel welcoming. Cultural norms of "correct" door height (typically 7–8 feet in the U.S.) encode human scale intuitions.
- Intimate Scale: Spaces slightly smaller than "normal" create feelings of enclosure, coziness, protection. Japanese tatami rooms (very low ceilings) are a cultural practice of intimate scale.
- Monumental Scale: Spaces and elements intentionally larger than human scale communicate power, awe, and transcendence. The nave of a Gothic cathedral, a presidential memorial, a grand courthouse — their superhuman scale communicates that something larger than the individual is present.
- False Scale: Creating an illusion of scale larger or smaller than actual dimensions. The rusticated base of a classical building makes the stone courses look larger than they are, making the building appear more massive. Oversized windows on a small building make it appear larger.

Cues to Scale: Humans read scale by comparing unknown dimensions to known ones. Elements that provide scale cues: people (the most powerful scale reference), doors, window mullions, stair risers (7" high = body scale), handrails, light fixtures. A building photographed without people is harder to read for scale — architects strategically include or exclude scale figures depending on what they want to communicate.

PROPORTION
Proportion is the relationship between parts — the ratio of width to height, height to depth, opening size to wall surface. Proportion is distinct from scale (scale is about absolute size in relation to the body; proportion is about relative size of parts to each other and to the whole).

Classical Orders: Ancient Greek and Roman architecture was governed by elaborate proportion systems derived from the column and its components (base, shaft, capital, entablature). The Doric order was severe and masculine; the Ionic order was graceful; the Corinthian order was ornate. Proportions were codified by Renaissance theorists (Vitruvius, Palladio) and remained the framework for Western architecture for 2,000 years.

The Golden Ratio (φ ≈ 1.618): The golden ratio is the ratio A:B = B:(A+B). A rectangle whose sides are in the golden ratio (approximately 1:1.618) has been described since antiquity as possessing special aesthetic harmony. A golden rectangle can be divided into a square and a smaller golden rectangle ad infinitum — a self-similar geometry.

Claimed examples in architecture: The Parthenon's facade dimensions are often cited as approximating the golden ratio, though the evidence is mixed. Le Corbusier's Modulor system (1945) — a proportional system derived from the golden ratio and the human body — governed proportions in his buildings. Whether the golden ratio is objectively beautiful or culturally conditioned remains debated.

Le Corbusier's Modulor: A scale of proportions based on the human body and the Fibonacci sequence, intended to produce "harmonious" dimensions for architecture. The Modulor used a 6-foot man (later revised to 6'1") as the base reference, derived two series of dimensions (red series and blue series) related by the golden ratio, and proposed these as the design grid for all architectural and product dimensions. The Unite d'Habitation in Marseille (1952) was designed entirely using the Modulor.

MODULE IN ARCHITECTURE
A module is the basic unit of measurement from which all other dimensions in a building are derived. Using a module creates visual harmony because all dimensions are multiples of each other. The modular grid (a regular network of lines at module intervals) structures structural systems, room sizes, and building dimensions.

Modern construction is inherently modular: brick dimensions, drywall panel sizes, plywood sheets (4'×8'), structural bay spacings — all create module constraints that architects work with and against.

DISCUSSION QUESTIONS
1. Visit a space on campus that feels monumental (perhaps the student center, a church, or a government building) and a space that feels intimate. What specific dimensional and design choices create these different scale effects?
2. Is the golden ratio objectively beautiful, or is it a cultural preference we've been trained to perceive as beautiful? How would you design an experiment to test this?
3. Modular coordination in construction limits the architect's dimensional freedom. Is this a creative constraint or a creative restriction? How can working within module constraints lead to better design?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Site and Context',
        materialType: 'lecture',
        content: `MODULE 5: SITE AND CONTEXT
Siting, Orientation, Topography, and Relationship to Place

SITE AS DESIGN DETERMINANT
Every building exists in a particular place — a site with specific physical characteristics, cultural history, climatic conditions, and relationships to surrounding buildings and landscape. Designing without site is designing in a vacuum; the site is not a problem to be solved but a rich source of design information and opportunity.

The relationship between building and site exists on a spectrum: at one end, a building that is fully integrated with its site — growing from the land, using local materials, oriented to capture sun and view, respecting existing topography; at the other end, a building that is entirely self-referential, indifferent to its specific location and could exist anywhere.

Contemporary architecture tends toward integration; the Modernist tradition produced many indifferent site relationships; the best architecture of any period has always responded meaningfully to place.

READING A SITE
Site Analysis precedes design. A thorough site analysis documents:
- Physical: Dimensions, boundaries, topography (existing and proposed grading), soil conditions, existing vegetation, existing structures.
- Solar: Sun angles at summer/winter solstice and equinox (determines shadow patterns and solar access throughout the year). South-facing glazing maximizes winter solar gain; north glazing minimizes summer heat gain.
- Wind: Prevailing wind direction and seasonal variation; prevailing winter wind direction for thermal protection; summer breeze direction for natural ventilation.
- Views: Attractive views to capture; unwanted views (neighboring structures, parking lots) to screen.
- Access and Circulation: How do people arrive? By foot, car, bicycle? Where are pedestrian paths, roads, transit? Edges vs. primary entry points.
- Context: Surrounding buildings — scale, use, material, style, setbacks, rhythm of openings. What is the character of the neighborhood?
- Historical: What was on this site before? Archaeological significance? Cultural meaning?
- Infrastructure: Utilities (water, sewer, power, gas), stormwater management requirements, easements, setbacks.

TOPOGRAPHY AND BUILDING SITING
Topography — the three-dimensional form of the land — is one of the most powerful site determinants. Options for siting on sloped terrain:
- Cut and fill: Grade is re-shaped to create a level building pad. Expensive; disconnects building from landscape; creates erosion risk.
- Step the building with the slope: Building levels follow topographic contours; creates connection between interior and landscape at multiple levels.
- Elevate on pilotis (columns): Building raised above grade, allowing topography and landscape to flow beneath. Le Corbusier's Villa Savoye.
- Embed in the slope (earth-sheltered): Building integrated into the hillside; thermal mass, minimized visual impact, landscape preserved above.

The choice among these strategies dramatically affects the building's relationship to the landscape and its energy performance.

ORIENTATION
Orientation (the direction a building faces) has profound consequences for:
- Solar access and passive solar design: South-facing windows maximize winter solar heat gain in the northern hemisphere; narrow east-west building footprint optimizes solar control.
- Views: Primary living spaces oriented toward best views; service spaces (storage, bathrooms, mechanical) placed on less desirable aspects.
- Wind: Minimize surface area facing prevailing winter wind; maximize cross-ventilation on summer wind axis.
- Street relationship: Entry orientation creates the public/private transition; the entry facade communicates to the street.

PLACE AND IDENTITY
Beyond physical determinants, site carries cultural and historical meaning that architecture can acknowledge or ignore:
- Spirit of Place (Genius Loci): The distinctive atmosphere of a particular location — the feeling of a dense historic city center, a wild meadow, a campus quad. Thoughtful architecture amplifies and clarifies genius loci rather than replacing it with a generic solution.
- Local Materials: Building with locally available materials — limestone in Kentucky, adobe in the Southwest, timber in the Pacific Northwest — connects a building to its place and reduces the environmental cost of material transportation.
- Vernacular Traditions: Local building traditions encoded wisdom about climate, material, and construction. The deep porches of Southern architecture, the thick masonry walls of Adobe houses, the steep pitched roofs of New England — all are site responses refined over generations.

DISCUSSION QUESTIONS
1. Analyze a building you know well for its site response. Does it respond to sun, wind, views, and existing landscape? Where does it succeed, and where does it seem indifferent to its site?
2. A developer wants to clear an entire urban block, demolish existing buildings, and construct a new complex. What is lost, from an architectural standpoint, when existing buildings and urban fabric are cleared? What might be gained?
3. How should a new building respond to a historic context? Should it match the surrounding architecture, or is a deliberate contrast more honest? Can you find examples of both approaches that you find successful?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Materials and Structure',
        materialType: 'lecture',
        content: `MODULE 6: MATERIALS AND STRUCTURE
Wood, Concrete, Steel — Structural Logic and Material Expression

STRUCTURE AS ARCHITECTURE
In the best buildings, structural systems are not hidden behind finishes — they are expressed as part of the building's architecture. The soaring arches and flying buttresses of a Gothic cathedral are not decorative; they are the structural solution to building a large enclosed space in stone, made architecturally expressive. Mies van der Rohe's steel-framed buildings expose the structural system as the aesthetic system. Louis Kahn distinguished between "served" and "servant" spaces and expressed the structure that defined each type.

Understanding how materials carry load — how they fail, how they're most efficiently used — enables architects to work with structure as a design tool rather than an obstacle.

STRUCTURAL FUNDAMENTALS
Loads on buildings: Dead load (self-weight of the structure and permanent elements), live load (occupants, furniture, snow), wind load (lateral force), seismic load (ground motion).

Force types: Compression (pushing together), tension (pulling apart), shear (sliding past), torsion (twisting), bending (combination of tension and compression).

Basic structural elements:
- Column: Carries compressive vertical load. Stone and concrete are excellent in compression. Slender columns can buckle.
- Beam: Carries load by bending; top fiber in compression, bottom fiber in tension. Efficient beam shapes (I-beam) concentrate material at top and bottom where stresses are highest.
- Arch: Converts vertical load into compression along the arch curve; requires no tension in the material (hence stone arches). Thrust at supports must be resisted.
- Shell/Vault: Curved surface carrying load in compression; highly efficient use of material.
- Cantilever: A beam fixed at one end, free at the other. Long cantilevers generate large forces; efficient cantilever structures require careful engineering.

WOOD
The most ancient building material. Properties: strong in both tension and compression; flexible (can absorb shock); thermally comfortable; workable with simple tools; renewable. Weaknesses: dimensional instability (swells and shrinks with moisture), susceptible to fire and biological decay, limited span without engineered composites.

Structural systems: Post-and-beam (timber frame) — large members, long spans, visible structure — used in barns, cathedrals, contemporary timber structures. Light wood frame (balloon and platform frame) — small dimension lumber (2×4, 2×6), closely spaced (16" on center), structural efficiency through aggregation. Engineered wood: Glued laminated timber (Glulam), cross-laminated timber (CLT), laminated veneer lumber (LVL) — large spans, high strength, used in contemporary mass timber architecture.

Mass timber is experiencing a global renaissance: CLT panels up to 20 stories are now structurally viable; mass timber sequesters carbon, performs well in fire (char forms protective layer), and creates warm, human-scale interior environments.

CONCRETE
Portland cement + aggregate + water = concrete. Properties: strong in compression, weak in tension; can be molded into any shape; durable; fire resistant; thermally massive (absorbs and slowly releases heat). Weakness: heavy, poor in tension (mitigated by reinforcing steel — reinforced concrete or rebar; or prestressed/post-tensioned concrete for long spans).

Reinforced Concrete: Steel rebar placed in the tension zone before casting. The combination — concrete's compression strength + steel's tension strength — creates a material that handles complex bending. Used for nearly all concrete buildings.

Exposed Concrete (béton brut, "raw concrete"): Le Corbusier and the Brutalist tradition left concrete board-formed surfaces exposed as the finish material. The texture records the formwork — a documentation of making. Can feel honest and powerful, or cold and oppressive, depending on execution.

STEEL
Iron refined to reduce carbon content. Properties: extremely strong in both tension and compression; high stiffness; uniform properties; weldable; recyclable. Weaknesses: loses strength rapidly in fire (requires fireproofing), susceptible to corrosion (requires surface protection), expensive.

Structural steel: Wide-flange shapes (W-shapes, "I-beams") are the standard column and beam shapes. The moment frame (beams rigidly connected to columns) and the braced frame (diagonal bracing for lateral loads) are the primary steel structural systems.

Exposed steel: Mies van der Rohe's Barcelona Pavilion (1929) and Farnsworth House (1951) celebrate steel's slenderness — the possibility of nearly column-free space with glass walls that dissolve the boundary between inside and outside.

THE TECTONIC TRADITION
Kenneth Frampton's concept of tectonics (from the Greek tekton, "builder") — architecture understood as the honest expression of materials and their assembly. The joint, the detail, the material meeting are where tectonic architecture comes alive. The opposite: "scenographic" architecture, where materials are used as surface decoration rather than structural expression.

DISCUSSION QUESTIONS
1. The same structural function (spanning a large opening) can be achieved with a steel beam, a concrete beam, a wood glulam beam, or a masonry arch. What factors would determine your choice among these options for a specific design problem?
2. Find a building (in person or online) that honestly expresses its structural system, and one that conceals its structure behind decorative surfaces. Which approach do you prefer? Why?
3. Why is mass timber (CLT, glulam) experiencing a revival now after centuries of steel and concrete dominance? What has changed in technology, sustainability concerns, and cultural values?`,
      },
      {
        moduleNumber: 8,
        title: 'Portfolio Review Rubric',
        materialType: 'rubric',
        content: `ARC 151 PORTFOLIO REVIEW RUBRIC
Assignment: Portfolio Reviews (40% of course grade; three reviews)
Review 1: End of Week 5 | Review 2: End of Week 10 | Review 3: End of Week 15 (Finals)
Total Points per Review: 100 points

GRADING CRITERIA

1. CONCEPT CLARITY (20 points)
- 18–20 pts: A clear, specific design concept drives the work — not a vague aspiration ("I wanted it to feel open") but a precise architectural idea (a specific spatial sequence, a material strategy, a response to light) that is evident in the work and can be articulated verbally. The concept is sustained throughout the project; individual design decisions can be traced back to it.
- 14–17 pts: A concept is present but partially developed or inconsistently sustained; some decisions seem arbitrary.
- 10–13 pts: Concept vague or generic; work appears to be produced without a guiding idea.
- 0–9 pts: No discernible concept; work is decorative without architectural intention.

2. DRAWING QUALITY (25 points)
- 22–25 pts: Required drawing types produced correctly (plan, section, elevation as assigned); accurate orthographic projection; appropriate lineweights (cut vs. seen vs. hidden); dimensions and scale notation correct; drawings communicate spatial intent clearly; freehand sketches demonstrate observation and design thinking; clean and professional presentation.
- 17–21 pts: Drawings mostly correct; minor lineweight or dimensioning errors; spatial intent communicated with some ambiguity.
- 12–16 pts: Required drawing types present but with significant technical errors (incorrect projection, missing dimensions, incorrect lineweight throughout); spatial intent difficult to read.
- 0–11 pts: Required drawings absent or fundamentally incorrect (plan drawn as a perspective, etc.); does not communicate spatial information.

3. MODEL CRAFT (20 points)
- 18–20 pts: Model is cleanly constructed — precise cuts, tight joints, clean glue application; appropriate scale; material choices support the concept; model communicates spatial volumes and relationships clearly; structurally stable and professionally presented.
- 14–17 pts: Model mostly clean; some rough edges or joints; scale reasonably accurate; communicates basic form.
- 10–13 pts: Model construction rough or sloppy; scale inaccuracies affect spatial communication; material choices unclear.
- 0–9 pts: Model not completed; or so poorly constructed as to be unable to communicate design intent.

4. PRESENTATION (20 points)
- 18–20 pts: Work is thoughtfully and professionally organized on the pin-up — drawings arranged for maximum clarity, not just scattered; model presented at appropriate viewing height; verbal presentation is organized, specific, and confident; student can respond to questions with specific reference to their work; presentation communicates design intent effectively to an external critic.
- 14–17 pts: Work organized and pin-up is legible; verbal presentation covers the main points; most questions addressed.
- 10–13 pts: Pin-up organization unclear; verbal presentation vague or rushed; difficulty responding to questions.
- 0–9 pts: No organized pin-up; verbal presentation absent or demonstrates significant preparation failure.

5. PROCESS DOCUMENTATION (15 points)
- 13–15 pts: Sketchbook and/or process drawings demonstrate an active, iterative design process — multiple alternatives explored, ideas evolved and revised, evidence that the design didn't arrive fully formed but was developed through sustained engagement; process work is substantial (density of pages) and genuine.
- 10–12 pts: Process work present; less density than expected; mostly linear (one idea developed) rather than exploratory.
- 7–9 pts: Minimal process documentation; sketchbook sparse; appears to have proceeded directly to final without iteration.
- 0–6 pts: No process documentation submitted; or process work is clearly fabricated retroactively.

STUDIO ATTENDANCE NOTE: Students who have accumulated 3 or more studio absences will have their portfolio review score reduced by one full letter grade regardless of work quality, per the attendance policy.`,
      }
    ]
  },

  // ─── ART-101-STARTER ────────────────────────────────────────────────────────
  {
    courseCode: 'ART-101-STARTER',
    title: 'Drawing I',
    description: 'An introduction to drawing as a foundational studio practice, covering mark-making, value, perspective, proportion, and composition through sustained observational exercises, critique, and a final portfolio.',
    college: 'College of Fine Arts',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `DRAWING I — ART 101
College of Fine Arts | Spring 2026 | 3 Credit Hours
Studio: TuTh 9:00–11:45 AM | Fine Arts Building, Room 114

INSTRUCTOR
Professor Elaine Voss
Office: Fine Arts 212 | Office Hours: Mon/Wed 1:00–3:00 PM or by appointment
Email: e.voss@uky.edu

COURSE DESCRIPTION
Drawing I is a studio-based introductory course in observational drawing. Students develop fundamental visual skills through repeated practice with a range of dry media. The course emphasizes direct observation, iterative process, and critical reflection. Assignments progress from basic mark-making to sustained still-life compositions and figure study.

REQUIRED SUPPLIES (bring to every class)
- 18×24 inch newsprint pad (minimum 50 sheets)
- 18×24 inch drawing paper pad (white, 60 lb)
- Vine charcoal, assorted thickness (Nitram or General's)
- Compressed charcoal sticks (soft and medium)
- Graphite pencil set: 4H, 2H, HB, 2B, 4B, 6B
- Kneaded eraser and white vinyl eraser
- Drawing board (at least 18×24 inches) with bulldog clips
- Blending stumps/tortillons (assorted)
- Matte fixative spray (Krylon or equivalent)
- Portfolio case or large flat folder (18×24 minimum)
Supply list total estimated cost: $80–$120. Some supplies available in the Fine Arts supply room at reduced cost.

GRADING BREAKDOWN
- Final Portfolio: 40% (submitted Week 14)
- In-Class Projects (5 projects): 35% (7% each)
- Sketchbook: 15% (reviewed Weeks 5, 9, and 13)
- Critique Participation: 10% (3 formal critiques)
Total: 100%

Grading Scale: A 90–100 | B 80–89 | C 70–79 | D 60–69 | E below 60

IN-CLASS PROJECTS (35%)
Five graded projects are completed primarily in class with some outside work:
- Project 1 (Week 2): Contour and Gesture Studies — 7%
- Project 2 (Week 4): Value Scale and Tonal Drawing — 7%
- Project 3 (Week 6): Perspective Drawing — 7%
- Project 4 (Week 9): Figure Proportion Study — 7%
- Project 5 (Week 12): Sustained Still Life — 7%

SKETCHBOOK REQUIREMENT (15%)
Students must maintain an active process sketchbook throughout the semester. The sketchbook is separate from class projects — it is your visual journal and experimentation space. Minimum expectations:
- At least 4 pages of new work per week
- Work must relate to course themes (studies, experiments, observations, responses to readings)
- Sketchbooks are reviewed on Weeks 5, 9, and 13 for process and density
- Each review is worth 5% of the total grade
What counts: quick studies, observational sketches, compositional thumbnails, material experiments, written reflections with drawings. What does not count: finished artwork copied from Pinterest, traced photographs, or decoration unrelated to course content.

FINAL PORTFOLIO (40%)
The final portfolio is submitted in Week 14 and must contain:
1. All five in-class projects (revised if desired)
2. A minimum of 8 additional drawings selected by the student from sketchbook or independent work
3. One sustained observational drawing (minimum 18×24 inches) completed outside class
4. A one-page artist statement (typed, double-spaced) reflecting on your development this semester
Portfolios are presented and discussed in the final critique session (Week 14, both class meetings).

CRITIQUE SCHEDULE (10%)
Three formal group critiques are held during the semester:
- Critique 1: Week 5 (Project 1 and 2 work)
- Critique 2: Week 10 (Project 3 and 4 work)
- Critique 3: Week 14 (Final Portfolio)
Critique participation means: arriving with completed work, offering substantive verbal feedback to peers (minimum 2 comments per critique), and engaging with questions about your own work. Absent students receive 0 for that critique. Silent presence without verbal contribution receives partial credit (5/10 per critique).

ATTENDANCE POLICY
This is a studio course. Attendance is essential.
- 2 absences: No penalty (use these for illness)
- 3 absences: Final grade lowered by one letter grade
- 4 or more absences: Risk of course failure; instructor will contact the student
Arriving more than 15 minutes late counts as half an absence. Leaving before class ends counts as half an absence. There are no "excused" absences beyond the two built-in allowances. Contact the instructor proactively if a serious situation arises.

LATE PROJECT POLICY
In-class projects are due on the date announced. Late projects are penalized:
- 1 day late: 10% deducted
- 2 days late: 20% deducted
- 3 or more days late: 40% deducted, and instructor discretion applies
The final portfolio is accepted only during the Week 14 critique session. Portfolios not submitted during critique receive a 50% deduction and must be submitted by the end of finals week.

WEEKLY SCHEDULE
Week 1: Introduction; mark-making warm-ups; contour line basics; supply check
Week 2: Blind contour and gesture drawing; PROJECT 1 assigned and begun in class
Week 3: Value scale; tonal studies in graphite; introduction to charcoal; PROJECT 1 due
Week 4: Hatching, cross-hatching, blending; PROJECT 2 (value drawing) assigned and completed in class
Week 5: Atmospheric value and tone in charcoal; SKETCHBOOK REVIEW 1; CRITIQUE 1 (Projects 1–2)
Week 6: One-point perspective; architectural observation; PROJECT 3 assigned
Week 7: Two-point perspective; foreshortening; PROJECT 3 due
Week 8: Proportion systems; measuring with pencil; introduction to figure drawing
Week 9: Gesture and structural figure study; PROJECT 4 assigned and completed; SKETCHBOOK REVIEW 2
Week 10: Composition principles — rule of thirds, visual weight, negative space; CRITIQUE 2 (Projects 3–4)
Week 11: Still life setup and sustained observation; PROJECT 5 assigned
Week 12: PROJECT 5 sustained still life continued; studio work day
Week 13: Independent work on portfolio pieces; individual instructor meetings; SKETCHBOOK REVIEW 3
Week 14: FINAL PORTFOLIO DUE; CRITIQUE 3 (Portfolio) — both class sessions used for group critique
Finals Week: No additional meeting; final grades posted within 5 days

ACADEMIC INTEGRITY
All work submitted must be original and completed by the student. Submitting traced photographs, AI-generated imagery, or work completed by others is a violation of the UK Academic Integrity Policy and will result in a zero for the assignment and potential course failure. Reference images from photographs are permitted for observational drawing, but the drawn work must be your own.

STUDIO CONDUCT
- Respect shared studio space: clean up your materials, return chairs and easels
- No food near artwork or drawing tables
- Fixative spray must be used outdoors or in the ventilation area by the back door
- Photography of other students' work requires their permission`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Mark-Making and Line Quality',
        materialType: 'lecture',
        content: `MODULE 1: MARK-MAKING AND LINE QUALITY
Core Skill: Controlling the character and intention of every mark you make

THE EXPRESSIVE POTENTIAL OF LINE
Drawing is fundamentally a language of marks. Before learning to represent objects accurately, you must understand what kinds of marks your tools can make and how intention shapes those marks. A line can be hesitant or confident, slow or swift, heavy or weightless — each conveys different information to the viewer.

CONTOUR DRAWING
Contour drawing records the edges of forms. There are two types you will practice:
- Outline contour: traces only the outermost silhouette of an object
- Cross-contour: follows lines that move across the surface of an object, describing its three-dimensional structure (like the ridges of a fingerprint wrapping around a thumb)

The key discipline in contour drawing is slow, deliberate movement of the pencil that corresponds exactly with the movement of your eye along the edge. Speed destroys contour drawing. Your eye leads; your hand follows.

BLIND CONTOUR DRAWING
In blind contour, you look only at your subject — never at the paper — while drawing. The results are often "wrong" in a representational sense, but they train a crucial skill: truly looking. Most beginners draw from memory and assumption. Blind contour forces you to see what is actually there.

Instructions: Place a complex object (your hand, a shoe, crumpled fabric) in front of you. Set your pencil on the paper and begin to move it in response to every edge you observe in the object. Do not look down. Work for a minimum of 3 minutes per drawing. The image will be distorted — that is expected and correct.

GESTURE DRAWING
Where contour records edges, gesture drawing captures energy, movement, and the overall dynamic of a form in seconds. Gesture drawings are typically done very quickly (30 seconds to 2 minutes) using loose, flowing strokes that suggest the whole before describing the parts.

Gesture is the foundation of figure drawing. Professional animators and illustrators use gesture to establish the "line of action" — the spine of movement that runs through a figure — before adding any detail.

Key principles of gesture drawing:
- Work from the whole to the parts, never the reverse
- Use your whole arm, not just your wrist
- Keep the pencil moving; do not lift it to think
- Aim for proportion and energy, not detail

LINE WEIGHT AND VARIATION
Uniform line is dead line. Skilled drawings vary line weight to:
- Indicate depth (heavier lines in foreground, lighter in background)
- Show where light strikes an edge vs. where shadow falls
- Emphasize structure at load-bearing points (joints, corners)
- Create visual rhythm that guides the eye through the composition

Practice exercise: draw a simple object (coffee cup, stapler) five times in a row, each time varying which edges receive heavy versus light line weight. Compare the results.

DISCUSSION QUESTIONS
1. In your own drawing practice so far, do you tend to rush or go slowly? What does blind contour reveal about your habits?
2. What do you think makes a line feel "confident"? How would you describe the physical experience of drawing a hesitant line versus a committed one?
3. Look at a Käthe Kollwitz drawing and an Ellsworth Kelly contour study. How does each artist use line weight differently? What emotional quality does each achieve?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Value and Shading',
        materialType: 'lecture',
        content: `MODULE 2: VALUE AND SHADING
Core Skill: Creating the illusion of three-dimensional form using tonal range

WHAT IS VALUE?
Value refers to the lightness or darkness of a tone, independent of color. In drawing, value is the primary tool for creating the illusion of three-dimensional form on a two-dimensional surface. A complete drawing uses the full range of values from the white of the paper to the darkest dark your medium can achieve.

THE VALUE SCALE
Construct a ten-step value scale: pure white (0) through even increments to pure black (10). This exercise trains your eye to distinguish subtle tonal differences and your hand to produce them consistently. Most beginning drawers compress their values into the middle range (4–7), avoiding both the lightest lights and darkest darks. The result is muddy, flat drawings. Push your darks further than feels comfortable.

HATCHING TECHNIQUES
Hatching is the application of parallel lines to create value. Variations include:
- Hatching: parallel lines in one direction
- Cross-hatching: two or more overlapping layers of parallel lines at different angles
- Contour hatching: lines that follow the curve of a form (also called form hatching)
- Scribble/chaotic hatching: irregular marks used for texture and optical mixing

The density of hatching (how close together the lines are) controls value: more lines = darker. The angle and character of hatching marks simultaneously conveys texture and surface quality.

BLENDING
Blending with a tortillon (paper blending stump), finger, or chamois creates smooth gradients without visible hatching marks. Blending is effective for soft transitions — skin, clouds, smooth surfaces — but overuse produces a generic, slick look that erases the expressive quality of the medium. Good drawings often combine hatching and blending strategically.

LIGHT SOURCE AND FORM
When light strikes a three-dimensional form, it creates a predictable pattern of light and shadow:
- Highlight: the point of most direct illumination (lightest value)
- Midtone/form light: the area still receiving light but at an angle
- Core shadow: the darkest area, at the boundary of the form turning away from light
- Reflected light: a subtle lightening within the shadow, caused by light bouncing off surrounding surfaces
- Cast shadow: the shadow the object casts on the surface beneath it (typically the darkest value in the scene)

Understanding this structure lets you light any form convincingly. Practice with simple geometric forms — sphere, cube, cylinder, cone — before applying to complex subjects.

CHARCOAL AS A VALUE MEDIUM
Vine charcoal is ideal for value studies because it is easily erased and blended. Work from light to dark: begin with a light tone across the shadow areas, then build darks progressively. Use a kneaded eraser not just to correct mistakes but as a drawing tool — lifting charcoal to create highlights and soften edges.

DISCUSSION QUESTIONS
1. Why do beginning drawers tend to avoid the extreme ends of the value scale? What psychological or physical habit causes this?
2. What is the difference between a "lost edge" and a "found edge"? When might you deliberately lose an edge?
3. Look at a Rembrandt drawing. Where is the paper left completely white? Where is the darkest dark? What would be lost if the midtones were the lightest tones in the drawing?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Perspective',
        materialType: 'lecture',
        content: `MODULE 3: PERSPECTIVE
Core Skill: Constructing believable three-dimensional space on a flat surface

WHAT IS PERSPECTIVE?
Linear perspective is a system for depicting the way parallel lines appear to converge as they recede from the viewer. It was codified during the Italian Renaissance (Brunelleschi, Alberti, da Vinci) and remains the dominant spatial convention in Western representational drawing.

Key vocabulary:
- Horizon line (HL): the line at your eye level; determines whether you appear to look up, down, or across at the subject
- Vanishing point (VP): the point on the horizon line where parallel lines converge
- Picture plane: the imaginary flat surface through which you observe the scene

ONE-POINT PERSPECTIVE
Used when one face of an object is parallel to the picture plane. All depth lines converge to a single VP on the horizon line. Appropriate for: hallways, railway tracks, rooms viewed straight-on, city streets.

Steps for one-point drawing:
1. Draw the horizon line at a chosen height
2. Place one VP on the HL
3. Draw the front face of your object (a flat rectangle)
4. Draw lines from the corners of that face to the VP
5. Establish the back edge with a vertical line between the receding lines
6. Remove construction lines that would not be visible

TWO-POINT PERSPECTIVE
Used when an object is angled relative to the picture plane so no face is parallel to it. Two VPs on the horizon line control the two sets of receding edges. Appropriate for: most exterior architectural views, corner-on views of boxes and buildings.

Steps:
1. Draw the HL with two VPs (one toward each edge of the paper)
2. Draw the nearest vertical edge of the object
3. From the top and bottom of that edge, draw lines to both VPs
4. Establish width on each face with additional verticals between the receding planes
5. Add details (windows, doors) using the same VP lines

ATMOSPHERIC PERSPECTIVE
Also called aerial perspective: objects appear lighter, less detailed, and cooler in color as they recede from the viewer. This is caused by the accumulation of atmospheric particles (dust, moisture) between the viewer and distant objects. In drawing, atmospheric perspective is achieved by reducing line weight, decreasing value contrast, and softening edges in distant areas.

COMMON ERRORS
- Placing the horizon line outside the picture: it must be visible in the drawing to function
- Using VPs too close together: this distorts the perspective into a fish-eye effect; keep VPs toward the far edges of the paper or off the paper entirely
- Drawing from above the horizon without raising the VP appropriately
- Ignoring atmospheric perspective: foreground and background treated with identical line weight and detail creates a flat, cut-out appearance

FORESHORTENING
Foreshortening occurs when a form extends toward or away from the viewer, making it appear compressed along that axis. A pointing finger, a reclining figure, or a tilted cylinder all require foreshortening. The key is to observe and record what you see rather than what you know the object's true proportions to be.

DISCUSSION QUESTIONS
1. Renaissance artists invented linear perspective as a system. Is it a "true" or "natural" way of seeing, or is it a cultural convention? Can you think of visual traditions that use different spatial conventions?
2. Draw a chair in two-point perspective. What challenges does the curved back present?
3. Why does atmospheric perspective make distant objects appear blue-gray rather than simply pale?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Proportion and Figure Drawing',
        materialType: 'lecture',
        content: `MODULE 4: PROPORTION AND FIGURE DRAWING
Core Skill: Measuring and recording the proportional relationships of the human figure

WHY FIGURE DRAWING?
The human body is the most practiced subject in the history of Western drawing, not because of vanity but because it is the subject we know most intimately. Any distortion is immediately apparent. Figure drawing is an unforgiving teacher: errors you might overlook in a landscape are obvious in a face or hand. This makes it the most powerful training ground for observation skills.

STANDARD PROPORTIONS
The idealized adult figure is approximately 7.5 head-heights tall (fashion illustration uses 8–9; heroic figures in comics push 9–10). Key landmarks:
- Eye level: halfway down the head (not at the top of the forehead)
- Chin to crotch: approximately 3 head-heights
- Crotch to knee: approximately 2 head-heights
- Knee to floor: approximately 2 head-heights
- Elbow: at the level of the navel when arm hangs naturally
- Wrist: at the level of the crotch

These are averages — real figures vary. Use them as a starting framework, then correct by observation.

MEASURING WITH A PENCIL
Hold your pencil vertically at arm's length, fully extended. Close one eye. Align the top of the pencil with the top of the head. Slide your thumb to mark the bottom of the chin. This unit (one head) can now be carried down the body to count how many heads tall the figure is. The same method applies horizontally to compare widths.

Critical rule: always measure with your arm fully extended. Bending your elbow changes the scale of your measurement and invalidates all comparisons.

GESTURE AND STRUCTURE
Figure drawing combines two complementary approaches:
- Gesture: the energy, weight, and movement of the whole figure (drawn in seconds)
- Structure: the underlying geometry of the body (circles for joints, cylinders for limbs, ovals for ribcage and pelvis)

Professional figure drawers begin with gesture to establish the line of action — the dominant curve running from the head through the spine to the weight-bearing foot — then build structure around it. Students who start with structure (outlining the head, then the shoulders, etc.) often produce stiff, segmented figures.

THE LINE OF ACTION
Every dynamic figure has a primary curve or thrust that describes its movement and energy. A standing figure in contrapposto has a gentle S-curve through the spine. A running figure has a sharp diagonal lean. Drawing this line first, before any anatomy, ensures the figure will read as alive rather than assembled.

HANDS AND FEET
Hands and feet are the most common sites of avoidance in figure drawing — students simplify them into mittens or ignore detail because they are complex. Key: think of the hand as a rectangular block (the palm) with a fan of cylinders attached (the fingers). Draw the block first, then add fingers in proportion. The foot is a wedge viewed from above, a slight arch from the side.

DISCUSSION QUESTIONS
1. Why do figure drawings by beginners often look "stiff" even when the proportions are technically correct?
2. Consider Käthe Kollwitz's images of working-class figures versus classical academic nudes. How does each artist use the line of action differently?
3. How does observational figure drawing relate to medical illustration? What does each discipline prioritize?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Composition',
        materialType: 'lecture',
        content: `MODULE 5: COMPOSITION
Core Skill: Arranging visual elements within the picture plane for maximum effect

WHAT IS COMPOSITION?
Composition is the deliberate arrangement of visual elements — line, shape, value, texture, space — within the boundaries of your drawing. A drawing can render a subject flawlessly and still fail as a composition. Conversely, a loose, gestural drawing with a strong composition reads as more successful than a tight, detailed rendering with a weak one.

Composition is not decoration applied after drawing. It begins with the first mark and governs every decision thereafter.

THE RULE OF THIRDS
Divide your picture plane into a 3×3 grid. The four interior intersections (called "power points" or "crash points") are optically strong positions for your focal point. Centering your subject is not wrong, but it is static. Placing the focal point slightly off-center creates visual tension and invites the eye to move through the image.

Note: the rule of thirds is a guideline, not a law. Knowing it lets you break it intentionally.

VISUAL WEIGHT
Visual weight is the degree to which an element attracts the eye. Factors that increase visual weight:
- High value contrast (dark against light)
- Complexity or texture against simplicity
- Warm colors against cool (in color work)
- Size relative to surrounding elements
- Position near the center or at a power point
- Faces and human figures always carry high visual weight

A balanced composition distributes visual weight so no area is ignored and no area is so heavy that the composition feels like it might "tip." Balance does not mean symmetry. A large, quiet area can balance a small, complex one.

NEGATIVE SPACE
Negative space is the space around and between your subjects. Beginning drawers ignore it, focusing entirely on the object (positive space). Strong drawers treat negative space as a shape to be composed, not a background to fill in later. When drawing, alternately focus on positive and negative space. If the negative space shapes look awkward, the positive space probably has a proportional error.

CROPPING AND FRAMING
You do not have to show all of a subject. Cropping — cutting off part of the subject at the edge of the picture plane — creates energy and a sense of the world extending beyond the frame. Objects cropped at the edge are implied to continue; this can make a drawing feel more immediate and "present" than showing the complete isolated object.

Avoid tangencies: points where an edge of your subject just touches the edge of the frame or another element without overlapping. Tangencies look accidental and create visual tension the viewer cannot resolve.

DESIGNING THE EYE PATH
A composition should guide the viewer's eye through the image rather than letting it wander or settle in one place. Common strategies:
- Use diagonal lines to create movement
- Arrange elements in an implied triangle or curve
- Use value contrast to create stopping points (the eye rests at high-contrast areas)
- Point elements (arms, gazes, arrows) inward, not toward the edge

DISCUSSION QUESTIONS
1. Find two drawings or photographs with very different compositional approaches to the same subject. What does each choice communicate?
2. Is compositional "balance" always desirable? Can an unbalanced composition be the right choice? Give an example.
3. How does the shape of your paper (landscape vs. portrait vs. square) affect your compositional choices before you begin drawing?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Still Life and Observational Drawing',
        materialType: 'lecture',
        content: `MODULE 6: STILL LIFE AND OBSERVATIONAL DRAWING
Core Skill: Sustained attention and the translation of three-dimensional reality to two-dimensional drawing

THE HISTORY OF STILL LIFE AS A PRACTICE
Still life (from the Dutch stilleven) emerged as an independent genre in seventeenth-century Flemish and Dutch painting — Pieter Claesz, Willem Claesz. Heda, Rachel Ruysch. It was considered a "low" genre because it required no narrative or human figure, only the arrangement and rendering of objects. But this apparent limitation made it an ideal vehicle for studying light, surface texture, spatial recession, and formal composition.

In drawing education, still life has been the primary vehicle for observational training for centuries because the objects hold still, the light can be controlled, and the student can return to exactly the same setup across multiple sessions.

SETTING UP A STILL LIFE
A strong still life setup requires decision-making before drawing begins:
- Object selection: choose objects of varied scale, texture, and opacity (matte vs. reflective, opaque vs. translucent). A group of identical objects has less visual interest.
- Grouping: odd numbers of objects (3, 5) are typically more visually interesting than even numbers.
- Light source: a single strong directional light source (a lamp to one side) creates clear shadow patterns. Overhead fluorescent light flattens form. Consider turning off overhead lights.
- Viewing angle: try multiple angles before committing. Slightly above eye level shows the objects clearly; extreme above or below creates more dramatic spatial relationships.
- Drape and ground plane: a draped cloth beneath and behind objects unifies the setup and provides interesting folds to draw.

THE SUSTAINED DRAWING PROCESS
Unlike quick gesture exercises, a sustained observational drawing proceeds through phases:
1. Thumbnail planning: spend 5 minutes on small (2×3 inch) compositional sketches before touching the final paper.
2. Transfer: lightly indicate the major shapes and proportions on the final paper using a loose gestural approach. Do not commit to detail at this stage.
3. Measurement check: use pencil measurement to verify proportions and spatial relationships before adding any value or detail.
4. Value blocking: apply the major dark and midtone areas broadly, using the side of the charcoal or a wide hatching stroke.
5. Refinement: work progressively toward detail, moving between areas of the drawing rather than finishing one object before moving to the next.
6. Editing: step back frequently (at least every 15 minutes) and look at the whole drawing. Identify the weakest area and attend to it.

TEXTURE RENDERING
Different surfaces require different drawing approaches:
- Rough textures (brick, burlap): irregular hatching, varied pressure, use of the side of the charcoal
- Smooth surfaces (glass, metal): strong value contrast, crisp edges, clear highlights
- Translucent surfaces (glass, plastic): show what is visible through the object as well as reflections on its surface; value is complex and layered
- Organic textures (fruit skin, fabric): observe the actual surface pattern rather than applying a generic "texture"

DISCUSSION QUESTIONS
1. Morandi painted essentially the same bottles and jugs his entire career. What could sustained attention to the same subjects reveal over a lifetime?
2. What is the relationship between "looking" and "seeing" in observational drawing? Do they mean the same thing?
3. A still life is inherently artificial — objects arranged by the artist. Does this affect how you read a still life compared to, say, a street photograph? How does the artist's arrangement function as an argument about those objects?`,
      },
      {
        moduleNumber: 8,
        title: 'Final Portfolio Rubric',
        materialType: 'rubric',
        content: `DRAWING I — FINAL PORTFOLIO RUBRIC
ART 101 | Spring 2026 | Worth 40% of Final Grade

The Final Portfolio is evaluated across four criteria. Each criterion is scored out of 25 points, for a total of 100 portfolio points, which converts to 40% of the course grade.

─────────────────────────────────────────────────
CRITERION 1: TECHNICAL SKILL IN DRAWING
Weight: 25 points

Evaluates control of media, line quality, value range, and accurate observation across all submitted work.

25–23 pts (Excellent): Consistent control of chosen media throughout the portfolio. Line quality varies intentionally to describe form and depth. Value range spans the full scale from light to dark with clear structure (highlight, form light, core shadow, reflected light, cast shadow). Proportions and spatial relationships are accurate and credible. Evidence of real improvement from Project 1 to the final sustained drawing.

22–19 pts (Proficient): Good media control with minor inconsistencies. Value range is present but may compress slightly (avoiding extreme lights or darks in some pieces). Proportions mostly accurate; spatial relationships generally convincing. Some evidence of growth across the semester.

18–15 pts (Developing): Inconsistent media control; some drawings show command, others appear rushed or uncertain. Value range restricted to the midtones; little evidence of intentional highlights or deep darks. Proportional errors present but do not destroy the overall reading. Limited evidence of skill development.

14–0 pts (Beginning): Media poorly controlled throughout. Line is uniform or scratchy without intention. Value range flat; the drawing relies on outline rather than tonal structure to describe form. Significant proportional distortions that undermine credibility.

─────────────────────────────────────────────────
CRITERION 2: COMPOSITIONAL AWARENESS
Weight: 25 points

Evaluates the arrangement of elements within the picture plane, use of the full format, and evidence of compositional decision-making.

25–23 pts: Compositions are clearly designed, not accidental. Focal point is placed with intention. Negative space is treated as a shape, not an afterthought. No tangencies at edges. The portfolio as a whole demonstrates variety in compositional approaches. Artist statement addresses at least one compositional decision specifically.

22–19 pts: Most compositions are thoughtfully arranged. Some reliance on centering or symmetry, but with awareness. Negative space not always considered as a designed element. Artist statement mentions composition in general terms.

18–15 pts: Compositions appear largely unreflective — subjects centered, full object shown, negative space ignored. Some works "work" compositionally by accident. Artist statement does not address composition.

14–0 pts: No evidence of compositional intent. Subjects arbitrarily placed. Edges and negative space ignored. Work appears to have begun without planning.

─────────────────────────────────────────────────
CRITERION 3: CONCEPT DEVELOPMENT AND ARTIST STATEMENT
Weight: 25 points

Evaluates the quality of the artist statement and the evidence of conceptual growth reflected across the portfolio selection.

25–23 pts: Artist statement is specific, reflective, and shows genuine self-assessment. Student identifies at least one technical challenge encountered and how they responded. The selection of portfolio pieces reflects curatorial thinking — the student has chosen work that together represents a coherent artistic development, not simply the "highest-graded" pieces. Sketchbook and portfolio work show authentic exploration.

22–19 pts: Artist statement is thoughtful but general. Some evidence of self-assessment. Portfolio selection shows some curatorial intent. Sketchbook supports the portfolio pieces.

18–15 pts: Artist statement is brief or generic ("I learned a lot about drawing"). Portfolio selection appears random or includes all required pieces without further curation. Limited connection between statement and the actual work.

14–0 pts: Artist statement is absent, extremely brief (under 100 words), or dishonest (describes growth not evident in the work). Portfolio feels assembled hastily without regard for the whole.

─────────────────────────────────────────────────
CRITERION 4: PROCESS SKETCHBOOK
Weight: 25 points

Evaluates the depth, density, and authenticity of the process sketchbook submitted as part of the portfolio. (Combines all three sketchbook review checkpoints.)

25–23 pts: Sketchbook is dense (far exceeds minimum 4 pages/week), genuinely exploratory, and shows the student taking risks — trying things that don't work, reflecting on why, and changing approach. Evidence of responding to course readings or critiques in the sketchbook. Work is clearly produced throughout the semester, not compressed near checkpoints.

22–19 pts: Sketchbook meets the minimum page requirement consistently. Some genuine exploration present alongside more mechanical studies. Work appears to be produced throughout the semester with some compression near checkpoints.

18–15 pts: Sketchbook meets minimum page count but work is thin — many pages are quick, thoughtless, or clearly produced the night before a checkpoint. Exploration minimal; most pages repeat already-practiced exercises without extending them.

14–0 pts: Sketchbook is substantially below the minimum page count, or work is clearly fabricated shortly before checkpoint dates, or the sketchbook was not submitted with the portfolio.

─────────────────────────────────────────────────
STUDIO ATTENDANCE IMPACT
Students with 3 or more absences: final portfolio grade is reduced by one letter grade (10 points) regardless of work quality, per the course attendance policy stated in the syllabus.

FINAL PORTFOLIO SUBMISSION
All work must be submitted in person during the Week 14 critique session. Work submitted after the critique session begins receives a 50% deduction.`,
      },
    ],
  },

  // ─── COM-601-STARTER ────────────────────────────────────────────────────────
  {
    courseCode: 'COM-601-STARTER',
    title: 'Gross Anatomy',
    description: 'A first-year medical school course covering the gross anatomy of the human body through cadaveric dissection, prosection study, and written examination, with emphasis on clinical correlations throughout.',
    college: 'College of Medicine',
    semester: 'Fall 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `GROSS ANATOMY — COM 601
College of Medicine | Fall 2026 | M1 Year | 8 Credit Hours
Lecture: MWF 8:00–9:30 AM | MS Building, Lecture Hall A
Cadaver Lab: Tu/Th 8:00 AM–12:00 PM | MS Building, Anatomy Suite (Room 210)

COURSE DIRECTOR
Dr. Sarah Kwan, MD, PhD
Office: MS Building 318 | Office Hours: Mondays 1:00–3:00 PM or by appointment
Email: s.kwan@uky.edu | Anatomy Suite extension: x4421

COURSE OVERVIEW
Gross Anatomy is the systematic study of the three-dimensional structure of the human body, undertaken through cadaveric dissection and prosection, supported by lecture and atlas-based study. The course is organized regionally: Thorax, Abdomen and Pelvis, Upper Extremity, Lower Extremity, Head and Neck, and Back and Spinal Cord. Clinical correlations are integrated throughout each region. This course prepares students for the physical examination, surgical reasoning, radiologic anatomy, and the structural foundations required for clinical medicine.

REQUIRED MATERIALS
- Gray's Anatomy for Students, 4th Edition (Drake, Vogl, Mitchell) — Elsevier. Available in UK Health Sciences Library.
- Netter's Atlas of Human Anatomy, 8th Edition — Elsevier. Students may use the digital version.
- Grant's Dissector, 17th Edition — Wolters Kluwer. Used directly in the cadaver lab.
- Anatomy coloring book (optional but recommended): Kaplan Medical Anatomy Coloring Book

GRADING BREAKDOWN
- Lab Practicals (3 practicals): 40% total
  - Practical 1 (Thorax + Abdomen): 14%
  - Practical 2 (Extremities): 13%
  - Practical 3 (Head, Neck, Back): 13%
- Written Examinations (3 exams): 40% total
  - Exam 1 (Thorax + Abdomen): ~14%
  - Exam 2 (Extremities): ~13%
  - Exam 3 (Head, Neck, Back): ~13%
- Professionalism: 20%
  - Cadaver lab conduct, preparedness, peer evaluation, lab safety compliance
Total: 100%

MINIMUM PASSING SCORE
A minimum score of 70% is required in each examination category (Lab Practicals and Written Exams) to pass the course. Students who fail to meet the 70% minimum in either category at the end of the course are referred for remediation.

REMEDIATION POLICY
Students who score below 70% on a single exam or practical are placed on academic monitoring and must meet with the course director within 5 business days. A remediation plan is developed with the student. Students who end the course with a category average below 70% must complete a comprehensive remediation examination. Passing the remediation exam at 75% or above results in a final course grade of 70% (Pass). Failing the remediation exam results in referral to the Academic Progress Committee.

WRITTEN EXAMINATIONS
Three written exams correspond to the three regional blocks. Format:
- 100 questions per exam
- Multiple choice (single best answer): 70 questions
- Extended matching: 20 questions (clinical vignette-based)
- Labeling (radiograph or cross-section identification): 10 questions
Exams are taken via ExamSoft. No paper materials permitted. Calculator not needed. Exam dates:
- Exam 1: Week 5 (Friday afternoon, 1:00–4:00 PM)
- Exam 2: Week 10 (Friday afternoon, 1:00–4:00 PM)
- Exam 3: Week 15 (Finals week — date TBA)

LAB PRACTICAL FORMAT
Lab practicals are conducted in the cadaver suite. Students rotate through stations, spending 2 minutes at each station before moving to the next. Each station presents:
- A tagged structure on a prosected cadaver (student identifies the structure and states its clinical significance)
- OR a radiograph/CT/MRI cross-section (student identifies labeled structure)
- OR a clinical question paired with an anatomical specimen
Each practical has 40 stations (40 points each = possible 40 × 2.5 = 100 points). Students may not return to previous stations. No reference materials permitted.

Number of required dissections: Students participate in a minimum of 20 structured dissection sessions (2 per week across 10 lab weeks). Attendance at all dissection sessions is required; absences must be approved by the course director in advance.

ANATOMY ATLAS REQUIREMENT
The required atlas is Netter's Atlas of Human Anatomy, 8th Edition. Students must bring their atlas (print or digital on tablet) to every lab session. Quizzes may draw from any Netter's plate covered in the assigned readings.

CADAVER LAB DECORUM POLICY
The cadaver laboratory is a place of respect, learning, and professional formation. Students are required to:
- Treat the cadaver and all remains with dignity at all times; no photographing of cadavers
- Wear full PPE at all times in the lab: gloves, lab coat, and eye protection
- No food, drink, or mobile devices in active use during lab; emergency calls only in the corridor
- Identify only structures within the assigned dissection region; do not explore ahead of schedule
- Report any accidental injury (needle stick, sharps exposure) immediately to the supervising faculty
- Cover cadavers fully at the end of every session and return instruments cleaned to the tray
Violations of the decorum policy result in immediate removal from the session (counted as absent) and a professionalism deduction of up to 10 points per incident. Repeated violations are referred to the Office of Student Affairs.

DISSECTION GROUPS
Students are assigned to dissection groups of 4–5 students by the course director. Groups rotate the roles of Primary Dissector, Assistant Dissector, and Atlas Reader each session. Group assignments are posted on the course Blackboard site by the first day of class.

PROFESSIONALISM ASSESSMENT (20%)
Professionalism is assessed through:
- Attendance and preparedness for each lab session (read the dissector and atlas plates before arriving): 10%
- Peer professionalism evaluation (completed at mid-term and end of semester): 5%
- Faculty and TA observation during lab: 5%

WEEKLY SCHEDULE
Week 1: Anatomical Terminology; Body Planes and Regions; Intro to the Cadaver Lab
Week 2: Thorax — Surface Anatomy; Thoracic Wall; Intercostal Spaces and Nerves
Week 3: Thorax — Heart and Pericardium; Coronary Vessels; Mediastinum
Week 4: Thorax — Lungs, Pleura, and Trachea; Great Vessels; Thoracic Inlet
Week 5: Abdomen — Anterior Abdominal Wall; Inguinal Region | EXAM 1 (Friday)
Week 6: Abdomen — GI Tract: Stomach, Small and Large Intestine; Mesenteries
Week 7: Abdomen — Liver, Gallbladder, Pancreas, Spleen; Portal System
Week 8: Pelvis — Pelvic Floor; Bladder; Reproductive Organs; Perineum
Week 9: Upper Extremity — Bones, Joints, Brachial Plexus; Shoulder and Arm | LAB PRACTICAL 1
Week 10: Upper Extremity — Forearm and Hand; Elbow and Wrist Joints | EXAM 2 (Friday)
Week 11: Lower Extremity — Hip Joint; Thigh Compartments; Femoral Triangle
Week 12: Lower Extremity — Knee Anatomy; Leg and Foot; Lumbosacral Plexus | LAB PRACTICAL 2
Week 13: Head — Cranium and Brain; Cranial Nerves; Orbit and Eye
Week 14: Head and Neck — Face, Scalp; Cervical Fascia; Larynx; Pharynx
Week 15: Back — Vertebral Column; Spinal Cord; Spinal Nerves | LAB PRACTICAL 3 | EXAM 3 (Finals Week)`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Anatomical Terminology and Body Planes',
        materialType: 'lecture',
        content: `MODULE 1: ANATOMICAL TERMINOLOGY AND BODY PLANES
Core Skill: Using precise directional language to locate and describe structures unambiguously

THE ANATOMICAL POSITION
All anatomical descriptions assume the body in anatomical position: standing upright, feet together, arms at the sides with palms facing forward. Without this convention, directional terms are ambiguous — "the thumb is lateral" is only meaningful if we know whether the palm faces forward or backward. Anatomical position standardizes communication across disciplines and across languages.

DIRECTIONAL TERMS
- Superior / Inferior: toward the head (cranial) / toward the feet (caudal)
- Anterior / Posterior: toward the front (ventral) / toward the back (dorsal)
- Medial / Lateral: toward the midline / away from the midline
- Proximal / Distal: closer to the origin or attachment / farther from it (used for limbs and vessels)
- Superficial / Deep: toward the surface / toward the interior
- Ipsilateral / Contralateral: on the same side / on the opposite side

Clinical application: A cardiac surgeon notes that the right coronary artery is visible in the anterior atrioventricular groove, is inferior to the pulmonary trunk, and supplies the posterior interventricular septum via the posterior descending artery. Every word here is a directional term.

BODY PLANES
- Sagittal plane: divides the body into left and right portions. The midsagittal (median) plane divides equally; parasagittal planes are any sagittal plane offset from the midline.
- Coronal (frontal) plane: divides the body into anterior and posterior portions. Relevant in imaging (coronal MRI of the brain, chest X-ray posteroanterior view).
- Transverse (axial, horizontal) plane: divides the body into superior and inferior portions. CT scans display anatomy in transverse cross-sections.

BODY REGIONS
The body is divided into axial (head, neck, thorax, abdomen, pelvis, back) and appendicular (upper and lower limbs) regions. Anatomical surface regions use standardized terms for precise clinical documentation:
- Thorax: sternal, pectoral, axillary, scapular, vertebral, infrascapular regions
- Abdomen: nine regions created by two horizontal and two vertical planes — right/left hypochondriac, epigastric, right/left lumbar (lateral), umbilical, right/left iliac (inguinal), hypogastric (pubic). Alternatively described by four quadrants (RUQ, LUQ, RLQ, LLQ).

BODY CAVITIES
- Thoracic cavity: bounded by thoracic cage; contains lungs, heart, great vessels, trachea, esophagus; subdivided into right and left pleural cavities and the mediastinum
- Abdominopelvic cavity: bounded by abdominal wall and pelvic floor; contains GI tract, solid organs, and pelvic organs; subdivided into abdominal cavity (peritoneal cavity and retroperitoneum) and pelvic cavity
- Dorsal cavities: cranial cavity (brain) and vertebral canal (spinal cord)

CLINICAL IMAGING AND ANATOMY
Modern clinical anatomy is inseparable from radiologic imaging. Key modalities:
- Plain radiograph (X-ray): excellent for bone and lung; poor for soft tissue
- CT (computed tomography): cross-sectional; excellent for bone and solid organs; uses ionizing radiation
- MRI (magnetic resonance imaging): excellent soft tissue contrast; no radiation; slower than CT
- Ultrasound: real-time; no radiation; operator-dependent; excellent for fluid, vessels, fetus
- Angiography: images vessels via contrast injection; used for coronary, cerebral, peripheral vasculature

Anatomy students must be able to identify major structures on basic imaging as well as on cadaveric specimens. Lab practical questions routinely include labeled CT slices and plain films.

DISCUSSION QUESTIONS
1. Why does anatomical position specify palms facing forward? What confusion would arise if it did not?
2. A patient presents with pain in the right iliac region. What organs or structures are located there?
3. On a transverse CT section at the level of the umbilicus (L3–L4 vertebral level), which major organs or structures should you expect to see?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Thorax',
        materialType: 'lecture',
        content: `MODULE 2: THORAX
Core Skill: Identifying the structures of the thoracic cavity and their clinical relationships

THORACIC WALL
The thoracic cage (12 pairs of ribs, 12 thoracic vertebrae, sternum) protects the heart and lungs and provides the mechanical framework for respiration. Key structural features:
- True ribs (1–7): articulate directly with the sternum via costal cartilage
- False ribs (8–10): costal cartilage joins the cartilage of rib 7
- Floating ribs (11–12): no anterior articulation
- Intercostal spaces: contain the intercostal vein, artery, and nerve (VAN, superior to inferior) running in the costal groove on the inferior border of each rib. Clinical significance: intercostal nerve block needle should pass just above the inferior rib's superior border to avoid the neurovascular bundle.

THE HEART AND PERICARDIUM
The heart lies in the middle mediastinum, within the fibrous and serous pericardium. The serous pericardium has parietal (lining the fibrous sac) and visceral (epicardium) layers, with a small amount of serous fluid between them. Cardiac tamponade occurs when fluid accumulates under pressure, compressing the heart and reducing cardiac output.

Coronary arteries:
- Right coronary artery (RCA): arises from the right aortic sinus; supplies the right atrium, right ventricle, SA node (60% of individuals), AV node (80%), and via the posterior descending artery (PDA) the posterior interventricular septum.
- Left coronary artery (LCA): arises from the left aortic sinus; divides into the left anterior descending (LAD) — supplies the anterior interventricular septum and anterior wall of the left ventricle — and the left circumflex artery (LCx) — supplies the posterior left ventricle and lateral wall.
Right coronary dominance (PDA from RCA) occurs in ~70% of people. Left dominance in ~10%. Co-dominance ~20%.

Clinical correlation: MI involving the LAD ("widow-maker") affects the anterior wall and interventricular septum, producing anterior ST elevation on ECG leads V1–V4.

GREAT VESSELS AND MEDIASTINUM
The mediastinum is divided into:
- Superior mediastinum: trachea, esophagus, aortic arch and branches (brachiocephalic trunk → right subclavian + right common carotid; left common carotid; left subclavian), superior vena cava, thoracic duct, vagus and phrenic nerves
- Anterior mediastinum: thymus (involuted in adults), connective tissue
- Middle mediastinum: heart, pericardium, roots of great vessels
- Posterior mediastinum: esophagus, descending aorta, azygos system, thoracic duct, sympathetic trunk

THE LUNGS AND PLEURA
Each lung is surrounded by two pleural layers (visceral and parietal pleura) with a potential space between them — the pleural cavity. Pneumothorax occurs when air enters this space, causing lung collapse. Tension pneumothorax is a clinical emergency: positive-pressure air in the pleural space shifts the mediastinum and compresses the contralateral lung and great veins.

Lung anatomy:
- Right lung: 3 lobes (upper, middle, lower), 10 bronchopulmonary segments, horizontal and oblique fissures
- Left lung: 2 lobes (upper, lower), 8 bronchopulmonary segments, oblique fissure; lingula is the inferior portion of the upper lobe

DISCUSSION QUESTIONS
1. A patient presents with a right tension pneumothorax. In which direction will the trachea deviate on exam? Why?
2. Describe the path of blood from the right atrium to the aorta, naming every structure it passes through.
3. Why does coronary artery disease affecting the RCA typically cause inferior wall MI (leads II, III, aVF) whereas LAD disease causes anterior MI?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Abdomen and Pelvis',
        materialType: 'lecture',
        content: `MODULE 3: ABDOMEN AND PELVIS
Core Skill: Identifying the organs, vessels, and neural structures of the abdominopelvic cavity

ABDOMINAL WALL
The anterolateral abdominal wall has three muscular layers (analogous to the intercostal layers): external oblique (fingers point inferiorly), internal oblique (fingers point superiorly), and transverse abdominis (fibers run horizontally). Their aponeuroses form the rectus sheath, which encloses the rectus abdominis. The inguinal canal transmits the spermatic cord in males (round ligament in females) and is bounded by the inguinal ligament inferiorly.

PERITONEUM AND RETROPERITONEUM
- Intraperitoneal organs: almost completely covered by visceral peritoneum. Include: stomach, most of the small intestine (jejunum, ileum), spleen, liver (mostly), ovaries.
- Retroperitoneal organs: located posterior to the peritoneum, covered only anteriorly. "SAD PUCKER": Suprarenal glands, Aorta/IVC, Duodenum (2nd–4th parts), Pancreas, Ureters, Colon (ascending and descending), Kidneys, Esophagus (abdominal), Rectum.

GI TRACT
- Stomach: in the left upper quadrant (LUQ); supplied by branches of the celiac trunk (left gastric, splenic, common hepatic arteries). Vagus nerves provide parasympathetic innervation.
- Small intestine: duodenum (retroperitoneal, C-shaped, contains ampulla of Vater where bile and pancreatic juice enter), jejunum (longer vasa recta, more prominent plicae circulares), ileum (shorter vasa recta, Peyer's patches, ileal lymphoid tissue). Supplied by the superior mesenteric artery (SMA).
- Large intestine: ascending colon (retroperitoneal), transverse colon (intraperitoneal), descending colon (retroperitoneal), sigmoid colon (intraperitoneal), rectum (retroperitoneal). SMA supplies proximal two-thirds (to splenic flexure); inferior mesenteric artery (IMA) supplies the remainder.

LIVER, GALLBLADDER, AND PORTAL SYSTEM
The liver receives dual blood supply: hepatic artery (oxygenated) and portal vein (nutrient-rich, from GI tract). The portal vein is formed by the junction of the splenic vein and superior mesenteric vein posterior to the pancreatic neck.

Bile pathway: liver → right/left hepatic ducts → common hepatic duct → cystic duct from gallbladder joins → common bile duct → ampulla of Vater → duodenum.

KIDNEYS AND URETERS
The kidneys lie in the retroperitoneum at T12–L3 (right kidney slightly lower due to the liver). The renal artery arises directly from the aorta. The ureter descends retroperitoneally, crossing the pelvic brim anterior to the bifurcation of the common iliac artery. Three sites of ureteric narrowing (relevant for kidney stone impaction): ureteropelvic junction, crossing the iliac vessels, ureterovesical junction.

PELVIC ORGANS
- Bladder: lies in the retropubic space (space of Retzius)
- Prostate (male): inferior to bladder, surrounds urethra; posteriorly palpable on DRE
- Uterus (female): anteverted and anteflexed in most women; supported by broad, round, cardinal, and uterosacral ligaments
- Ovaries: suspended by the ovarian ligament (to uterus) and suspensory ligament (to pelvic wall, contains ovarian vessels)

DISCUSSION QUESTIONS
1. During surgery, a ureter is inadvertently ligated. What complications arise, and at what anatomical location is injury most likely?
2. What is the clinical significance of portosystemic anastomoses in a patient with liver cirrhosis and portal hypertension?
3. Why is the appendix found at McBurney's point? What is the anatomical basis for referred pain to the umbilical region in early appendicitis?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Upper Extremity',
        materialType: 'lecture',
        content: `MODULE 4: UPPER EXTREMITY
Core Skill: Identifying the bones, muscles, nerves, and vessels of the upper limb and correlating with common clinical injuries

BONES AND JOINTS
The upper extremity skeleton: clavicle, scapula, humerus, radius, ulna, 8 carpal bones (proximal row: scaphoid, lunate, triquetrum, pisiform; distal row: trapezium, trapezoid, capitate, hamate), 5 metacarpals, 14 phalanges.

Key joints:
- Glenohumeral (shoulder): ball-and-socket; most mobile joint in the body; stability from rotator cuff muscles rather than bony congruence
- Elbow: hinge joint; humeroulnar articulation; carrying angle ~15° valgus; medial epicondyle palpable (cubital tunnel for ulnar nerve)
- Wrist: radiocarpal joint (radius + scaphoid/lunate); most wrist motion occurs here

BRACHIAL PLEXUS
Roots: C5–T1 (ventral rami). Organization: Roots → Trunks (upper C5–6, middle C7, lower C8–T1) → Divisions (anterior and posterior) → Cords (lateral, medial, posterior) → Branches.

Major terminal branches and their roots:
- Musculocutaneous (C5–6): flexes elbow (biceps, coracobrachialis, brachialis); sensory to lateral forearm
- Median (C6–T1): "hand of benediction" injury pattern; innervates most forearm flexors and thenar muscles; LOAF muscles of the hand (Lumbicals 1&2, Opponens pollicis, Abductor pollicis brevis, Flexor pollicis brevis); sensory to lateral 3.5 digits
- Ulnar (C8–T1): most intrinsic hand muscles; Froment's sign; claw hand (ring and little); sensory to medial 1.5 digits
- Radial (C5–T1): all extensors of arm and forearm; wrist drop if damaged in axilla or midshaft humeral fracture; sensory to posterior arm/forearm and dorsal lateral hand
- Axillary (C5–6): deltoid and teres minor; sensation over "regimental badge" area; injured in anterior shoulder dislocation

ROTATOR CUFF
The rotator cuff stabilizes the glenohumeral joint and initiates abduction: SITS muscles —
- Supraspinatus: initiates first 15° abduction; most commonly torn
- Infraspinatus: external rotation
- Teres minor: external rotation
- Subscapularis: internal rotation; the only anterior rotator cuff muscle

VASCULAR SUPPLY
Subclavian artery → axillary artery (at lateral border of rib 1) → brachial artery (divided by deep brachial which wraps the humerus in the spiral groove with the radial nerve) → at the cubital fossa: radial and ulnar arteries. The radial pulse is palpated at the wrist lateral to the flexor carpi radialis tendon.

DISCUSSION QUESTIONS
1. A patient with a fractured midshaft humerus presents with inability to extend the wrist and fingers. Which nerve is injured? Why is it vulnerable at this location?
2. Describe the clinical presentation of carpal tunnel syndrome. What structures pass through the carpal tunnel, and which is compressed?
3. A patient presents with clawing of the ring and little fingers and a positive Froment's sign. Which nerve is injured? What muscle is tested by Froment's sign?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Lower Extremity',
        materialType: 'lecture',
        content: `MODULE 5: LOWER EXTREMITY
Core Skill: Identifying the bones, muscles, nerves, and vessels of the lower limb and their clinical significance

BONES AND JOINTS
Lower extremity skeleton: hip bone (ilium, ischium, pubis), femur, patella, tibia, fibula, 7 tarsals (calcaneus, talus, navicular, cuboid, 3 cuneiforms), 5 metatarsals, 14 phalanges.

Key joints:
- Hip (coxofemoral): ball-and-socket; stable from bony congruence and strong ligaments; fractures common in elderly (femoral neck, intertrochanteric)
- Knee: largest joint in the body; complex hinge with some rotation; stabilized by ACL, PCL, MCL, LCL, and menisci; common sports injury site
- Ankle (talocrural): hinge; tibia and fibula form the mortise around the talus; lateral ankle sprains are the most common sports injury (anterior talofibular ligament first to tear)

LUMBOSACRAL PLEXUS
The lumbosacral plexus (L1–S3) innervates the lower extremity.

Femoral nerve (L2–L4): innervates quadriceps (knee extension) and sartorius; sensory to anterior thigh and medial leg (saphenous nerve). Injured in femoral triangle procedures or pelvic fractures.

Obturator nerve (L2–L4): adductor compartment of the thigh; sensory to medial thigh. Obturator hernia may compress it.

Sciatic nerve (L4–S3): the largest nerve in the body; exits the greater sciatic foramen inferior to piriformis; divides into common fibular and tibial nerves at the popliteal fossa.
- Tibial nerve: posterior compartment of leg; plantarflexion, toe flexion; sensory to the sole (medial and lateral plantar nerves)
- Common fibular (peroneal) nerve: wraps around the fibular neck (vulnerable to compression/fracture); divides into superficial fibular (eversion) and deep fibular (dorsiflexion). Injury: foot drop + inability to evert.

KNEE ANATOMY
Stabilizers of the knee:
- ACL (anterior cruciate ligament): resists anterior tibial translation; torn in pivot/deceleration injuries; positive Lachman's and anterior drawer tests
- PCL (posterior cruciate ligament): resists posterior tibial translation; positive posterior drawer; torn in dashboard injuries
- MCL (medial collateral ligament): resists valgus stress; torn by lateral blow to knee
- LCL (lateral collateral ligament): resists varus stress; less commonly torn
- Medial meniscus: C-shaped, attached to MCL — more commonly torn than lateral; pain on McMurray's test

FEMORAL TRIANGLE
Boundaries: inguinal ligament (superior), sartorius (lateral), adductor longus (medial). Contents (medial to lateral: NAVEL — Nerve, Artery, Vein, Empty space, Lymphatics).

VASCULAR SUPPLY
External iliac artery → femoral artery (at inguinal ligament) → popliteal artery (at adductor hiatus) → anterior tibial artery (passes through interosseous membrane) and tibioperoneal trunk → posterior tibial and fibular arteries. The posterior tibial pulse is palpated behind the medial malleolus; the dorsalis pedis pulse is on the dorsum of the foot.

DISCUSSION QUESTIONS
1. A patient with a fibular neck fracture presents with foot drop. Which two motions are lost? What muscles are responsible for each?
2. Describe the "unhappy triad" (O'Donoghue's triad) of knee injury. Which forces cause it?
3. A femoral artery catheterization is performed in the femoral triangle. The femoral nerve lies lateral to the artery. What complications could arise from needle placement that is too lateral? Too medial?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Head and Neck',
        materialType: 'lecture',
        content: `MODULE 6: HEAD AND NECK
Core Skill: Identifying the cranial nerves, head and neck structures, and their clinical correlations

THE CRANIAL NERVES (12 pairs)
Cranial nerves (CN) arise from the brain and brain stem. Mnemonics: "Oh Oh Oh To Touch And Feel Very Good Velvet. Ah Heaven!" (CN I–XII).

CN I — Olfactory: smell; damaged in anterior skull base fractures (anosmia)
CN II — Optic: vision; carries visual field from retina to lateral geniculate; optic chiasm decussation of nasal fibers
CN III — Oculomotor: most EOM (SR, IR, MR, IO), levator palpebrae, pupillary constriction and accommodation; CN III palsy → "down and out" eye, ptosis, dilated pupil
CN IV — Trochlear: superior oblique (SO); "SO4, LR6, rest 3"; SO depresses and intorts; palsy → vertical diplopia, head tilt
CN V — Trigeminal: sensation to face (three divisions: ophthalmic V1, maxillary V2, mandibular V3); motor to muscles of mastication (V3); trigeminal neuralgia
CN VI — Abducens: lateral rectus (abduction); long intracranial course → frequently injured in raised ICP
CN VII — Facial: muscles of facial expression (motor); taste to anterior 2/3 tongue; lacrimation and salivation (parasympathetic); Bell's palsy = LMN lesion (entire ipsilateral face droops); UMN lesion spares the forehead (bilateral cortical representation)
CN VIII — Vestibulocochlear: hearing (cochlear) and balance (vestibular)
CN IX — Glossopharyngeal: taste/sensation posterior 1/3 tongue; gag reflex afferent; parotid gland (parasympathetic via lesser petrosal nerve)
CN X — Vagus: parasympathetic to thoracic and abdominal viscera; recurrent laryngeal nerve (voice); gag reflex efferent
CN XI — Accessory: sternocleidomastoid and trapezius
CN XII — Hypoglossal: tongue movement; LMN lesion → tongue deviates toward the lesion

CERVICAL FASCIA
Deep cervical fascia organizes the neck into compartments:
- Pretracheal fascia: surrounds trachea and thyroid; infections here can spread to the mediastinum
- Prevertebral fascia: surrounds vertebral column and prevertebral muscles; retropharyngeal abscess forms between pretracheal and prevertebral layers
- Carotid sheath: contains common carotid artery, internal jugular vein, vagus nerve (CN X)

LARYNX
The larynx is the voice-producing organ. Key cartilages: thyroid (Adam's apple), cricoid (only complete ring), paired arytenoids (move vocal cords). Vocal cord abduction (breathing) and adduction (phonation) are controlled by intrinsic laryngeal muscles, all innervated by the recurrent laryngeal nerve (branch of CN X) — except the cricothyroid (external branch of the superior laryngeal nerve).
Bilateral RLN injury: aphonia and respiratory distress (cords adduct, obstructing airway). Surgical risk during thyroidectomy.

PARANASAL SINUSES
Four pairs of sinuses drain into the nasal cavity: maxillary (drains superiorly — poor drainage; most commonly infected), frontal, ethmoid (anterior to middle meatus, posterior to superior meatus), sphenoid (to sphenoethmoidal recess). Sinusitis commonly follows upper respiratory infections.

DISCUSSION QUESTIONS
1. A patient presents with ptosis, a constricted pupil, and anhidrosis on the right side of the face. What syndrome is this, and what anatomical pathway is affected?
2. Why does a Bell's palsy affect the entire ipsilateral face whereas a stroke-related facial weakness spares the forehead? Describe the anatomical reason.
3. During thyroidectomy, the recurrent laryngeal nerve is damaged bilaterally. Describe the immediate clinical consequences for breathing and voice.`,
      },
      {
        moduleNumber: 8,
        title: 'Lab Practical Rubric',
        materialType: 'rubric',
        content: `GROSS ANATOMY — LAB PRACTICAL RUBRIC
COM 601 | College of Medicine | Fall 2026

Lab Practicals evaluate the ability to identify anatomical structures on prosected cadavers, radiographs, CT/MRI slices, and clinical specimens under timed conditions. This rubric describes the performance expectations for each station type.

PRACTICAL FORMAT
- 40 stations per practical
- 2 minutes per station
- Students may not return to previous stations
- No reference materials permitted
- Total: 100 points (2.5 points per station)

─────────────────────────────────────────────────
STATION TYPE 1: CADAVERIC STRUCTURE IDENTIFICATION
(Tag on a prosected cadaver specimen; student must identify the tagged structure)

Full Credit — 2.5 pts:
Correct identification of the tagged structure using the full anatomical name (e.g., "left anterior descending artery" not just "coronary artery"). If clinical significance is asked, provides a correct and specific clinical correlation (e.g., "LAD occlusion causes anterior wall MI").

Partial Credit — 1.5 pts:
Correct general identification but incorrect laterality, incorrect specific name (correct organ system but wrong specific structure), OR correct structure name but absent/incorrect clinical significance when asked.

No Credit — 0 pts:
Incorrect structure identified, or no answer written.

─────────────────────────────────────────────────
STATION TYPE 2: IMAGING IDENTIFICATION
(Plain radiograph, CT axial section, or MRI image with labeled arrow; student identifies the labeled structure)

Full Credit — 2.5 pts:
Correct identification of the labeled structure, including laterality where applicable. Demonstrates ability to translate cadaveric knowledge to imaging plane (e.g., correctly identifies the aortic arch on a PA chest radiograph, or the psoas muscle on an axial CT at L4).

Partial Credit — 1.5 pts:
Names the correct organ system or general region but not the specific structure (e.g., "kidney" when the label indicates "left renal vein"). OR correct structure named but incorrect side.

No Credit — 0 pts:
Incorrect structure identified or no answer.

─────────────────────────────────────────────────
STATION TYPE 3: CLINICAL CORRELATION QUESTION
(Brief clinical scenario paired with a specimen or image; student answers a specific anatomical question)

Example: "This patient fractured the midshaft humerus. A tagged nerve is shown in the spiral groove. Name the nerve and state the motor deficit."

Full Credit — 2.5 pts:
Correct nerve/structure named AND correct functional deficit or clinical consequence stated. Answer is specific (e.g., "radial nerve — wrist drop and loss of finger extension" rather than "arm paralysis").

Partial Credit — 1.5 pts:
Correct structure named but clinical consequence incorrect or absent. OR correct clinical consequence stated but incorrect structure.

No Credit — 0 pts:
Incorrect on both elements, or no answer.

─────────────────────────────────────────────────
OVERALL PRACTICAL PERFORMANCE BENCHMARKS

90–100 pts: Excellent. Consistent identification of structures across all regions with accurate anatomical terminology and clinical correlations. Demonstrates integrated understanding.

80–89 pts: Proficient. Correct identification on most stations. Occasional errors in laterality, specific naming, or clinical correlations. Sufficient for clinical progression.

70–79 pts: Passing (minimum acceptable). Identification correct on approximately two-thirds of stations. Some gaps in specific naming or clinical application.

Below 70 pts: Refer to remediation. See syllabus remediation policy. Student must meet with course director within 5 business days.

─────────────────────────────────────────────────
PRACTICAL CONDUCT EXPECTATIONS
- Students must complete their answer in writing at each station before the signal to rotate
- Quiet must be maintained throughout the practical; speaking to other students during the practical results in invalidation of the station
- All cadaver decorum policies apply during the practical
- Station cards are collected by proctors; students may not photograph or copy station materials`,
      },
    ],
  },

  // ─── PHR-601-STARTER ────────────────────────────────────────────────────────
  {
    courseCode: 'PHR-601-STARTER',
    title: 'Pharmaceutical Sciences I',
    description: 'A first-year pharmacy school course covering drug nomenclature, pharmacokinetics, pharmacodynamics, drug formulations, drug interactions, and pharmaceutical calculations, with integrated OSCE training in patient counseling.',
    college: 'College of Pharmacy',
    semester: 'Fall 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `PHARMACEUTICAL SCIENCES I — PHR 601
College of Pharmacy | Fall 2026 | P1 Year | 4 Credit Hours
Lecture: MWF 9:00–10:00 AM | Pharmacy Building, Room 101
Lab: Th 1:00–3:00 PM | Pharmacy Skills Lab, Room 215

COURSE COORDINATOR
Dr. Marcus Reid, PharmD, PhD
Office: Pharmacy Building 312 | Office Hours: Tuesdays 1:00–3:00 PM or by appointment
Email: m.reid@uky.edu

COURSE OVERVIEW
Pharmaceutical Sciences I introduces the foundational principles of pharmacology and pharmaceutical science for first-year pharmacy students. The course covers drug nomenclature, pharmacokinetics (ADME), pharmacodynamics, drug formulations and bioavailability, drug interactions, and pharmaceutical calculations including weight-based dosing and renal dosing adjustments. Patient counseling skills are developed through weekly OSCE (Objective Structured Clinical Examination) laboratory sessions. This course provides the mechanistic foundation required for all subsequent pharmacotherapy courses.

REQUIRED MATERIALS
- Pharmacology for the Health Care Professions, 3rd Edition (Colbert, Woodrow) — Pearson
- Applied Biopharmaceutics and Pharmacokinetics, 7th Edition (Shargel, Wu-Pong, Yu) — McGraw-Hill (selected chapters)
- UK College of Pharmacy Student Handbook (digital, posted on Canvas)
- Scientific calculator (non-programmable); smartphones and graphing calculators not permitted during exams

GRADING BREAKDOWN
- Examinations (3 exams): 60% total
  - Exam 1 (Nomenclature + PK): 20%
  - Exam 2 (PD + Formulations + Interactions): 20%
  - Exam 3 (Calculations + Integrated Review): 20%
- OSCEs (Objective Structured Clinical Examinations): 25% total
  - OSCE 1 (Week 6): 8%
  - OSCE 2 (Week 10): 8%
  - OSCE 3 (Week 14): 9%
- Laboratory Participation and Quizzes: 15% total
  - Lab quizzes (10 quizzes × 1% each): 10%
  - Lab participation and professionalism: 5%
Total: 100%

MINIMUM PASSING SCORE
A minimum score of 70% (cumulative weighted average) is required to pass this course. Students earning below 70% are not eligible to progress to PHR 602 and are referred to the Academic Progress Committee.

EXAMINATION FORMAT
Each examination consists of 80 multiple-choice questions (single best answer). Exams are taken via ExamSoft on student laptops. No reference materials permitted. The non-programmable calculator is permitted for Exam 3 (calculations section). Exam dates:
- Exam 1: Week 5, Friday, 9:00 AM–10:30 AM
- Exam 2: Week 10, Friday, 9:00 AM–10:30 AM
- Exam 3: Week 15 (Finals week, date TBA)

OSCE FORMAT AND ATTEMPT POLICY
OSCEs are 10-minute individual patient counseling encounters in the skills lab. Each OSCE uses a standardized patient (trained actor or faculty evaluator) presenting a specific drug-therapy scenario. Students are evaluated on: greeting and establishing rapport, assessing the patient's prior knowledge, advising on drug use (dose, administration, side effects, storage), verifying understanding (teach-back), and appropriate documentation or referral.

OSCE attempt policy: Each student receives up to 2 attempts per OSCE. If the student fails the first attempt (score below 70%), a remediation plan is developed with the OSCE coordinator. The second attempt is scheduled within 5 business days. Failing the second attempt triggers referral to the Academic Progress Committee and may result in a course grade of Incomplete pending committee action. Students cannot advance in the OSCE series until the preceding OSCE is passed.

WHITE COAT AND PROFESSIONALISM POLICY
Students must wear their white coat (clean and pressed, name badge visible) to all laboratory sessions and OSCE encounters. Students without their white coat are asked to obtain one before participating; tardiness resulting from this is documented. Cell phone use during lab is prohibited except for approved reference applications on an approved device list.

CALCULATOR POLICY
A non-programmable scientific calculator is required for laboratory sessions and is permitted during Exam 3. Prohibited calculators: programmable calculators, graphing calculators, smartphones, or any device with wireless connectivity. Violation results in exam invalidation for that student.

WEEKLY SCHEDULE
Week 1: Drug Nomenclature — generic, brand, chemical names; drug classification systems; FDA naming rules
Week 2: Pharmacokinetics — Absorption: routes of administration, first-pass effect, bioavailability
Week 3: Pharmacokinetics — Distribution: Vd, protein binding, blood-brain barrier, placenta
Week 4: Pharmacokinetics — Metabolism: CYP450 system, Phase I and II reactions, induction/inhibition
Week 5: Pharmacokinetics — Excretion: renal clearance, half-life, accumulation | EXAM 1 (Friday)
Week 6: Pharmacodynamics — Receptor theory: agonists, antagonists, partial agonists | OSCE 1
Week 7: Pharmacodynamics — Dose-response curves, therapeutic index, therapeutic window
Week 8: Drug Formulations — tablets, capsules, solutions, suspensions, transdermal patches, bioavailability differences
Week 9: Drug Interactions — pharmacokinetic interactions (CYP-mediated, protein binding displacement)
Week 10: Drug Interactions — pharmacodynamic interactions; clinical significance; monitoring | EXAM 2 (Friday)
Week 11: Pharmaceutical Calculations — weight-based dosing (mg/kg); pediatric dosing
Week 12: Calculations — renal dosing adjustments: GFR, CrCl (Cockcroft-Gault), dose reduction
Week 13: Calculations — IV calculations: drip rates, infusion concentrations, total daily doses | OSCE 2
Week 14: Integrated review; case-based pharmacotherapy application | OSCE 3
Week 15: Exam 3 (Finals week)`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Drug Nomenclature',
        materialType: 'lecture',
        content: `MODULE 1: DRUG NOMENCLATURE
Core Skill: Identifying and distinguishing generic, brand, and chemical drug names and understanding drug classification systems

WHY NOMENCLATURE MATTERS
A single drug may be known by three names simultaneously in clinical practice. Confusion between names has contributed to medication errors. Pharmacists are the last line of defense in catching these errors, which requires fluency in all naming systems.

THE THREE-NAME SYSTEM
Every approved drug has three names:

1. Chemical name: The full systematic IUPAC name describing the molecular structure. Example: acetaminophen's chemical name is N-(4-hydroxyphenyl)acetamide. Chemical names are used in research and manufacturing but rarely in clinical practice.

2. Generic name (nonproprietary name): A standardized shorter name assigned by the United States Adopted Names (USAN) Council and coordinated internationally with the International Nonproprietary Name (INN) system (WHO). Generic names are not capitalized and are not trademarked. Example: acetaminophen (US) / paracetamol (UK/international).

3. Brand name (proprietary name): The trademark name assigned by the pharmaceutical company. Capitalized and protected by trademark law. Multiple brand names can exist for the same generic drug as different companies market their products. Examples: acetaminophen → Tylenol, Panadol. Brand-name drugs cost significantly more than generics; substitution is governed by state pharmacy practice acts.

USAN STEM SYSTEM
The USAN Council uses standardized stems — suffixes and prefixes — that encode pharmacological class. Pharmacists use stems to identify drug class and mechanism from the name alone.

Common stems and their classes:
- -olol: beta-blockers (propranolol, metoprolol, atenolol)
- -pril: ACE inhibitors (lisinopril, enalapril, captopril)
- -sartan: ARBs (losartan, valsartan, irbesartan)
- -statin: HMG-CoA reductase inhibitors (atorvastatin, simvastatin, rosuvastatin)
- -mab: monoclonal antibodies (adalimumab, bevacizumab, nivolumab)
- -prazole: proton pump inhibitors (omeprazole, lansoprazole, pantoprazole)
- -cillin: penicillin-class antibiotics (amoxicillin, ampicillin, nafcillin)
- -cycline: tetracycline-class antibiotics (doxycycline, minocycline)
- -floxacin: fluoroquinolone antibiotics (ciprofloxacin, levofloxacin)
- -vir: antivirals (acyclovir, oseltamivir, remdesivir)

DRUG CLASSIFICATION SYSTEMS
Drugs are classified along multiple axes simultaneously:
- By therapeutic use: antihypertensives, antibiotics, analgesics, anticoagulants, etc.
- By mechanism of action: beta-blockers, ACE inhibitors, receptor agonists, enzyme inhibitors
- By chemical/structural class: benzodiazepines, opioids, fluoroquinolones
- By FDA Controlled Substance Schedule (I–V): indicates abuse potential and prescribing restrictions

CONTROLLED SUBSTANCE SCHEDULES
- Schedule I: High abuse potential, no accepted medical use (heroin, LSD, marijuana federally)
- Schedule II: High abuse potential, accepted medical use, severe psychological/physical dependence (morphine, oxycodone, fentanyl, cocaine, methylphenidate)
- Schedule III: Moderate dependence potential (buprenorphine, ketamine, anabolic steroids)
- Schedule IV: Low dependence potential (benzodiazepines, tramadol, zolpidem)
- Schedule V: Lowest abuse potential, some OTC products (cough preparations with codeine)

DISCUSSION QUESTIONS
1. A patient brings in a prescription for "Norvasc." Before dispensing, what is the generic name, the drug class (by stem), and one caution you should counsel about?
2. Why does the FDA require generic drugs to demonstrate bioequivalence to the brand-name drug rather than just chemical identity?
3. A drug name ends in "-mab-u-mab." Based on the monoclonal antibody naming convention, what does the "-u-" indicate about its origin?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Pharmacokinetics (ADME)',
        materialType: 'lecture',
        content: `MODULE 2: PHARMACOKINETICS — ADME
Core Skill: Understanding what the body does to a drug (absorption, distribution, metabolism, excretion)

WHAT IS PHARMACOKINETICS?
Pharmacokinetics (PK) describes the time course of drug concentration in the body. It answers: How much drug reaches systemic circulation? Where does it go? How is it broken down? How quickly is it removed? PK parameters determine dosing regimens — how much drug to give and how often.

ABSORPTION
Absorption is the movement of drug from the administration site into systemic circulation. Key factors:
- Route of administration: IV (100% bioavailability, immediate onset) vs. oral (absorbed through GI mucosa, subject to first-pass effect) vs. sublingual (bypasses first-pass) vs. transdermal (slow, sustained)
- First-pass effect (presystemic metabolism): drugs absorbed orally pass through the portal circulation and are metabolized by the liver before reaching systemic circulation. Drugs with high first-pass effect (e.g., nitroglycerin, morphine, lidocaine) require higher oral doses or alternative routes.
- Bioavailability (F): the fraction of administered drug that reaches systemic circulation unchanged. IV F = 1.0 (100%). Oral F varies by drug.

DISTRIBUTION
Distribution is the movement of drug from the bloodstream into body tissues. Key concepts:
- Volume of distribution (Vd): a theoretical volume reflecting how widely a drug distributes. Small Vd (1–10 L) = confined to plasma (e.g., warfarin, heavily protein-bound). Large Vd (100s of liters) = extensively distributed into tissues (e.g., amiodarone, chloroquine).
- Protein binding: drugs bind reversibly to plasma proteins (mainly albumin). Only free (unbound) drug is pharmacologically active and available for distribution, metabolism, and excretion. Hypoalbuminemia increases free drug concentration.
- Blood-brain barrier (BBB): tight junctions between brain capillary endothelial cells limit CNS entry. Lipophilic drugs cross more readily; P-glycoprotein actively pumps certain drugs out.
- Placental transfer: most drugs cross the placenta to some degree; molecular weight, protein binding, and lipophilicity determine extent.

METABOLISM
Metabolism (biotransformation) primarily occurs in the liver, converting lipophilic drugs to more water-soluble metabolites for excretion. Two phases:
- Phase I reactions: oxidation, reduction, hydrolysis. Primarily mediated by the cytochrome P450 (CYP) enzyme system (CYP3A4 metabolizes ~50% of drugs). Phase I products may be active, inactive, or toxic.
- Phase II reactions: conjugation (glucuronidation, sulfation, acetylation). Generally produce inactive, highly water-soluble conjugates excreted in urine or bile.

CYP450 interactions are clinically critical: enzyme inhibitors (e.g., fluconazole inhibits CYP3A4) increase drug levels; enzyme inducers (e.g., rifampin induces CYP3A4) decrease drug levels.

EXCRETION
The kidney is the primary excretion route for most drugs and their metabolites. Renal excretion involves:
- Glomerular filtration: free (unbound) drug is filtered at the glomerulus
- Tubular secretion: active transport of drug into the tubular lumen (OAT/OCT transporters)
- Tubular reabsorption: passive reabsorption of lipophilic or ionized-appropriate drugs

Half-life (t½): time for plasma drug concentration to decrease by 50%. t½ = 0.693 × Vd / CL. After 4–5 half-lives, ~97% of a drug is eliminated (steady-state is reached after 4–5 half-lives of repeated dosing).

DISCUSSION QUESTIONS
1. Nitroglycerin is given sublingually for acute angina. Why is the oral route ineffective for this drug?
2. A patient with severe liver disease is prescribed diazepam. How would you expect liver disease to alter the drug's half-life and dose requirement?
3. A patient is on warfarin (protein-bound drug) and starts a new drug that displaces warfarin from protein binding. What happens to warfarin's free concentration, and what is the clinical risk?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Pharmacodynamics',
        materialType: 'lecture',
        content: `MODULE 3: PHARMACODYNAMICS
Core Skill: Understanding what a drug does to the body — receptor interactions, dose-response relationships, and the therapeutic index

WHAT IS PHARMACODYNAMICS?
Pharmacodynamics (PD) describes the relationship between drug concentration at the site of action and the pharmacological effect produced. If pharmacokinetics is "what the body does to the drug," pharmacodynamics is "what the drug does to the body." Together, PK and PD govern drug efficacy and toxicity.

RECEPTOR THEORY
Most drugs produce effects by binding to specific receptors — proteins (or occasionally DNA, enzymes, or ion channels) that recognize the drug's structure and translate binding into a cellular response.

Types of drug-receptor interactions:
- Agonist: binds to a receptor and activates it, producing a response. Full agonists produce the maximum possible response (Emax) for that receptor.
- Partial agonist: binds and activates the receptor but cannot achieve full Emax even at saturation. In the presence of a full agonist, a partial agonist acts as a competitive antagonist (e.g., buprenorphine at opioid receptors).
- Antagonist: binds to a receptor but does not activate it; blocks access of agonists.
  - Competitive antagonist: competes reversibly with agonist for the same binding site; effect can be overcome by increasing agonist concentration (shifts dose-response curve right, no change in Emax).
  - Non-competitive antagonist: binds irreversibly or at an allosteric site; reduces Emax regardless of agonist concentration.
- Inverse agonist: binds the receptor and produces an effect opposite to the endogenous agonist.

DOSE-RESPONSE RELATIONSHIPS
The dose-response (concentration-effect) curve is typically sigmoidal on a log scale:
- Threshold: minimum dose producing a measurable effect
- EC50: concentration producing 50% of maximum effect — a measure of potency. A drug with a lower EC50 is more potent.
- Emax: maximum effect attainable — a measure of efficacy.
- Potency and efficacy are independent: a highly potent drug may have low efficacy and vice versa.

THERAPEUTIC INDEX
The therapeutic index (TI) quantifies the margin of safety between efficacy and toxicity:
TI = TD50 / ED50 (where TD50 is the dose toxic in 50% of the population and ED50 is the dose effective in 50%)
A high TI means there is a wide margin between effective and toxic doses (e.g., penicillin). A narrow TI means small deviations from the therapeutic dose can cause toxicity (e.g., warfarin, digoxin, lithium, aminoglycosides, phenytoin).

Narrow TI drugs require therapeutic drug monitoring (TDM): routine measurement of plasma drug concentrations to ensure the patient remains within the therapeutic window (the range between the minimum effective concentration and the minimum toxic concentration).

TOLERANCE AND TACHYPHYLAXIS
- Tolerance: progressive decrease in response to repeated doses of a drug. Mechanisms: receptor downregulation, enzyme induction, compensatory physiological adaptation.
- Tachyphylaxis: rapid tolerance developing within hours of the first dose (e.g., nitrate tolerance with continuous nitroglycerin use).
- Dependence: altered physiological state that requires drug presence to maintain normal function; withdrawal symptoms occur on abrupt discontinuation.

DISCUSSION QUESTIONS
1. Morphine and buprenorphine both activate opioid receptors. Why is buprenorphine used for opioid use disorder treatment, and what receptor property makes it useful?
2. A patient on warfarin starts rifampin. Warfarin has a narrow therapeutic index and rifampin is a strong CYP inducer. Predict the change in warfarin effect and the clinical risk.
3. Why do patients on long-term nitrate therapy for angina often develop tolerance, and why is a "nitrate-free interval" recommended?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Drug Formulations',
        materialType: 'lecture',
        content: `MODULE 4: DRUG FORMULATIONS
Core Skill: Understanding how drug formulation affects delivery, onset, and bioavailability

WHAT IS A DRUG FORMULATION?
Drug formulation is the process by which the active pharmaceutical ingredient (API) is combined with excipients (inactive ingredients) to create a deliverable dosage form. The formulation affects: rate of absorption, site of delivery, stability, patient adherence, and bioavailability.

SOLID ORAL DOSAGE FORMS
Tablets: compressed solid formulations. Subtypes include:
- Immediate-release (IR): disintegrates rapidly, peak plasma concentration in 1–2 hours
- Extended-release (ER, XR, XL): matrix or membrane controls drug release over 12–24 hours; reduces dosing frequency and peak-trough fluctuation
- Enteric-coated: coating resists gastric acid, dissolves in small intestine; protects acid-labile drugs (omeprazole) or gastric mucosa (enteric-coated aspirin)
- Sublingual/buccal tablets: absorbed directly into oral mucosa vasculature; bypasses first-pass effect; rapid onset (nitroglycerin SL)
- Orally disintegrating tablets (ODT): dissolve on the tongue; useful for patients with dysphagia

Capsules: gelatin shells containing powder, granules, or liquids. Hard-shell capsules (fill with powder); soft-gel capsules (liquid fill, lipophilic drugs — e.g., cyclosporine, vitamin D).

LIQUID FORMULATIONS
- Solution: drug fully dissolved; fastest absorption among oral liquids; easier dose adjustment for pediatric/geriatric patients
- Suspension: drug particles dispersed (not dissolved); must be shaken before use; less bioavailable than solution
- Emulsion: oil-in-water or water-in-oil dispersion; used for lipophilic drugs and IV nutrition
- Elixir: sweetened, hydroalcoholic solution (contains alcohol); should be avoided in patients on metronidazole or disulfiram

PARENTERAL FORMULATIONS
- Intravenous (IV): direct injection into bloodstream; 100% bioavailability; immediate onset; requires sterility
- Intramuscular (IM): depot effect; absorption rate depends on blood flow to muscle; useful for long-acting formulations (haloperidol decanoate, contraceptive depot medroxyprogesterone)
- Subcutaneous (SC): slower absorption than IM; used for insulin, heparin, vaccines
- Intrathecal: into cerebrospinal fluid; bypasses the BBB; used for chemotherapy, antibiotics

TOPICAL AND TRANSDERMAL FORMULATIONS
- Topical creams/ointments: local effect; ointments are more occlusive and increase absorption
- Transdermal patches: slow, sustained systemic delivery through skin; bypasses first-pass effect; requires lipophilic drug; examples: fentanyl patches, nicotine patches, estradiol patches

BIOAVAILABILITY CONSIDERATIONS
The formulation directly affects the rate and extent of absorption. Generic drug approval requires demonstration of bioequivalence to the reference listed drug (RLD): the 90% confidence interval for the generic's AUC and Cmax must fall within 80–125% of the RLD. For narrow TI drugs, additional bioequivalence studies are required.

DISCUSSION QUESTIONS
1. A patient is prescribed metoprolol tartrate (immediate-release) twice daily. The pharmacist substitutes metoprolol succinate (extended-release) once daily. Are these bioequivalent? What counseling is needed?
2. Why can a fentanyl transdermal patch not be used for acute pain management?
3. A patient with severe dysphagia cannot swallow tablets. List three alternative formulation strategies that could be used, noting any bioavailability differences.`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Drug Interactions',
        materialType: 'lecture',
        content: `MODULE 5: DRUG INTERACTIONS
Core Skill: Identifying, classifying, and managing clinically significant drug interactions

WHAT IS A DRUG INTERACTION?
A drug interaction occurs when the presence of one substance (drug, food, supplement, or disease state) alters the effect of another drug. Interactions can increase drug effect (leading to toxicity) or decrease it (leading to therapeutic failure). As polypharmacy increases with age and comorbidities, drug interaction checking is a core pharmacist competency.

PHARMACOKINETIC INTERACTIONS
Pharmacokinetic interactions occur when one drug alters the ADME of another:

Absorption interactions:
- Chelation: divalent cations (calcium, magnesium, iron, aluminum in antacids) bind to fluoroquinolones and tetracyclines, forming insoluble chelates that are not absorbed. Solution: separate doses by 2 hours.
- pH effects: antacids elevate gastric pH, reducing absorption of drugs requiring acid dissolution (ketoconazole, atazanavir)
- GI motility: metoclopramide accelerates gastric emptying, altering absorption of other drugs

Metabolism interactions (most common and clinically significant):
- CYP3A4 inhibitors (e.g., fluconazole, clarithromycin, grapefruit juice): inhibit metabolism of substrates → increased drug levels → toxicity risk. Example: fluconazole + simvastatin → myopathy/rhabdomyolysis.
- CYP3A4 inducers (e.g., rifampin, carbamazepine, St. John's wort): accelerate metabolism of substrates → reduced drug levels → therapeutic failure. Example: rifampin + oral contraceptives → contraceptive failure.
- CYP2C9 inhibitors affect warfarin (a CYP2C9 substrate) — narrow TI drug; interactions are high-stakes.

Excretion interactions:
- Competition for renal tubular secretion: probenecid inhibits renal secretion of penicillin and methotrexate, increasing their plasma levels
- pH-dependent reabsorption: alkalinizing urine (sodium bicarbonate) increases elimination of acidic drugs (aspirin in overdose)

PHARMACODYNAMIC INTERACTIONS
Pharmacodynamic interactions occur when two drugs affect the same physiological system:
- Additive effects: two drugs with similar actions sum to a greater-than-individual effect. Example: two antihypertensives → greater blood pressure reduction.
- Synergism: combined effect greater than additive. Example: beta-lactam + aminoglycoside for gram-negative bacteremia.
- Antagonism: one drug opposes the effect of another. Example: naloxone reverses opioid effects (pharmacodynamic antagonism).
- Additive toxicity: two QT-prolonging drugs together increase risk of torsades de pointes arrhythmia.

CLINICAL SIGNIFICANCE CLASSIFICATION
Drug interaction databases (Lexicomp, Micromedex, Clinical Pharmacology) classify interactions by severity:
- Contraindicated: do not use together
- Major: life-threatening or permanent damage possible; avoid unless benefits outweigh risks
- Moderate: may require dose adjustment or monitoring
- Minor: limited clinical significance; typically no action required

MONITORING STRATEGIES
For patients on interacting drug combinations that cannot be avoided:
- Increase monitoring frequency (more frequent INR checks for warfarin interactions)
- Adjust doses prospectively based on known interaction magnitude
- Educate patients on signs and symptoms of toxicity (e.g., signs of bleeding for warfarin, muscle pain for statin interactions)
- Consider alternative agents that do not share the interaction pathway

DISCUSSION QUESTIONS
1. A patient on warfarin begins a course of fluconazole for a fungal infection. Predict the direction and mechanism of the interaction. What monitoring and dosing action should the pharmacist take?
2. St. John's wort is a CYP3A4 inducer. A patient taking it as a supplement is also on cyclosporine after a kidney transplant. What is the clinical risk, and why is this interaction potentially catastrophic?
3. Two CNS depressants (benzodiazepine + opioid) are prescribed together. What type of interaction is this? What patient counseling is essential?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Calculations and Dosing',
        materialType: 'lecture',
        content: `MODULE 6: PHARMACEUTICAL CALCULATIONS AND DOSING
Core Skill: Accurately calculating drug doses including weight-based dosing, renal adjustments, and IV calculations

THE IMPORTANCE OF ACCURATE CALCULATIONS
Dosing errors are among the most preventable causes of medication-related harm. Pharmacists verify every dose for every patient. A ten-fold calculation error can mean the difference between a therapeutic dose and a lethal overdose. Calculation competency is non-negotiable.

WEIGHT-BASED DOSING
Many drugs are dosed based on the patient's body weight (mg/kg or mcg/kg) to account for differences in volume of distribution and clearance.

Example: Amoxicillin 25 mg/kg/day divided every 8 hours for a 22 kg child.
Daily dose = 25 × 22 = 550 mg/day
Per-dose = 550 / 3 = 183.3 mg → round to 187.5 mg (available as 125 mg/5 mL or 250 mg/5 mL suspension)

For obese patients: use adjusted body weight (ABW) for many drugs, as dosing on total body weight may produce toxic levels. ABW = IBW + 0.4(TBW – IBW). Some drugs (e.g., aminoglycosides) use a specific "dosing weight" rather than actual body weight.

RENAL DOSING ADJUSTMENTS
Many drugs are eliminated primarily by the kidney. As renal function declines, drug accumulates unless the dose is adjusted. Renal function is estimated using creatinine clearance (CrCl) via the Cockcroft-Gault equation:

CrCl (mL/min) = [(140 – Age) × Weight(kg)] / [72 × Serum Creatinine(mg/dL)]
Multiply by 0.85 for female patients.

Example: 70-year-old female, 60 kg, SCr 1.4 mg/dL
CrCl = [(140-70) × 60] / [72 × 1.4] × 0.85 = [70 × 60] / 100.8 × 0.85 = 4200 / 100.8 × 0.85 ≈ 35.4 mL/min

Dose adjustment by CrCl for common drugs:
- Vancomycin: dose interval extended as CrCl falls
- Metformin: contraindicated if CrCl < 30 mL/min (risk of lactic acidosis)
- Gabapentin: dose reduced in stages as CrCl falls below 60, 30, 15 mL/min
- Penicillin: high doses require adjustment if CrCl < 10 mL/min

IV CALCULATIONS
Drip rate (mL/hr): most IV pumps use mL/hr programming.
Rate = Total volume (mL) / Infusion time (hours)

Example: Infuse 1000 mL NS over 8 hours → Rate = 1000/8 = 125 mL/hr

Concentration-based infusions (e.g., dopamine, heparin, insulin drips):
Express concentration as mcg/mL or units/mL, then calculate volume per hour needed to deliver the desired dose rate.

Example: Dopamine ordered at 5 mcg/kg/min for a 70 kg patient. Bag: 400 mg dopamine in 250 mL D5W.
Concentration = 400 mg / 250 mL = 1.6 mg/mL = 1600 mcg/mL
Dose needed = 5 mcg/kg/min × 70 kg = 350 mcg/min = 21,000 mcg/hr
Rate = 21,000 / 1600 = 13.1 mL/hr

DISCUSSION QUESTIONS
1. A pharmacist receives an order for "gentamicin 2 mg/kg IV q8h" for a 78-year-old, 55 kg female with SCr 1.8 mg/dL. Before verifying the order, what renal function concern must be addressed?
2. A pediatric patient weighs 15 kg. Amoxicillin-clavulanate is ordered at 45 mg/kg/day of the amoxicillin component divided every 12 hours. The available suspension is 400 mg/5 mL. What volume is given per dose?
3. A continuous heparin infusion is ordered at 1,000 units/hr. The bag contains 25,000 units in 250 mL NS. At what rate (mL/hr) should the pump be set?`,
      },
      {
        moduleNumber: 8,
        title: 'OSCE Rubric — Patient Counseling',
        materialType: 'rubric',
        content: `PHARMACEUTICAL SCIENCES I — OSCE RUBRIC
PHR 601 | College of Pharmacy | Fall 2026
Objective Structured Clinical Examination: Patient Counseling

Each OSCE is a 10-minute individual encounter with a standardized patient. The encounter is recorded and reviewed by two evaluators. Each criterion is scored independently by each evaluator; scores are averaged.

─────────────────────────────────────────────────
CRITERION 1: GREET AND ESTABLISH RAPPORT
Weight: 10 points

10–9 pts: Student introduces themselves with full name and role ("Hi, I'm [Name], a pharmacy student. I'll be helping you with your medication today."). Maintains appropriate eye contact. Uses patient's preferred name after confirming. Warm, professional tone throughout.

8–7 pts: Introduction present but incomplete (missing role or name). Eye contact inconsistent. Professional tone maintained.

6–5 pts: Greeting minimal or formulaic. Limited eye contact. Some professional lapses (interrupting, standing over the patient, etc.).

4–0 pts: No introduction. Fails to establish rapport. Begins counseling without greeting.

─────────────────────────────────────────────────
CRITERION 2: ASSESS PRIOR KNOWLEDGE
Weight: 15 points

15–14 pts: Asks an open-ended "prime question" before providing any information (e.g., "What has your doctor told you about this medication?" or "What do you already know about this drug?"). Uses the patient's response to tailor subsequent counseling. Does not repeat what the patient already knows.

13–11 pts: Asks a prior-knowledge question but it is closed-ended or leading. Makes partial use of the response to guide counseling.

10–8 pts: Asks about medication history (allergies, other drugs) but not prior knowledge of this specific drug.

7–0 pts: No assessment of prior knowledge. Begins didactic delivery without checking baseline.

─────────────────────────────────────────────────
CRITERION 3: ADVISE — DRUG USE, DOSE, AND SIDE EFFECTS
Weight: 35 points

35–32 pts: Covers all three mandatory elements completely and accurately: (1) how to take the drug (dose, route, timing, food interactions), (2) what it is for and when to expect it to work, (3) most important side effects and what to do if they occur. Uses plain language; avoids jargon. Addresses storage requirements if relevant.

31–26 pts: Covers all three elements but one element is incomplete or contains a minor factual error. Language generally appropriate.

25–18 pts: Covers two of three elements completely; one element missing or significantly incomplete. One factual error present.

17–0 pts: Covers only one element or less. Multiple factual errors. Jargon-heavy counseling that the patient would not understand.

─────────────────────────────────────────────────
CRITERION 4: VERIFY UNDERSTANDING (TEACH-BACK)
Weight: 25 points

25–23 pts: Uses explicit teach-back method: asks the patient to repeat information back in their own words ("Just to make sure I explained that clearly — can you tell me how you'll take this medication?"). If patient demonstrates misunderstanding, corrects with additional explanation and re-verifies. Does not ask "Do you understand?" (yes/no questions are not teach-back).

22–18 pts: Attempts teach-back but asks yes/no questions ("Is that clear?") rather than open-ended recall. Does not re-verify after correction.

17–12 pts: Mentions that the patient should call with questions but does not verify retention of specific information.

11–0 pts: No attempt to verify understanding. Ends encounter by handing the patient the medication.

─────────────────────────────────────────────────
CRITERION 5: DOCUMENTATION AND APPROPRIATE REFERRAL
Weight: 15 points

15–14 pts: Provides pharmacy contact information for follow-up questions. Notes which questions require pharmacist (not student) response and escalates appropriately. Documents the counseling encounter in the simulated patient record at the end of the encounter with appropriate detail (drug, patient concern addressed, information provided, patient verbalized understanding).

13–10 pts: Provides contact information. Documentation present but lacks specificity (e.g., "counseling done" without content).

9–6 pts: Mentions follow-up questions can be directed to the pharmacy but no contact information provided. Minimal or no documentation.

5–0 pts: No referral, no contact information, no documentation attempt.

─────────────────────────────────────────────────
TOTAL SCORE: 100 points

Passing score: 70 points or above. Scores below 70 trigger a mandatory debrief with the OSCE coordinator and activation of the second-attempt policy per the course syllabus.`,
      },
    ],
  },

  // ─── EDP-601-STARTER ────────────────────────────────────────────────────────
  {
    courseCode: 'EDP-601-STARTER',
    title: 'Research Methods in Education',
    description: 'A graduate-level survey of quantitative, qualitative, and mixed-methods research design for students in the College of Education. Students develop a formal research proposal through iterative writing, literature review, and peer critique.',
    college: 'The Graduate School',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `RESEARCH METHODS IN EDUCATION — EDP 601
College of Education | The Graduate School | Spring 2026 | 3 Credit Hours
Meeting: Tuesdays 4:00–6:45 PM | Dickey Hall, Room 116

INSTRUCTOR
Dr. Priya Sharma, PhD
Office: Dickey Hall 214 | Office Hours: Tuesdays 1:00–3:00 PM and by appointment
Email: p.sharma@uky.edu

COURSE OVERVIEW
EDP 601 introduces graduate students to the major paradigms, designs, and methods used in educational research. By the end of this course, students will be able to read and critically evaluate published research, select an appropriate methodology for their research questions, conduct a systematic literature review, and produce a complete research proposal. Students who are pursuing a thesis or dissertation are strongly encouraged to use this course to develop their actual proposal with instructor guidance.

REQUIRED CITATION FORMAT
All written work in this course must use APA 7th Edition format. This applies to all in-text citations, reference lists, headers, and the overall structure of the literature review and research proposal. No exceptions. Students uncertain about APA 7 formatting should consult the Publication Manual of the American Psychological Association, 7th Edition, available at the UK main library and online via Purdue OWL.

REQUIRED TEXTS
- Creswell, J. W., & Creswell, J. D. (2018). Research Design: Qualitative, Quantitative, and Mixed Methods Approaches (5th ed.). SAGE Publications.
- Recommended reference: American Psychological Association. (2020). Publication Manual of the American Psychological Association (7th ed.).

GRADING BREAKDOWN
- Research Proposal: 40%
  - Proposal Section 1 (Problem Statement + Research Questions): 10% — due Week 5
  - Proposal Section 2 (Literature Review): 15% — due Week 10
  - Full Proposal (Sections 1–4 + IRB considerations): 15% — due Week 15
- Literature Review (standalone assignment): 30%
  - Draft 1: 10% — due Week 7
  - Final Literature Review: 20% — due Week 12
- Weekly Article Critiques: 20% (10 critiques × 2% each — due Tuesdays before class)
- Participation: 10% (quality of discussion contributions across the semester)
Total: 100%

LITERATURE REVIEW REQUIREMENTS
The standalone literature review assignment is a critical synthesis of a minimum of 15 peer-reviewed sources on the student's chosen research topic.
- Minimum length: 2,500 words (body text only; not counting title page, abstract, or references)
- Maximum length: 4,000 words
- Sources: minimum 15 peer-reviewed journal articles published in the last 10 years (exceptions for seminal sources may be approved by instructor)
- Databases required: students must search a minimum of 3 databases (ERIC, PsycINFO, and one additional — see Module 3 for database guidance)
- Structure: introduction (states the purpose and scope of the review), thematic synthesis sections (do NOT organize as an annotated list of summaries), conclusion (identifies gaps in the literature that your research addresses)
- APA 7 format throughout

RESEARCH PROPOSAL REQUIREMENTS
The final research proposal is a 15–20 page document (body text only) containing:
1. Introduction and Problem Statement (expanded from Section 1 submission)
2. Literature Review (revised and integrated from standalone assignment)
3. Research Questions and/or Hypotheses
4. Methodology: design, sampling strategy, data collection instruments, analysis plan
5. IRB Considerations: discuss ethical issues, informed consent procedures, any special protections required for vulnerable populations
6. Significance: why does this research matter? Who benefits from the findings?
Thesis students should draft their actual proposal Chapter 1 and 2 drafts and submit them as Sections 1 and 2.

IRB REQUIREMENT NOTE
All human subjects research at UK requires Institutional Review Board (IRB) review and approval before data collection begins. Research proposals that involve human subjects must include a preliminary IRB considerations section identifying the level of review required (exempt, expedited, or full board review). Students conducting pilot data collection for thesis/dissertation research must have IRB approval in place before collecting any data, even informal interviews. The instructor will not approve real data collection as part of this course without evidence of IRB submission.

LATE WORK POLICY
Major written assignments: 10% deducted per day late. No assignment accepted more than 5 days after the due date.
Article critiques: Not accepted late (solution: drop your lowest two critique scores — your 10 best out of 12 assigned count).
Participation: Cannot be made up for missed class sessions.

WEEKLY SCHEDULE
Week 1: Course Introduction; What is Educational Research? — Overview of paradigms and approaches
Week 2: Research Paradigms — Positivism, interpretivism, critical theory, pragmatism
Week 3: Quantitative Research Design — surveys, experiments, quasi-experiments, correlational studies
Week 4: Qualitative Research Design — phenomenology, grounded theory, ethnography, case study
Week 5: Mixed Methods Design — rationale for mixing, integration strategies | PROPOSAL SECTION 1 DUE
Week 6: Literature Review — Database searching; Boolean operators; inclusion/exclusion criteria
Week 7: Literature Review — Synthesis vs. summary; thematic organization | LR DRAFT 1 DUE
Week 8: Data Collection — Surveys, interviews, observation protocols, document analysis
Week 9: Quantitative Data Analysis — Descriptive stats, inferential stats, effect size, common tests
Week 10: Qualitative Data Analysis — Thematic coding, member checking, saturation | PROPOSAL SECTION 2 DUE
Week 11: Mixed Methods Analysis — Integration strategies; data quality in mixed designs
Week 12: Research Ethics — IRB process, informed consent, working with vulnerable populations | LR FINAL DUE
Week 13: Writing the Research Proposal — Structure, voice, presenting methodology; peer review workshop
Week 14: Proposal Presentations — Students present 10-minute overview of proposal to seminar
Week 15: FULL RESEARCH PROPOSAL DUE | Course Synthesis and Reflection`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: Paradigms of Educational Research',
        materialType: 'lecture',
        content: `MODULE 1: PARADIGMS OF EDUCATIONAL RESEARCH
Core Concept: Understanding the philosophical foundations that shape how researchers ask and answer questions

WHAT IS A RESEARCH PARADIGM?
A research paradigm is a set of shared beliefs about the nature of reality (ontology), the nature of knowledge (epistemology), and the appropriate methods for generating knowledge (methodology). Paradigms are not methodological preferences — they are deeper assumptions about what counts as reality and how we can know it. Your paradigm shapes every research decision you make: what questions you ask, what evidence you accept, and how you interpret your findings.

THE MAJOR PARADIGMS

Positivism and Post-Positivism
Positivism, associated with Auguste Comte and later logical positivists, holds that reality exists independently of the observer (realist ontology) and that objective knowledge of that reality can be generated through systematic, empirical observation. Post-positivism (the contemporary dominant paradigm in quantitative educational research) accepts that complete objectivity is unachievable but holds that we should strive toward it through rigorous methods, replication, and statistical reasoning. The positivist/post-positivist researcher: uses controlled designs, measures variables, seeks to generalize findings to populations, and treats knowledge as probabilistic and revisable.

Interpretivism (Constructivism)
Interpretivism holds that reality is socially constructed — multiple realities exist, shaped by participants' interpretations and social context. There is no single, observer-independent truth to be discovered; rather, knowledge is constructed between the researcher and participants. The interpretivist researcher uses qualitative methods (interviews, observation, document analysis), focuses on meaning-making, acknowledges their own positionality (how their background shapes their interpretations), and seeks to produce rich, contextual understanding rather than generalization. Weber's concept of Verstehen — empathic understanding of social action from the actor's perspective — is foundational.

Critical Theory
Critical theory (associated with the Frankfurt School: Horkheimer, Adorno, Habermas; and in education: Freire, Apple, hooks) holds that research is never neutral — it either reproduces existing power structures or challenges them. The critical theorist seeks not only to understand social reality but to change it. Research from this paradigm examines structures of power, privilege, race, class, and gender; foregrounds the voices of marginalized communities; and aims toward social transformation. Methods may be qualitative or participatory action research.

Pragmatism
Pragmatism (associated with Dewey, James, Peirce) holds that the value of a theory lies in its consequences — what works is true, provisionally. Pragmatism is the philosophical foundation most often associated with mixed methods research: researchers select the methods that best answer the research question, regardless of paradigm purity. Creswell and Creswell (2018) identify pragmatism as enabling researchers to move between quantitative and qualitative approaches without ontological contradiction.

PARADIGM AND METHODOLOGY
Each paradigm has associated preferred methodologies:
- Post-positivism: experiments, quasi-experiments, surveys, longitudinal studies, meta-analysis
- Interpretivism: phenomenology, ethnography, grounded theory, narrative inquiry, case study
- Critical theory: critical discourse analysis, participatory action research, feminist methodologies
- Pragmatism: mixed methods, program evaluation, design-based research

CHOOSING YOUR PARADIGM
Students are not required to declare a paradigm and then select methods from it rigidly. However, you must be able to articulate the philosophical assumptions underlying your research design and why they are appropriate to your research question. A study asking "What is the lived experience of first-generation students navigating academic identity?" calls for interpretivism and qualitative methods. A study asking "Do high-dosage tutoring programs increase math achievement scores?" calls for post-positivism and a quasi-experimental design.

DISCUSSION QUESTIONS
1. A researcher wants to study racism in school disciplinary practices. What paradigm would best support their work, and why? What paradigm would be least appropriate?
2. Is it possible to conduct research that is truly paradigm-free? What are the implications if all research is paradigm-laden?
3. How does a researcher's positionality relate to their paradigm? Is a White researcher studying racial inequity able to adopt an interpretivist stance credibly?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Research Design',
        materialType: 'lecture',
        content: `MODULE 2: RESEARCH DESIGN
Core Concept: Selecting and justifying the appropriate design for your research questions

WHAT IS RESEARCH DESIGN?
Research design is the plan and procedure that spans the decisions from broad philosophical assumptions to detailed methods of data collection and analysis. Design connects your paradigm (what you believe about knowledge) to your methods (how you will generate knowledge). Creswell and Creswell (2018) identify three major design categories: quantitative, qualitative, and mixed methods.

QUANTITATIVE DESIGNS
Quantitative designs are used when the goal is to test hypotheses, examine relationships between variables, or determine the effect of an intervention on an outcome. They typically use numerical data, statistical analysis, and seek to generalize findings to populations.

Key quantitative designs in educational research:
- Experimental: random assignment of participants to treatment and control groups; strongest design for causal inference (internal validity). Rare in educational settings due to ethical and practical constraints.
- Quasi-experimental: compares treatment and control groups without random assignment (e.g., intact classroom groups); weaker causal claims than true experiments; common in program evaluation
- Survey/correlational: examines relationships among variables as they naturally exist; can identify correlations but cannot establish causation; cross-sectional (one time point) or longitudinal (multiple time points)
- Causal-comparative (ex post facto): examines differences between groups formed before the study (e.g., gender, income level); researcher cannot manipulate the independent variable

Threats to internal validity in quantitative designs: selection bias, history effects, maturation, instrumentation, testing effects, attrition. Researchers use controls (randomization, comparison groups, consistent measurement) to minimize these threats.

QUALITATIVE DESIGNS
Qualitative designs are used when the goal is to explore a phenomenon from the perspective of participants, generate theory from data, or understand social processes in their natural context.

Key qualitative designs:
- Phenomenology: explores the lived experience of a phenomenon for participants who have experienced it (e.g., "the experience of being the first in your family to attend college"). Focuses on essence and meaning.
- Grounded theory: generates a substantive theory grounded in systematically collected data from a setting; uses constant comparative analysis and theoretical sampling; associated with Glaser and Strauss (1967).
- Ethnography: extended immersive study of a cultural group or bounded system; uses observation, interviews, and artifact analysis; focuses on shared beliefs, behaviors, and language of a community.
- Case study: in-depth investigation of a bounded case (a person, classroom, school, program); uses multiple data sources (interviews, observations, documents); seeks thick description.
- Narrative inquiry: examines how individuals make sense of their experiences through stories; researchers restory participants' accounts into a coherent narrative.

Ensuring quality in qualitative research: member checking (returning interpretations to participants for verification), prolonged engagement, triangulation of data sources, thick description (detailed contextual reporting), reflexivity (researcher acknowledges their own assumptions and influence).

MIXED METHODS DESIGNS
Mixed methods combines quantitative and qualitative approaches in a single study. Justifications for mixing: one approach's weaknesses are offset by the other's strengths; a phenomenon is too complex for one lens; generalizability (quantitative) and depth (qualitative) are both needed.

Three basic mixed methods designs:
- Convergent parallel: quantitative and qualitative data collected simultaneously and merged; discrepancies between findings are discussed
- Explanatory sequential: quantitative data collected first; qualitative data collected second to explain quantitative results
- Exploratory sequential: qualitative data collected first to develop instruments; quantitative data collected second to test or generalize

WHEN TO USE EACH DESIGN
The research question drives the design choice:
- Quantitative: "Does X cause Y?" "What is the relationship between A and B in a population?"
- Qualitative: "What is the experience of X for these participants?" "How does this process work in this context?"
- Mixed: "What works and why?" "Whose experiences explain these outcomes?"

DISCUSSION QUESTIONS
1. A school district wants to evaluate whether a new reading intervention improved third-grade literacy scores. What design would you recommend, and what are its limitations?
2. A researcher wants to understand why students from rural backgrounds experience higher attrition in the first year of college. What qualitative design would you choose and why?
3. What are the arguments for and against using a mixed methods design as your default approach to any educational research question?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Literature Review',
        materialType: 'lecture',
        content: `MODULE 3: LITERATURE REVIEW
Core Skill: Systematically searching, evaluating, and synthesizing the scholarly literature on your research topic

WHAT IS A LITERATURE REVIEW?
A literature review is a critical synthesis of existing research on a topic. The word "synthesis" is key: a good literature review does not summarize one paper, then the next, then the next — it identifies themes, tensions, and patterns across the literature and shows how the body of work as a whole informs your research question and creates the gap your study will fill.

A literature review serves three functions in a research proposal: (1) demonstrates your knowledge of the field, (2) establishes the theoretical and empirical foundations for your study, and (3) justifies your study by showing what is already known and what remains unknown.

DATABASE SEARCHING
Systematic literature searches use academic databases rather than Google. For educational research, the required databases for this course are:
- ERIC (Education Resources Information Center): the primary database for educational research; indexes peer-reviewed journals, technical reports, and policy documents
- PsycINFO: indexes psychological research; essential for studies involving learning, development, cognition, mental health, and social behavior
- Additional databases: Education Source, Academic Search Complete, Sociological Abstracts, or a discipline-specific database relevant to your topic

Effective searching requires:
- Identifying key terms and their synonyms (thesaurus function in ERIC and PsycINFO)
- Using Boolean operators: AND narrows results, OR broadens them, NOT excludes terms
- Using truncation (*) to capture word variants: "teach*" retrieves teach, teacher, teaching, teachers
- Applying limiters: peer-reviewed only, date range (typically last 10 years, seminal works excepted), language, age group

Document your search strategy: note the databases searched, search terms used, date of search, and number of results at each step. This is required for the final literature review assignment.

INCLUSION AND EXCLUSION CRITERIA
Before reviewing sources, establish explicit criteria for what counts as an eligible source. Example:
- Included: peer-reviewed empirical studies; published 2014–2024; participants must be K–12 or higher education students; English-language
- Excluded: opinion pieces, dissertations (unless your supervisor approves), studies outside the US/UK (unless comparative); samples limited to clinical/medical populations

SYNTHESIS VS. SUMMARY
The most common error in graduate-level literature reviews is writing a series of summaries: "Smith (2019) found that... Jones and Lee (2020) argued that... Williams (2021) studied..." This is an annotated bibliography, not a synthesis.

Synthesis involves:
- Organizing by theme, not by author
- Identifying agreement: "Multiple studies have found that [claim] (Smith, 2019; Jones & Lee, 2020; Williams, 2021)."
- Identifying contradiction: "While Smith (2019) found X, Jones and Lee (2020) found Y; the discrepancy may reflect differences in..."
- Identifying gaps: "Despite extensive research on [X], no study has examined [Y], which is the focus of the proposed study."

AVOIDING NARRATIVE REVIEW PITFALLS
- Cherry-picking: selecting only studies that support your position while ignoring contradictory evidence. Systematic reviews avoid this by using predefined inclusion/exclusion criteria.
- Over-reliance on secondary sources: cite original empirical studies, not other people's summaries of them.
- Unsupported claims: every empirical claim must have a citation. Do not write "research has shown" without a specific citation.
- Out-of-date literature: prioritize literature from the past 10 years unless a source is genuinely seminal (e.g., Bandura's 1977 social learning theory paper).

IDENTIFYING THE GAP
The literature review should culminate in a clear identification of the gap or problem in the existing literature that your study addresses. This is the logical "therefore" that justifies your research. It should flow naturally from the synthesis: "The literature has established X and Y, but no study has examined Z in [this population / this context / using this method]. The proposed study addresses this gap by..."

DISCUSSION QUESTIONS
1. What is the difference between a scoping review, a systematic review, and a narrative review? Which is most appropriate for a dissertation literature review?
2. Your initial database search returns 847 articles. How do you narrow to a manageable set without introducing bias?
3. A reviewer of your literature review says it reads "like a list of abstracts." What specific structural changes would you make to address this feedback?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Data Collection',
        materialType: 'lecture',
        content: `MODULE 4: DATA COLLECTION
Core Skill: Selecting and designing data collection instruments appropriate to your research questions and design

ALIGNING DATA COLLECTION WITH DESIGN
Data collection instruments must be selected to match the research design and questions. Quantitative studies typically use standardized instruments (validated surveys, achievement tests, administrative data). Qualitative studies typically use researcher-generated instruments (interview protocols, observation guides) that can be adapted flexibly during the study. Mixed methods studies use both.

SURVEYS
Surveys are the most commonly used data collection instrument in educational research. Key design considerations:
- Closed-ended items: Likert scales (strongly agree to strongly disagree), multiple choice, yes/no; produce numerical data amenable to statistical analysis; easier to analyze but lose nuance
- Open-ended items: free-text responses; richer data but harder to analyze systematically; often analyzed using content analysis or qualitative coding
- Scale development: existing validated scales should be used where available; developing a new scale requires extensive piloting, factor analysis, and reliability testing
- Reliability: internal consistency (Cronbach's alpha ≥ 0.70 typically acceptable) for multi-item scales; test-retest reliability for stable constructs
- Validity: does the instrument measure what it claims to measure? Face validity, content validity, construct validity (confirmatory factor analysis), criterion validity

Administration modes: online (high reach, lower response rates), paper (higher response rates in captive settings), interview-administered (eliminates literacy barriers, interviewer effects possible).

INTERVIEWS
Interviews are the primary qualitative data collection method. Types:
- Structured: fixed question order, identical wording for all participants (closer to survey); useful for consistency across large samples
- Semi-structured: fixed core questions with probes that follow the participant's responses; the most common interview format in educational research; allows depth while maintaining consistency
- Unstructured: conversational; researcher enters with broad topics; used in ethnography and exploratory qualitative work

Developing an interview protocol:
- Begin with low-stakes "grand tour" questions ("Tell me about your first year of college")
- Progress to more focused questions specific to your research question
- Include probes for each question ("Can you say more about that?" "What happened next?")
- End with a closing question ("Is there anything else you want to share that we haven't discussed?")

Recording and transcription: audio record all interviews (with consent); transcribe verbatim for qualitative analysis. Allow 4–6 hours of transcription time per hour of interview.

OBSERVATION
Observation is used when you want to study behavior or processes in naturalistic settings. Types:
- Participant observation: researcher takes an active role in the setting (complete participant, participant-as-observer); used in ethnography; can increase rapport but raises objectivity concerns
- Non-participant observation: researcher observes without participating; reduces reactivity but may miss meaning
Observation protocols should specify: physical setting map, time sampling intervals, specific behaviors to document (if structured), and field note format.

DOCUMENT ANALYSIS
Educational research routinely uses existing documents: school records, policy documents, curriculum materials, student work samples, meeting minutes. Document analysis must consider: authenticity (is this the original?), credibility (who created it and why?), representativeness (is this document typical?), meaning (what does it mean in context?).

DISCUSSION QUESTIONS
1. You want to study teacher self-efficacy. Should you develop your own scale or use an existing validated instrument like the Teachers' Sense of Efficacy Scale (Tschannen-Moran & Hoy, 2001)? What are the trade-offs?
2. A participant gives a brief, uninformative answer to your first interview question. What probing strategies can you use to generate richer data without leading the participant?
3. You are observing classroom interactions to study teacher feedback patterns. How do you decide which behaviors to record and which to ignore? What are the consequences of these choices?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Data Analysis',
        materialType: 'lecture',
        content: `MODULE 5: DATA ANALYSIS
Core Skill: Applying appropriate analysis techniques to quantitative and qualitative data and ensuring quality and rigor

QUANTITATIVE DATA ANALYSIS

Descriptive Statistics
Before any inferential analysis, describe your data: means and standard deviations for continuous variables; frequencies and percentages for categorical variables. Report the distribution of your sample on key demographic variables. Descriptive statistics are not the "lesser" analysis — they are the foundation and sometimes sufficient to answer descriptive research questions.

Inferential Statistics
Inferential statistics allow generalizations from a sample to a population, with quantified uncertainty. Common tests in educational research:
- t-test: compares means of two groups (independent samples t-test) or one group over two time points (paired t-test)
- ANOVA (Analysis of Variance): compares means of three or more groups
- Pearson correlation (r): measures linear relationship between two continuous variables; ranges from -1 to +1
- Regression: examines the effect of one or more predictors on an outcome variable; multiple regression allows statistical control of confounds
- Chi-square test: tests association between two categorical variables

Effect size: statistical significance tells you whether an effect is real; effect size tells you whether it is meaningful. Common effect sizes: Cohen's d (for mean differences), r (for correlations), η² (for ANOVA). Report effect sizes alongside p-values.

QUALITATIVE DATA ANALYSIS

Thematic Coding
Thematic coding is the most widely used qualitative analysis approach. It involves:
1. Familiarization: read and re-read the data; note initial impressions
2. Initial coding: assign descriptive codes to meaningful segments of the data ("financial stress," "faculty support," "sense of belonging")
3. Code collapsing: group initial codes into broader thematic categories
4. Theme development: identify 4–6 major themes that together capture the pattern of meaning across the dataset
5. Theme review: check themes against the data; do they fit? Are there data that don't fit?
6. Writing up: each theme is presented with supporting quotes from participants; quotations are not analyzed independently — they illustrate the theme

The difference between a theme and a topic: a theme makes a claim ("students experience financial stress as a primary threat to persistence") rather than merely naming a subject ("financial stress"). Weak themes are just category labels; strong themes are interpretive arguments.

VALIDITY AND RELIABILITY IN QUALITATIVE RESEARCH
Traditional quantitative criteria (reliability, internal validity, external validity) have qualitative analogs:
- Credibility (analog to internal validity): achieved through member checking, prolonged engagement, triangulation, negative case analysis, peer debriefing
- Transferability (analog to external validity): achieved through thick description; readers judge whether findings transfer to their context
- Dependability (analog to reliability): achieved through an audit trail (documentation of analysis decisions)
- Confirmability (analog to objectivity): achieved through reflexivity (researcher documents their own assumptions and how they managed them)

DISCUSSION QUESTIONS
1. A researcher finds a statistically significant difference (p < 0.001) between treatment and control groups on a math test, but Cohen's d = 0.12. What should the researcher conclude?
2. Two researchers independently code the same set of interview transcripts. They agree on 14 of 20 segments. What is their inter-rater reliability (% agreement), and what does this indicate?
3. A student presents the results of their qualitative study with seven "themes." You notice themes 3 and 5 are nearly identical. What feedback would you give about theme development?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: Ethics in Research',
        materialType: 'lecture',
        content: `MODULE 6: ETHICS IN RESEARCH
Core Concept: Understanding the ethical obligations of educational researchers and the institutional processes that protect research participants

HISTORICAL CONTEXT
Modern research ethics emerged from catastrophic historical abuses. The Nuremberg Code (1947) established the requirement for voluntary informed consent following Nazi medical experiments. The Declaration of Helsinki (1964) extended these principles to medical research. In the United States, the Belmont Report (1979) established the foundational principles for research with human subjects following the Tuskegee Syphilis Study (1932–1972), in which Black men with syphilis were denied treatment for 40 years without consent. These historical violations make ethics not a bureaucratic compliance exercise but a moral commitment.

THE BELMONT PRINCIPLES
- Respect for Persons: individuals must be treated as autonomous agents; those with diminished autonomy (minors, prisoners, persons with cognitive impairments) are entitled to additional protections. Operationalized as: informed consent.
- Beneficence: do not harm; maximize possible benefits and minimize possible harms. Operationalized as: risk-benefit analysis.
- Justice: the benefits and burdens of research should be distributed fairly across society. Operationalized as: equitable selection of participants; historically exploited groups should not bear disproportionate research burdens.

THE IRB PROCESS AT UK
The Institutional Review Board (IRB) is a federally mandated committee that reviews research involving human subjects. All research conducted by UK faculty, students, and staff that involves human subjects must receive IRB approval before data collection begins. No exceptions, even for "low-risk" research.

Types of IRB review:
- Exempt review: lowest-risk research (e.g., surveys of adults not involving sensitive topics; analysis of existing data with no personally identifiable information). Fast turnaround (1–2 weeks).
- Expedited review: more than minimal risk but involving only procedures on the expedited list (e.g., interviews with adults on non-sensitive topics; survey research involving sensitive topics). Reviewed by IRB Chair or designated reviewer.
- Full board review: greater than minimal risk; research with vulnerable populations; research involving deception or sensitive topics. Reviewed at a full monthly board meeting.

Submitting to IRB: submit via the iRIS system at UK. Application includes: study description, consent forms, data collection instruments, data security plan, personnel qualifications. Allow 4–8 weeks for full board review.

INFORMED CONSENT
Informed consent is not a signature on a form — it is an ongoing process. Consent must be:
- Voluntary: free from coercion or undue influence; power differentials (teacher-student, researcher-participant) require extra attention
- Informed: participants must understand the study's purpose, procedures, risks, benefits, confidentiality limits, and their right to withdraw
- Comprehensible: written at an appropriate reading level for the participant population; must be translated for non-English speakers
- Ongoing: participants may withdraw at any time without penalty

For research with minors: parental/guardian consent is required in addition to participant assent from the child (typically age 7 and above).

RESEARCH WITH VULNERABLE POPULATIONS
Vulnerable populations in educational research include: minors, students with disabilities, English language learners, undocumented students, incarcerated individuals, students with trauma histories. Research with these populations requires additional protections: IRB full board review, enhanced confidentiality, trauma-informed data collection, and careful attention to the power dynamics between researcher and participant.

DISCUSSION QUESTIONS
1. A graduate student wants to interview their own undergraduate students about their experiences in the student's course. What ethical issues arise? How should they be addressed?
2. A researcher discovers during an interview that a participant has disclosed active suicidal ideation. What is the researcher's ethical obligation? How should this be addressed in the consent form and data collection protocol?
3. A study of student academic performance plans to link school records with survey data. What de-identification procedures are required? When does linking data require full board rather than exempt review?`,
      },
      {
        moduleNumber: 8,
        title: 'Research Proposal Rubric',
        materialType: 'rubric',
        content: `RESEARCH METHODS IN EDUCATION — RESEARCH PROPOSAL RUBRIC
EDP 601 | College of Education | Spring 2026
Worth 40% of Final Grade (15% for the full proposal component)

The Research Proposal is evaluated across five criteria. Each criterion is worth 20 points; total = 100 points, which converts to 40% of your course grade (combined with Section 1 and Section 2 submissions weighted as described in the syllabus).

─────────────────────────────────────────────────
CRITERION 1: PROBLEM STATEMENT AND RESEARCH QUESTIONS
Weight: 20 points

20–18 pts (Excellent): The problem statement clearly identifies: (1) the educational problem being addressed, (2) the specific gap in the literature that the study addresses, and (3) the significance of the study for practitioners, policymakers, or researchers. Research questions are clearly stated, appropriately scoped (answerable within the proposed study), and grammatically consistent with the design (quantitative: specific, measurable outcomes; qualitative: open, exploratory phrasing). The problem statement and research questions are logically connected.

17–14 pts (Proficient): Problem clearly stated with most of the three elements present. Research questions are clearly stated and generally aligned with the design, though some may be too broad or too narrow. Minor disconnect between problem statement and questions.

13–10 pts (Developing): Problem vaguely identified; significance not clearly articulated. Research questions present but may mix quantitative and qualitative phrasing inappropriately. Gap in the literature mentioned but not demonstrated from the literature review.

9–0 pts (Beginning): Problem statement missing or describes a topic rather than a problem. Research questions absent or too broad to be answerable (e.g., "How can we improve education?").

─────────────────────────────────────────────────
CRITERION 2: LITERATURE REVIEW (INTEGRATED INTO PROPOSAL)
Weight: 20 points

20–18 pts: The integrated literature review (revised from the standalone assignment) is thematically organized, synthesizes rather than summarizes sources, and directly establishes the foundation for the research questions. Minimum 15 peer-reviewed sources. Gap in the literature is explicit and directly motivates the study. APA 7 format is accurate throughout. No unsupported empirical claims.

17–14 pts: Literature review synthesizes most sources but contains some summary passages. Gap is identified but may require more specificity. At least 12–14 peer-reviewed sources. Minor APA errors.

13–10 pts: Literature review leans heavily on summaries; synthesis is present but underdeveloped. Fewer than 12 sources or significant reliance on non-peer-reviewed sources. Multiple APA errors.

9–0 pts: Literature review is an annotated list of summaries. Sources insufficient (fewer than 8). Gap not identified. APA format largely absent or incorrect throughout.

─────────────────────────────────────────────────
CRITERION 3: METHODOLOGY
Weight: 20 points

20–18 pts: Design clearly identified and justified with reference to the research questions and appropriate paradigm (cite Creswell or similar methodological authority). Sampling strategy appropriate, clearly described (sample size justification for quantitative; saturation-oriented approach for qualitative). Data collection instruments identified or developed with rationale. Analysis plan is specific and appropriate to the data type (specific statistical test and software; specific qualitative analysis approach with reference). Timeline is realistic.

17–14 pts: Design named and generally justified. Sampling plan present with minor gaps. Data collection described but instruments not fully specified. Analysis plan general but appropriate.

13–10 pts: Design named without justification. Sampling plan vague (e.g., "a convenient sample"). Analysis plan described in general terms only ("I will analyze the data qualitatively").

9–0 pts: Design missing or internally inconsistent with research questions. No sampling plan. Analysis not described.

─────────────────────────────────────────────────
CRITERION 4: IRB CONSIDERATIONS
Weight: 20 points

20–18 pts: Clearly identifies the level of IRB review required (exempt, expedited, or full board) with a justification. Identifies all specific ethical issues: power dynamics (if applicable), vulnerable populations (if applicable), sensitive topics, risks to participants, and measures to mitigate risk. Consent process described specifically (parental consent + assent if minors; ongoing consent if longitudinal; debrief if deception used). Confidentiality and data security plan is specific (de-identification, storage, retention, disposal).

17–14 pts: IRB review level identified with rationale. Most ethical issues identified. Consent process described at general level. Confidentiality plan present but not fully specific.

13–10 pts: IRB mentioned but review level not specified or justified. Ethical issues identified in generic terms. Consent mentioned but process not described.

9–0 pts: IRB not addressed or addressed in one sentence. No discussion of ethical issues or consent.

─────────────────────────────────────────────────
CRITERION 5: SIGNIFICANCE AND APA FORMATTING
Weight: 20 points

20–18 pts: Significance section clearly states the practical, theoretical, and policy implications of the proposed findings. States who benefits from the research and how. APA 7 format is accurate throughout: title page, running head (if required), headings (correct levels), in-text citations, and reference list. No formatting errors that would distract a reviewer.

17–14 pts: Significance section present with most components. Some limitation to "this will help teachers" without specificity. Minor APA formatting errors (consistent heading level errors, minor citation format errors).

13–10 pts: Significance section present but generic. APA formatting errors throughout but the document is still readable and the formatting effort is evident.

9–0 pts: No significance section. APA formatting absent or so inconsistent as to suggest no effort to apply it. Reference list missing or in a non-APA style.`,
      },
    ],
  },

  // ─── HON-251-STARTER ────────────────────────────────────────────────────────
  {
    courseCode: 'HON-251-STARTER',
    title: 'Honors Seminar: The Human Condition',
    description: 'An interdisciplinary honors seminar examining foundational questions about identity, justice, technology, and art through close reading of philosophical, literary, and scientific texts, culminating in a thesis proposal.',
    college: 'Lewis Honors College',
    semester: 'Spring 2026',
    materials: [
      {
        moduleNumber: 1,
        title: 'Course Syllabus',
        materialType: 'syllabus',
        content: `HONORS SEMINAR: THE HUMAN CONDITION — HON 251
Lewis Honors College | Spring 2026 | 3 Credit Hours
Seminar: Mondays and Wednesdays 2:00–3:15 PM | Pence Hall, Honors Seminar Room 212

INSTRUCTOR
Dr. Jonathan Weatherall, PhD (Philosophy and Comparative Literature)
Office: Pence Hall 108 | Office Hours: Tuesdays 10:00 AM–12:00 PM and by appointment
Email: j.weatherall@uky.edu

COURSE OVERVIEW
"The Human Condition" is a required seminar for Lewis Honors College students, designed to introduce interdisciplinary thinking and close textual analysis while supporting the development of each student's honors thesis. We will read primary texts in philosophy, literature, political theory, history of science, and aesthetics — not as a survey of "great books," but as interlocutors in an ongoing conversation about what it means to be human in a social, historical, and natural world. The course is deliberately provocative: you will encounter ideas that challenge your prior assumptions, and the seminar format requires you to articulate, defend, and revise your thinking in real time.

HONORS THESIS AND CONTRACT INFORMATION
This course directly supports the honors thesis process. Students at the proposal stage are expected to use the Research Process module (Module 6) and the thesis proposal assignment to advance their actual thesis work.

Honors graduation requirements (Lewis Honors College): students must earn a minimum of 24 honors credit hours to be eligible for honors graduation distinction. Courses that count toward this total must be designated as honors credit, either through enrollment in a listed honors course or through an honors contract.

Honors contract: an honors contract is an agreement between a student and an instructor of a non-honors course that allows the student to earn honors credit for that course by completing additional work beyond the standard course requirements. Contracts are approved by the Lewis Honors College and must be submitted by the end of the second week of the semester. Standard course grade requirements apply; the honors contract work is evaluated separately. Students cannot retroactively contract a course they have already completed.

GRADING BREAKDOWN
- Thesis Proposal: 30% (due Week 14)
- Seminar Essays (3 essays, 10% each): 30%
  - Essay 1: due Week 4 (Modules 1 and 2)
  - Essay 2: due Week 8 (Modules 3 and 4)
  - Essay 3: due Week 12 (Modules 5 and 6)
- Discussion Leadership: 20% (each student leads one seminar session)
- Participation: 20% (quality of contributions across all seminar sessions)
Total: 100%

SEMINAR ESSAYS
Three seminar essays respond to a central question from the assigned readings. Essays are analytical and argumentative — they make and support a claim, they do not summarize or describe. Essays must engage specific textual evidence from the assigned readings; general claims unsupported by the text are not adequate.
- Length: 1,000–1,400 words (body text only; not counting title and references)
- Citation format: Chicago style (notes-bibliography or author-date — your choice, applied consistently)
- Sources: assigned course readings are sufficient; additional research is welcome but not required

DISCUSSION LEADERSHIP
Each student leads one 45-minute portion of a seminar session. The discussion leader is responsible for:
- Preparing 4–5 discussion questions in advance (submitted to the instructor by Friday before the session)
- Opening the discussion with a brief (3–5 minute) framing statement — not a lecture summary
- Facilitating peer responses: drawing out quieter participants, redirecting, managing time
- Closing the discussion with a synthesis observation
Discussion leadership is evaluated on preparation, facilitation effectiveness, and the quality of the submitted questions. Students sign up for discussion leadership in Week 2.

PARTICIPATION (20%)
Participation in this course means substantive engagement with the texts and with your peers' ideas. It does not mean talking the most. Quality indicators:
- Builds specifically on the assigned text (not just "I think...")
- Responds to a specific peer's argument, agreeing or disagreeing with a reason
- Introduces a new interpretive angle or complication
- Asks a genuine question about the text rather than making a statement dressed as a question
Participation is not graded on a per-session basis. At mid-semester and end of semester, the instructor rates each student's overall participation trajectory on a 20-point scale.

LATE WORK POLICY
Seminar essays: 5 points deducted per day late (out of 100 essay points). No essay accepted more than 5 days after the due date.
Thesis proposal: accepted up to 7 days late with a 5-point-per-day penalty; not accepted after finals week begins.
Discussion leadership and participation: cannot be made up for a missed class.

ATTENDANCE
More than 3 absences results in a course grade reduction of one letter grade. Four or more absences may result in course failure at the instructor's discretion. Tardiness of more than 15 minutes counts as half an absence.

HONORS ELIGIBILITY
To receive honors credit for this course, students must maintain a course grade of B or above. A grade below B results in loss of honors credit for this section; the credits will appear on the transcript without honors designation.

CAN THIS COURSE COUNT TOWARD MAJOR REQUIREMENTS?
HON 251 may count toward distribution requirements in Arts and Humanities or Social Sciences, depending on the student's major. Students should verify with their departmental advisor. The course cannot substitute for specific required courses in a student's major unless the department grants a substitution petition. Contact your major advisor before the registration deadline if you intend to double-count this course.

WEEKLY SCHEDULE
Week 1: Course Introduction — What are the humanities? What is a seminar? Overview of the thesis process.
Week 2: Module 1: What Are the Humanities? — Close reading workshop; discussion leadership sign-up
Week 3: Module 2: Identity and the Self — Locke, Fanon; discussion leadership begins
Week 4: Module 2 continued — Beauvoir, Butler; ESSAY 1 DUE
Week 5: Module 3: Justice and the Social Contract — Hobbes, Locke, Rousseau
Week 6: Module 3 continued — Rawls, contemporary critique (Young, Mills)
Week 7: Module 4: Science, Technology, and Human Values — Kuhn, Winner, Shoshana Zuboff selections
Week 8: Module 4 continued — AI ethics case study; ESSAY 2 DUE
Week 9: Module 5: Art as Argument — Berger (Ways of Seeing), Toni Morrison lecture excerpts
Week 10: Module 5 continued — Sontag (On Photography) selections; student choice text
Week 11: Module 6: The Thesis Research Process — Research question development; argument mapping
Week 12: Module 6 continued — Preliminary sources workshop; ESSAY 3 DUE
Week 13: Thesis proposal peer review workshop — bring full draft
Week 14: THESIS PROPOSAL DUE; closing seminar — where we've been, where we're going
Finals Week: No meeting; office hours available for proposal revisions by appointment`,
      },
      {
        moduleNumber: 2,
        title: 'Module 1: What Are the Humanities?',
        materialType: 'lecture',
        content: `MODULE 1: WHAT ARE THE HUMANITIES?
Core Concept: Understanding the distinctive claims, methods, and value of humanistic inquiry

THE QUESTION ITSELF
Asking "what are the humanities?" is itself a humanistic question — it requires reflection on purpose, value, and method. This distinguishes the humanities from fields where practitioners rarely ask "what is chemistry?" or "what is accounting?" The humanities, from their inception, have been concerned with the question of their own justification. This self-reflective quality is not a weakness; it is a feature.

THE HUMANITIES AS WAYS OF KNOWING
The humanities — history, philosophy, literary and artistic study, linguistics, religious studies, and parts of anthropology — are unified less by a single method than by a shared commitment to the interpretation of human expression and experience. Where the natural sciences explain phenomena by subsuming them under general laws, and the social sciences explain behavior through causal generalizations, the humanities interpret meaning. What did this text mean to its author? To its first audience? What does it mean to us now, and why the difference?

Wilhelm Dilthey, the nineteenth-century German philosopher, distinguished between Erklären (explaining, the aim of natural science) and Verstehen (understanding, the aim of the human sciences). This distinction remains contested — many argue the boundary is not so clean — but it names a genuine difference of orientation: the humanist's goal is understanding from the inside.

CLOSE READING
Close reading is the core technical skill of literary and cultural study. It is the practice of attending to a text with fine-grained attention to its specific language, structure, form, imagery, and argument — reading not for a summary but for the significance of the particular. Close reading assumes that the specific choices a writer makes (this word, not that word; this structure, not another) are not arbitrary: they are meaning-bearing.

A close reading asks: What is this text doing? What does it assume about the world and about the reader? Where does it contradict itself or resist easy reading? What does it leave out, and why might that absence matter?

Close reading is not limited to literary texts. You can close-read a photograph, a legal document, a piece of music, a data visualization, or a political speech. The skill transfers to any domain where language or representation is doing significant work.

INTERDISCIPLINARY THINKING
Interdisciplinary thinking means bringing the analytical tools and questions of more than one discipline to bear on a single problem. It does not mean being superficial about everything; it means being rigorous within each disciplinary framework you invoke and knowing when to reach across the boundary.

In this course, we will read a philosopher (Locke) alongside a theorist of race and colonialism (Fanon) not because we are doing philosophy and history simultaneously, but because each opens questions the other cannot fully answer. Philosophical analysis of personal identity looks different when refracted through the historical experience of colonial violence. Neither perspective cancels the other.

THE ARGUMENT THAT THE HUMANITIES ARE IN CRISIS
In the contemporary university, the humanities face declining enrollment, reduced funding, and public skepticism about their economic return. Defenders of the humanities make several arguments:
- Democratic citizenship: humanistic education cultivates the capacity for independent judgment, persuasive communication, and empathic understanding of others — capacities democracy requires.
- Ethical reasoning: professional fields (medicine, law, engineering) increasingly embed humanistic questions; bioethics, environmental justice, AI ethics all require humanistic analysis.
- Meaning: humans are meaning-seeking creatures; the humanities are the formal study of how we make meaning.
Critics respond that these arguments are too abstract and that professional training better serves students' actual needs. How you answer this argument is itself an exercise in humanistic reasoning.

DISCUSSION QUESTIONS
1. What is the difference between a humanistic question and a scientific question? Can the same phenomenon be studied by both? Give an example.
2. What does it mean to close-read a non-textual object? Choose something from your immediate environment and attempt a brief close reading.
3. Should the humanities justify themselves in terms of economic value? What is at stake in this framing?`,
      },
      {
        moduleNumber: 3,
        title: 'Module 2: Identity and the Self',
        materialType: 'lecture',
        content: `MODULE 2: IDENTITY AND THE SELF
Core Concept: Tracing philosophical and political debates about what constitutes the self, and how social conditions shape identity

LOCKE ON PERSONAL IDENTITY
John Locke, in An Essay Concerning Human Understanding (1689, Book II, Chapter 27), argues that personal identity consists not in substance (not in the body, not in an immaterial soul) but in consciousness — specifically, in memory. A person is the same person over time insofar as they have continuous memory linking their present self to past experiences. "Person" for Locke is a forensic concept — it is the locus of moral and legal responsibility.

Locke's view generates famous puzzles. What of amnesia? What of the soldier who cannot remember his childhood? Thomas Reid's "brave officer" objection and later Parfit's work on personal identity push on these edges. But Locke's insight — that personal identity is a constructed, ongoing project of self-narration rather than a fixed natural fact — has proven enormously generative.

FANON AND THE COLONIAL DISRUPTION OF THE SELF
Frantz Fanon, in Black Skin, White Masks (1952), analyzes the psychological experience of Black people living under colonial and racial oppression. Fanon argues that the colonial system does not merely constrain the colonized person from outside — it intrudes into the structure of subjectivity itself, colonizing self-perception. The experience of being named, seen, and defined by the gaze of the colonizer ("Look, a Negro!") interpellates the colonized person into a racial identity that precedes and overwhelms them.

Fanon's analysis complicates Lockean identity in a radical way: identity is not simply the project of an autonomous self constructing itself through memory and consciousness; it is also shaped — and distorted — by social structures of power, racial ideology, and the look of the Other. The philosophical tradition's picture of the autonomous, self-constituting subject is, Fanon argues, a specifically European ideological projection.

BEAUVOIR AND DE BEAUVOIR'S INSIGHT
Simone de Beauvoir in The Second Sex (1949) extends a parallel analysis to the situation of women: "One is not born, but rather becomes, a woman." Femininity is not a natural fact but a social construction imposed through upbringing, culture, and ideology. The "feminine" woman has internalized the look of the masculine subject who defines her as Other. De Beauvoir draws on existentialism: the human project is the continual transcendence of given situations; but women are systematically constrained to immanence — to being objects defined by others rather than subjects who define themselves.

BUTLER AND PERFORMATIVITY
Judith Butler's Gender Trouble (1990) extends de Beauvoir's constructivism further: there is no pre-social sexed body that gender is imposed upon. Gender is performative — constituted through repeated stylized acts rather than expressive of a prior inner essence. This does not mean gender is chosen or optional; the performances are coerced by social norms. But it means that norms can be subverted through parodic or non-normative performances that expose their constructed nature.

THE COMMON THREAD
Across Locke, Fanon, de Beauvoir, and Butler, a common question runs: what is the relationship between the inner self and the social world? Locke begins from an individual consciousness that then enters social contracts. Fanon, de Beauvoir, and Butler reverse the priority: the social — specifically, structures of racial and gender oppression — constitutes the individual self from the outside in. Identity is not found; it is made, and the conditions of its making are political.

DISCUSSION QUESTIONS
1. Locke argues that personal identity is constituted by memory. What happens to personhood when memory is disrupted — by illness, by trauma, or by historical erasure?
2. Fanon writes that the colonized person is "overdetermined from without." What does this mean? How does it relate to the phenomenological experience of being perceived as a racial type?
3. If gender is performative, does this mean gender identity is a free choice? What are the limits of Butler's account?`,
      },
      {
        moduleNumber: 4,
        title: 'Module 3: Justice and the Social Contract',
        materialType: 'lecture',
        content: `MODULE 3: JUSTICE AND THE SOCIAL CONTRACT
Core Concept: The philosophical justifications for political authority and the distribution of social goods — and their contemporary critics

HOBBES: THE STATE OF NATURE AND SOVEREIGN POWER
Thomas Hobbes, in Leviathan (1651), begins from a thought experiment: imagine human life without political authority — the "state of nature." For Hobbes, the state of nature is a war of all against all, in which life is "solitary, poor, nasty, brutish, and short." Rational self-interest leads individuals to covenant together, surrendering their natural freedom to a sovereign whose power must be absolute to guarantee order. Justice, for Hobbes, is the keeping of covenants — it is a product of political authority, not a natural standard by which authority can be judged.

Hobbes writes as Europe is still bloodied by the Wars of Religion. His argument for sovereign authority over religious and political dissent is designed to prevent the catastrophe of civil war. Understanding this context does not excuse everything in his argument, but it helps us read it neither as timeless political wisdom nor as mere apology for tyranny.

LOCKE: NATURAL RIGHTS AND LIMITED GOVERNMENT
Locke's Second Treatise of Government (1689) shares the social contract structure but draws radically different conclusions. For Locke, individuals possess natural rights to life, liberty, and property that precede political society and constrain what a legitimate government may do. Political authority is conditional: government is instituted to protect natural rights, and when it systematically violates them, the people have the right to revolution.

Locke's theory is foundational for liberal democracy and directly influenced Jefferson's Declaration of Independence. But critics note that Locke's theory of property — labor mixing with the earth produces ownership — was used to justify the dispossession of Indigenous peoples from their lands, since colonial ideology could deny that Indigenous peoples had "labored" the land in the relevant sense.

RAWLS: JUSTICE AS FAIRNESS
John Rawls's A Theory of Justice (1971) is the most influential work of political philosophy of the twentieth century. Rawls updates the social contract tradition: what principles of justice would rational people choose if they were placed behind a "veil of ignorance" — not knowing their position in society (race, class, gender, natural talents)?

Rawls argues that rational choosers behind the veil would adopt: (1) the liberty principle: equal basic liberties for all, compatible with the same liberty for others; and (2) the difference principle: social and economic inequalities are justified only if they benefit the least advantaged members of society. Rawls's theory is egalitarian: it permits inequality only as a means of improving the situation of the worst-off.

CONTEMPORARY CRITIQUES
- Iris Marion Young (Justice and the Politics of Difference, 1990): Rawls's framework is individualist and distribution-focused; it misses structural forms of injustice — oppression and domination — that cannot be reduced to unfair distributions of goods. Justice also requires transforming the institutional conditions of decision-making.
- Charles Mills (The Racial Contract, 1997): the social contract tradition has systematically excluded non-white people from the moral community it describes. The real "social contract" underpinning Western societies is a racial contract — an agreement among whites to maintain racial domination — which Rawls and others ignore because they abstract away from actual history.

DISCUSSION QUESTIONS
1. Hobbes argues that the alternative to absolute sovereign authority is civil war. Under what conditions, if any, does Hobbes's argument justify obedience to an unjust government?
2. Is Rawls's veil of ignorance a useful device for thinking about justice, or does it obscure the concrete histories and identities that justice must address? Explain your reasoning.
3. Mills argues that the social contract is, historically, a racial contract. Does this historical claim undermine the normative force of Rawlsian justice, or can the framework be salvaged?`,
      },
      {
        moduleNumber: 5,
        title: 'Module 4: Science, Technology, and Human Values',
        materialType: 'lecture',
        content: `MODULE 4: SCIENCE, TECHNOLOGY, AND HUMAN VALUES
Core Concept: Understanding how science and technology are shaped by — and in turn shape — human values, social structures, and conceptions of the good life

KUHN AND THE STRUCTURE OF SCIENTIFIC REVOLUTIONS
Thomas Kuhn's The Structure of Scientific Revolutions (1962) challenged the dominant picture of science as a steady accumulation of knowledge. Kuhn argued that science normally operates within a "paradigm" — a shared set of assumptions, methods, and exemplary problems that guides research. Paradigms are not just theories; they are the conceptual frameworks within which scientists see and make sense of their data.

Scientific progress is not continuous: most of the time, scientists do "normal science" — puzzle-solving within the established paradigm. But anomalies accumulate that normal science cannot explain. When enough anomalies accumulate, the field enters a crisis; eventually, a revolutionary restructuring of the paradigm occurs (a "paradigm shift"): Copernican astronomy, Newtonian mechanics, Darwinian evolution, quantum mechanics, plate tectonics.

Crucially, Kuhn argued that paradigm shifts are not purely rational events — they involve social and psychological factors (the old guard retiring, the young embracing new frameworks). Science is a human social enterprise, not a view from nowhere. This does not mean science is merely subjective, but it means the boundary between "scientific facts" and "social values" is more porous than the popular image of science allows.

WINNER: DO ARTIFACTS HAVE POLITICS?
Langdon Winner's essay "Do Artifacts Have Politics?" (1980) argues that technologies are not neutral tools that can be used for good or ill indifferently — they embed values, constraints, and power relations in their design. Winner's famous example: Robert Moses designed overpasses on Long Island parkways with low clearance to prevent buses (carrying poor and minority riders) from reaching Jones Beach, effectively segregating the beach by design. The artifact embodied a social policy without requiring explicit legislation.

Whether Moses consciously designed this or not is debated by historians. But Winner's broader point stands: designed artifacts shape behavior, constrain possibilities, and embody assumptions about who the user is and what counts as normal use. This has become urgent in the design of algorithms, AI systems, and digital platforms.

SURVEILLANCE CAPITALISM AND DIGITAL SELFHOOD
Shoshana Zuboff's The Age of Surveillance Capitalism (2019) extends Winner's analysis to the contemporary digital economy. Zuboff argues that surveillance capitalism — the economic logic of companies like Google, Facebook, and Amazon — transforms human experience itself into raw material for behavioral prediction products sold to advertisers. The result is not just privacy violation; it is a systematic effort to shape and predict human behavior at scale.

Zuboff's concern is fundamentally about human autonomy: the right to determine one's own future. Surveillance capitalism profits from reducing human behavior to predictable, influenceable patterns. This represents, Zuboff argues, a new form of power — "instrumentarian" power — that threatens the behavioral autonomy on which democratic self-governance depends.

AI AND THE HUMAN
Artificial intelligence raises the human-condition question in a new register. If AI systems can produce text, image, music, and argument — if they can pass professional exams, write code, and simulate conversation — what is distinctively human? Possible answers:
- Embodiment and mortality: human cognition is inseparable from having a body, needs, relationships, and a finite lifespan. AI has none of these.
- Consciousness and experience: AI processes information without (as far as we know) experiencing it. Whether this distinction will hold as AI advances is an open question.
- Responsibility and moral agency: humans can be held accountable; AI systems cannot currently bear responsibility for their outputs in the morally relevant sense.
These answers are not obvious. They deserve the kind of careful analysis this seminar is designed to practice.

DISCUSSION QUESTIONS
1. Kuhn argues that paradigm shifts are not purely rational. Does this make science less reliable as a guide to truth? What does it suggest about how we should hold scientific knowledge?
2. Winner argues that artifacts have politics. Identify a contemporary technology and analyze what values, assumptions, or power relations are embedded in its design.
3. Zuboff argues surveillance capitalism threatens behavioral autonomy. Is behavioral autonomy the right value to center? Are there other values at stake?`,
      },
      {
        moduleNumber: 6,
        title: 'Module 5: Art as Argument',
        materialType: 'lecture',
        content: `MODULE 5: ART AS ARGUMENT
Core Concept: Understanding how artworks make claims about human experience, and how ways of seeing are socially structured

BERGER: WAYS OF SEEING
John Berger's Ways of Seeing (1972, originally a BBC television series) is a polemical work of cultural criticism that argues our ways of seeing are historically conditioned, not natural. Every image is the product of choices about what to show and what to conceal; those choices encode values, assumptions, and power relations.

Berger's most influential argument concerns the European nude in oil painting (c. 1500–1900). The nude, Berger argues, is not simply a depiction of the unclothed human figure: it is structured by the male gaze. The women depicted are painted for the pleasure of a presumed male spectator; their poses, their returned glances, their lack of individuality — all bespeak a relation of subject (male viewer) and object (female body). The nude "surveys" herself as a man surveys a woman; she internalizes the surveying gaze. Berger contrasts this with nakedness — being seen for oneself, without performance for a spectator.

Berger extends this argument to advertising: contemporary publicity images, he argues, propose that the viewer can transform their life by acquiring a product. Glamour in advertising is a form of envy made pleasurable — a fantasy of alternative selfhood available through consumption.

MORRISON: LITERATURE AND MORAL IMAGINATION
Toni Morrison argues, in various essays and lectures, that literature does something that other forms of knowledge cannot: it creates an imaginative space in which the reader inhabits an experience radically unlike their own. In Playing in the Dark (1992), Morrison analyzes the "Africanist presence" in canonical American literature — how Black characters and the history of slavery have shaped the imagination of white American writers, often in ways the writers themselves did not recognize or acknowledge.

Morrison's argument is not only a critique. It is an assertion of the power of literary imagination to expose what other disciplines miss. The novelist can render the texture of racialized experience — the specific quality of living in a body marked as other — in a way that neither sociological data nor philosophical argument can fully capture. Literature, for Morrison, is not merely illustrative; it is epistemically generative.

SONTAG: ON PHOTOGRAPHY
Susan Sontag's On Photography (1977) argues that photographs have transformed how modern people experience the world. The camera creates the illusion of transparent access to reality — a "decisive moment" captured without interpretation. But Sontag argues this is an illusion: photographs are always selective, always framed, always made by someone with a perspective. The proliferation of photographic images does not make us more connected to reality; it substitutes image-reality for direct experience and cultivates a tourist relationship to the world — seeing from behind a lens rather than being present to what is seen.

Sontag also explores the ethics of suffering photography: images of war, poverty, and disaster. She later revised her position significantly in Regarding the Pain of Others (2003), where she argues that photographs can produce moral shock and stimulate political response — but only if accompanied by narrative that contextualizes the image.

ART AS ARGUMENT
What unites Berger, Morrison, and Sontag is the claim that artworks — paintings, novels, photographs — are not mere representations but arguments: they make claims about reality, they shape perception, they allocate moral attention. The study of art is therefore not an optional supplement to serious inquiry; it is a necessary component of understanding how human beings represent and misrepresent their world to themselves.

DISCUSSION QUESTIONS
1. Berger argues that the European nude is structured by the male gaze. Is this a historical claim, a normative claim, or both? Does Berger's argument extend to contemporary art?
2. Morrison argues that literature is epistemically generative — it tells us things we could not learn otherwise. Do you agree? What are the limits of this claim?
3. Sontag worries that photographic proliferation creates "image-fatigue" that insulates us from suffering. Does contemporary social media confirm or complicate this argument?`,
      },
      {
        moduleNumber: 7,
        title: 'Module 6: The Thesis Research Process',
        materialType: 'lecture',
        content: `MODULE 6: THE THESIS RESEARCH PROCESS
Core Skill: Developing a focused research question and beginning the argument map for your honors thesis

FROM INTEREST TO QUESTION
Every thesis begins with an interest — something you want to understand better. But an interest is not a research question. "I'm interested in social media and mental health" is not a research question. A research question specifies: a phenomenon, a perspective from which to examine it, and an implicit claim of significance.

The path from interest to question:
1. Start with a phenomenon you care about: climate anxiety among college students, AI-generated art and copyright, food sovereignty movements, Toni Morrison's late novels, the history of UK's undergraduate curriculum.
2. Identify what you want to know: not everything about it, but a specific aspect or problem.
3. Frame it as a question that your methodology can answer: "How do first-generation college students negotiate competing definitions of academic success in their first year?" (qualitative), "What is the relationship between social media use and reported anxiety among college students?" (quantitative), "What does Morrison's Beloved argue about the relationship between memory and freedom?" (interpretive/humanistic).
4. Check the question's significance: why does it matter? Who cares about the answer?

ARGUMENT MAPPING
Argument mapping is a technique for planning the structure of an extended argument before writing. It works by identifying:
- The thesis claim: a specific, arguable proposition that your research will support
- The supporting claims (sub-arguments): 3–5 claims that together constitute the evidence for the thesis
- The evidence for each supporting claim: specific textual passages, data, case analyses, secondary sources
- The anticipated counterarguments: what is the strongest objection to your thesis, and how do you respond?

An argument map is not an outline. An outline lists what you will say; an argument map diagrams why each step follows from the previous and what supports each claim. Writing from an argument map produces essays with clear logical structure; writing from an outline often produces a list of points.

THE THESIS STATEMENT
A thesis statement for an honors thesis should be:
- Specific: "The three novels of Morrison's Toni Trilogy use fragmented temporal structure to argue that American racial trauma cannot be narrativized as a completed past." Not: "Morrison's novels are important."
- Arguable: another scholar could reasonably disagree; there is something to be shown, not merely reported
- Significant: it tells the reader something worth knowing; it changes or complicates their understanding
- Adequately scoped: you can support it in the available space and time

The thesis statement should appear in the first section of your proposal, and it will likely revise many times as your research progresses. This is expected and good. The thesis you begin with is a working hypothesis; the thesis you end with should have been tested and refined by your research.

PRELIMINARY SOURCES AND THE HONORS BIBLIOGRAPHY
Your thesis proposal requires a preliminary bibliography of at least 8 sources. These sources should include:
- At least 3 peer-reviewed scholarly articles or book chapters in your field
- At least 1 book-length study (monograph) closely related to your topic
- Primary sources appropriate to your question (text, dataset, archival material, case)
- For interdisciplinary proposals: sources from at least 2 different fields

Use databases appropriate to your field: JSTOR, Project MUSE, PhilPapers, ERIC, PsycINFO, EconLit, etc. Your thesis advisor (or this course instructor) can help you identify the right databases for your topic.

TIMELINE FOR THESIS COMPLETION
Typical honors thesis timeline:
- Fall semester of junior year: identify advisor, develop research question, begin literature review
- Spring of junior year (this course): write formal proposal, secure IRB approval if needed
- Summer/Fall of senior year: data collection or primary research
- Fall of senior year: draft writing
- Spring of senior year: revisions, final submission, oral defense

Not all theses follow this timeline; some students begin earlier or complete in less time. The point is that the thesis is a multi-semester project and should be treated as one. Do not begin writing in the semester you plan to graduate.

DISCUSSION QUESTIONS
1. Take your current area of interest and try to draft a research question following the four steps above. Bring it to class for peer feedback.
2. What is the difference between a thesis statement and an argument? Can you have an argument without a thesis statement?
3. Why is identifying counterarguments important to producing a strong thesis argument? What happens to a thesis that ignores the best objections to it?`,
      },
      {
        moduleNumber: 8,
        title: 'Thesis Proposal Rubric',
        materialType: 'rubric',
        content: `HONORS SEMINAR: THE HUMAN CONDITION — THESIS PROPOSAL RUBRIC
HON 251 | Lewis Honors College | Spring 2026
Worth 30% of Final Grade

The Thesis Proposal is a formal research proposal of 8–12 pages (body text only). It is evaluated across five criteria. Each criterion is worth 20 points; total = 100 proposal points, which converts to 30% of your course grade.

─────────────────────────────────────────────────
CRITERION 1: RESEARCH QUESTION AND SIGNIFICANCE
Weight: 20 points

20–18 pts (Excellent): The research question is clearly stated, specific, and arguable — it cannot be answered by a simple lookup or agreed to by everyone. The significance section explains why this question matters: who benefits from the answer, what gap it addresses in the existing conversation, and why the honors seminar course has prepared the student to address it. The question is appropriately scoped for a thesis project.

17–14 pts (Proficient): Research question clearly stated; significance present but partially developed. The question may be slightly too broad or too narrow; the student demonstrates awareness and notes how they will manage scope. Connection between question and course materials is present but underdeveloped.

13–10 pts (Developing): Research question identified but stated as a topic or interest area rather than a question ("I will explore the role of social media in democracy"). Significance is generic ("this is important because many people use social media"). Scope not addressed.

9–0 pts (Beginning): No clear research question; or question is so broad as to be unanswerable. No significance section.

─────────────────────────────────────────────────
CRITERION 2: PRELIMINARY LITERATURE AND THEORETICAL FRAMEWORK
Weight: 20 points

20–18 pts: Minimum 8 sources identified; at least 3 are peer-reviewed scholarly works. The review synthesizes (does not merely list) the most relevant prior work. A theoretical framework is identified: the student names the intellectual tradition or theoretical lens through which they will approach the question (e.g., feminist phenomenology, Rawlsian political philosophy, narrative identity theory) and explains why it fits the question. The student shows awareness of how their question relates to debates in the relevant field.

17–14 pts: Minimum 6–7 sources present. Literature section mostly summarizes sources but identifies key themes. Theoretical framework named but not fully explained. Prior work in the field addressed.

13–10 pts: Fewer than 6 sources. Literature section is a list of annotations. No theoretical framework identified or the concept is confused with a methodology (e.g., "my theoretical framework is interviews").

9–0 pts: Fewer than 4 sources. No literature synthesis. No theoretical framework.

─────────────────────────────────────────────────
CRITERION 3: METHODOLOGY
Weight: 20 points

20–18 pts: The methodology section clearly identifies the type of inquiry (humanistic/interpretive, qualitative, quantitative, historical, archival, etc.) and provides a specific, realistic plan for how the thesis argument will be built. For interpretive/humanistic theses: primary texts or objects of analysis are identified; analytic approach (close reading, discourse analysis, philosophical analysis) is specified. For empirical theses: data sources, collection methods, and analysis approach are clearly described. IRB implications are addressed if human subjects are involved.

17–14 pts: Type of inquiry identified; plan partially specified. For humanistic theses: primary texts identified but analytic approach vague. For empirical theses: data sources identified but collection and analysis methods not fully specified.

13–10 pts: Methodology confused with method (lists "I will do research" or "I will interview people") without design rationale. Primary texts or data sources not identified. No consideration of IRB if applicable.

9–0 pts: No methodology section. Or the methodology section describes a project that is not a thesis (e.g., "I will create a website about this topic").

─────────────────────────────────────────────────
CRITERION 4: PRELIMINARY THESIS ARGUMENT (WORKING THESIS)
Weight: 20 points

20–18 pts: A specific, arguable working thesis is stated in the proposal. The student demonstrates awareness that this may evolve as research proceeds and explains how. The working thesis connects directly to the research question, the theoretical framework, and the methodology — it is not a random claim but the anticipated conclusion of the planned inquiry. A brief argument map or outline of supporting claims is present.

17–14 pts: Working thesis present and arguable; connection to methodology partially established. Argument map or outline present but may be underdeveloped.

13–10 pts: Working thesis is a topic statement or obvious claim. Argument map absent. Student appears to have begun with a conclusion and is planning to confirm it.

9–0 pts: No working thesis. Or the thesis is a question rather than a claim. No argument map.

─────────────────────────────────────────────────
CRITERION 5: TIMELINE AND PRESENTATION
Weight: 20 points

20–18 pts: A realistic semester-by-semester timeline for thesis completion is provided, with specific milestones (advisor meetings, chapter drafts, data collection windows, IRB submission, defense). The proposal is written in formal academic prose, free of grammatical error, with consistent citation format throughout. Length falls within the 8–12 page range. The proposal as a whole reads as a polished document the student could share with a potential thesis advisor.

17–14 pts: Timeline present with most milestones identified; some milestones vague or unrealistic. Prose is generally clean with minor errors. Slightly outside the page range. Citation format present but inconsistent.

13–10 pts: Timeline present but not milestone-based ("I will write the thesis in fall semester"). Multiple grammatical errors that distract from the argument. Citation format applied only partially.

9–0 pts: No timeline. Prose quality prevents comprehension. No citation format evident.`,
      },
    ],
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION — called from prisma/seed.ts
// ─────────────────────────────────────────────────────────────────────────────

export async function seedStarterCourses(
  prisma: PrismaClient,
  instructorId: string
) {
  console.log(`Seeding ${STARTER_COURSES.length} starter courses...`)

  for (const courseData of STARTER_COURSES) {
    const course = await prisma.course.upsert({
      where: { courseCode: courseData.courseCode },
      update: { instructorId },
      create: {
        courseCode: courseData.courseCode,
        title: courseData.title,
        description: courseData.description,
        semester: courseData.semester,
        instructorId,
        isPublic: true,
        importSource: 'starter-template',
      },
    })

    for (const material of courseData.materials) {
      const existing = await prisma.courseMaterial.findFirst({
        where: { courseId: course.id, title: material.title },
      })

      if (!existing) {
        await prisma.courseMaterial.create({
          data: {
            courseId: course.id,
            title: material.title,
            content: material.content,
            materialType: material.materialType,
            moduleNumber: material.moduleNumber,
            isVisible: material.isVisible ?? true,
          },
        })
      }
    }

    console.log(`  ✓ ${courseData.courseCode} — ${courseData.title}`)
  }

  console.log('Starter courses complete.')
}
