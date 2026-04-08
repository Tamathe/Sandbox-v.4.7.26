import type { PlaygroundTemplate } from './index';

export const TEMPLATE_META: PlaygroundTemplate = {
  key: 'poetry-meter',
  title: 'Poetry Meter & Rhyme Analyzer',
  description: 'Paste a poem to see stressed/unstressed syllables, meter identification, rhyme scheme, and literary device detection.',
  category: 'training',
  thumbnailEmoji: '✒️',
  editorScrollTarget: '// ✒️ METER ANALYSIS ENGINE',
  warmStartConfig: {
    previewRatio: 0.65,
    autoRunPreview: true,
    chatCollapsed: true,
    bannerText: '✒️ Paste or select a poem. See syllable stress patterns, meter type, and rhyme scheme instantly.',
    ctaLabel: '▶ Analyze Poem',
    ctaPulseDurationMs: 30000,
  },
};

export const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Poetry Meter &amp; Rhyme Analyzer</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      window.parent.postMessage({ type: 'runtime-error', message: String(msg), source: src, line: line, column: col }, '*');
    };
    window.onunhandledrejection = function(e) {
      window.parent.postMessage({ type: 'runtime-error', message: String(e.reason) }, '*');
    };
  <\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #faf8f5; color: #1a1a1a; }
    .poem-font { font-family: 'Crimson Pro', Georgia, serif; }
    .parchment { background: linear-gradient(135deg, #fdf8f0 0%, #f5efe6 50%, #fdf8f0 100%); }
    @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade { animation: fade-in 0.4s ease-out forwards; }
    @keyframes pulse-cta { 0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); } 50% { box-shadow: 0 0 16px 4px rgba(79,70,229,0.2); } }
    .pulse-cta { animation: pulse-cta 2s ease-in-out infinite; }
    .stressed { color: #1e40af; font-weight: 700; }
    .unstressed { color: #9ca3af; }
    .rhyme-A { background: rgba(239,68,68,0.15); border-bottom: 2px solid #ef4444; }
    .rhyme-B { background: rgba(59,130,246,0.15); border-bottom: 2px solid #3b82f6; }
    .rhyme-C { background: rgba(34,197,94,0.15); border-bottom: 2px solid #22c55e; }
    .rhyme-D { background: rgba(168,85,247,0.15); border-bottom: 2px solid #a855f7; }
    .rhyme-E { background: rgba(245,158,11,0.15); border-bottom: 2px solid #f59e0b; }
    .rhyme-F { background: rgba(236,72,153,0.15); border-bottom: 2px solid #ec4899; }
    .rhyme-G { background: rgba(20,184,166,0.15); border-bottom: 2px solid #14b8a6; }
    .rhyme-H { background: rgba(249,115,22,0.15); border-bottom: 2px solid #f97316; }
    .device-highlight { border-radius: 3px; padding: 0 2px; }
    .alliteration-hl { background: rgba(251,191,36,0.25); }
    .assonance-hl { background: rgba(167,139,250,0.25); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // ✒️ METER ANALYSIS ENGINE
    // ============================================================
    // A comprehensive poetry analysis tool that identifies syllable
    // stress, meter, rhyme scheme, and literary devices.
    // ============================================================

    const { useState, useEffect, useMemo, useCallback, useRef } = React;

    // ── PRE-LOADED POEMS ──────────────────────────────────────
    const POEMS = {
      'sonnet18': {
        title: 'Sonnet 18',
        author: 'William Shakespeare',
        text: \`Shall I compare thee to a summer's day?
Thou art more lovely and more temperate:
Rough winds do shake the darling buds of May,
And summer's lease hath all too short a date:
Sometime too hot the eye of heaven shines,
And often is his gold complexion dimm'd;
And every fair from fair sometime declines,
By chance, or nature's changing course untrimm'd;
But thy eternal summer shall not fade,
Nor lose possession of that fair thou ow'st;
Nor shall death brag thou wander'st in his shade,
When in eternal lines to time thou grow'st:
So long as men can breathe, or eyes can see,
So long lives this, and this gives life to thee.\`
      },
      'road': {
        title: 'The Road Not Taken',
        author: 'Robert Frost',
        text: \`Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same,

And both that morning equally lay
In leaves no step had trodden black.
Oh, I kept the first for another day!
Yet knowing how way leads on to way,
I doubted if I should ever come back.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.\`
      },
      'death': {
        title: 'Because I could not stop for Death',
        author: 'Emily Dickinson',
        text: \`Because I could not stop for Death –
He kindly stopped for me –
The Carriage held but just Ourselves –
And Immortality.

We slowly drove – He knew no haste
And I had put away
My labor and my leisure too,
For His Civility –

We passed the School, where Children strove
At Recess – in the Ring –
We passed the Fields of Gazing Grain –
We passed the Setting Sun –

Or rather – He passed Us –
The Dews drew quivering and Chill –
For only Gossamer, my Gown –
My Tippet – only Tulle –\`
      },
      'raven': {
        title: 'The Raven (Stanzas 1–3)',
        author: 'Edgar Allan Poe',
        text: \`Once upon a midnight dreary, while I pondered, weak and weary,
Over many a quaint and curious volume of forgotten lore—
While I nodded, nearly napping, suddenly there came a tapping,
As of some one gently rapping, rapping at my chamber door.
"'Tis some visitor," I muttered, "tapping at my chamber door—
Only this and nothing more."

Ah, distinctly I remember it was in the bleak December;
And each separate dying ember wrought its ghost upon the floor.
Eagerly I wished the morrow;—vainly I had sought to borrow
From my books surcease of sorrow—sorrow for the lost Lenore—
For the rare and radiant maiden whom the angels name Lenore—
Nameless here for evermore.

And the silken, sad, uncertain rustling of each purple curtain
Thrilled me—filled me with fantastic terrors never felt before;
So that now, to still the beating of my heart, I stood repeating
"'Tis some visitor entreating entrance at my chamber door—
Some late visitor entreating entrance at my chamber door;—
This it is and nothing more."\`
      },
      'harlem': {
        title: 'Harlem',
        author: 'Langston Hughes',
        text: \`What happens to a dream deferred?

Does it dry up
like a raisin in the sun?
Or fester like a sore—
And then run?

Does it stink like rotten meat?
Or crust and sugar over—
like a syrupy sweet?

Maybe it just sags
like a heavy load.

Or does it explode?\`
      }
    };

    // ── SYLLABLE STRESS DICTIONARY ────────────────────────────
    // Key: lowercase word → array of 0 (unstressed) and 1 (stressed)
    // Based on CMU Pronouncing Dictionary stress patterns
    const STRESS_DICT = {
      // ─── Articles, prepositions, conjunctions (function words) ───
      'a': [0], 'an': [0], 'the': [0], 'of': [0], 'to': [0], 'in': [0],
      'on': [0], 'at': [0], 'by': [0], 'for': [0], 'with': [0], 'from': [0],
      'and': [0], 'but': [0], 'or': [0], 'nor': [0], 'so': [0], 'yet': [0],
      'as': [0], 'if': [0], 'than': [0], 'that': [0], 'up': [0], 'its': [0],
      'it': [0], 'is': [0], 'am': [0], 'are': [0], 'was': [0], 'were': [0],
      'be': [0], 'been': [0], 'has': [0], 'had': [0], 'have': [0], 'do': [0],
      'does': [0], 'did': [0], 'my': [0], 'his': [0], 'her': [0], 'our': [0],
      'your': [0], 'their': [0], 'this': [0], 'not': [1], 'no': [1],

      // ─── Common monosyllabic content words ───
      'shall': [1], 'will': [1], 'can': [1], 'could': [1], 'would': [1],
      'should': [1], 'may': [1], 'might': [1], 'must': [1], 'need': [1],
      'dare': [1], 'day': [1], 'night': [1], 'time': [1], 'life': [1],
      'death': [1], 'love': [1], 'hate': [1], 'hope': [1], 'fear': [1],
      'joy': [1], 'grief': [1], 'pain': [1], 'heart': [1], 'soul': [1],
      'mind': [1], 'eye': [1], 'hand': [1], 'face': [1], 'voice': [1],
      'word': [1], 'name': [1], 'way': [1], 'road': [1], 'path': [1],
      'world': [1], 'earth': [1], 'sky': [1], 'sun': [1], 'moon': [1],
      'star': [1], 'light': [1], 'dark': [1], 'fire': [1], 'wind': [1],
      'rain': [1], 'snow': [1], 'sea': [1], 'wave': [1], 'tree': [1],
      'leaf': [1], 'rose': [1], 'bird': [1], 'song': [1], 'dream': [1],
      'sleep': [1], 'wake': [1], 'live': [1], 'die': [1], 'rise': [1],
      'fall': [1], 'come': [1], 'go': [1], 'run': [1], 'walk': [1],
      'stand': [1], 'sit': [1], 'see': [1], 'hear': [1], 'know': [1],
      'think': [1], 'feel': [1], 'speak': [1], 'tell': [1], 'give': [1],
      'take': [1], 'make': [1], 'find': [1], 'keep': [1], 'hold': [1],
      'turn': [1], 'leave': [1], 'bring': [1], 'break': [1], 'build': [1],
      'call': [1], 'read': [1], 'write': [1], 'draw': [1], 'play': [1],
      'work': [1], 'move': [1], 'look': [1], 'long': [1], 'still': [1],
      'first': [1], 'last': [1], 'new': [1], 'old': [1], 'good': [1],
      'great': [1], 'high': [1], 'deep': [1], 'true': [1], 'fair': [1],
      'sweet': [1], 'bright': [1], 'pale': [1], 'cold': [1], 'hot': [1],
      'gold': [1], 'black': [1], 'white': [1], 'red': [1], 'green': [1],
      'blue': [1], 'gray': [1], 'grey': [1], 'thou': [1], 'thee': [0],
      'thy': [0], 'art': [1], 'hath': [1], 'doth': [1],
      'more': [1], 'most': [1], 'less': [1], 'least': [1],
      'all': [1], 'each': [1], 'both': [1], 'few': [1], 'much': [1],
      'own': [1], 'same': [1], 'such': [1], 'here': [1], 'there': [1],
      'where': [1], 'when': [1], 'then': [1], 'now': [1], 'how': [1],
      'why': [1], 'what': [1], 'who': [1], 'whom': [0],
      'just': [1], 'like': [1], 'well': [1], 'back': [1], 'down': [1],
      'out': [1], 'off': [1], 'through': [1], 'once': [1], 'men': [1],
      'man': [1], 'god': [1], 'king': [1], 'lord': [1], 'war': [1],
      'peace': [1], 'land': [1], 'home': [1], 'door': [1], 'floor': [1],
      'wall': [1], 'room': [1], 'bed': [1], 'stone': [1], 'dust': [1],
      'blood': [1], 'bone': [1], 'flesh': [1], 'breath': [1], 'shade': [1],
      'sigh': [1], 'tear': [1], 'smile': [1], 'kiss': [1], 'touch': [1],
      'grace': [1], 'power': [1], 'truth': [1], 'youth': [1],
      'spring': [1], 'flew': [1], 'grows': [1], 'shines': [1], 'fade': [1],
      'lose': [1], 'brag': [1], 'lives': [1], 'gives': [1], 'eyes': [1],
      'lines': [1], 'buds': [1], 'winds': [1], 'rough': [1],
      'leapt': [1], 'wept': [1], 'crept': [1], 'slept': [1],
      'threw': [1], 'grew': [1], 'knew': [1], 'blew': [1], 'drew': [1],
      'wore': [1], 'bore': [1], 'tore': [1], 'swore': [1],
      'bound': [1], 'found': [1], 'ground': [1], 'sound': [1], 'round': [1],
      'lay': [1], 'say': [1], 'pray': [1], 'stay': [1],
      'dry': [1], 'cry': [1], 'fly': [1], 'try': [1], 'high': [1],
      'kept': [1], 'wept': [1], 'step': [1], 'steps': [1],
      'made': [1], 'paid': [1], 'laid': [1], 'said': [1],
      'left': [1], 'bent': [1], 'meant': [1], 'sent': [1], 'spent': [1],
      'stink': [1], 'crust': [1], 'sags': [1], 'load': [1], 'meat': [1],
      'sore': [1], 'drove': [1], 'strove': [1], 'grain': [1],
      'gown': [1], 'chill': [1], 'tulle': [1], 'dews': [1], 'ring': [1],

      // ─── Two-syllable words ───
      'compare': [0, 1], 'summer': [1, 0], 'lovely': [1, 0], 'darling': [1, 0],
      'temperate': [1, 0, 0], 'sometime': [1, 0], 'heaven': [1, 0],
      'often': [1, 0], 'nature': [1, 0], 'changing': [1, 0], 'golden': [1, 0],
      'complexion': [0, 1, 0], 'declines': [0, 1], 'except': [0, 1],
      'eternal': [0, 1, 0], 'possess': [0, 1], 'possession': [0, 1, 0],
      'wander': [1, 0], 'wonder': [1, 0], 'after': [1, 0], 'before': [1, 0],
      'again': [0, 1], 'against': [0, 1], 'about': [0, 1], 'above': [0, 1],
      'below': [0, 1], 'between': [0, 1], 'beyond': [0, 1], 'upon': [0, 1],
      'within': [0, 1], 'without': [0, 1], 'along': [0, 1], 'among': [0, 1],
      'under': [1, 0], 'over': [1, 0], 'even': [1, 0], 'ever': [1, 0],
      'never': [1, 0], 'always': [1, 0], 'only': [1, 0], 'also': [1, 0],
      'open': [1, 0], 'broken': [1, 0], 'fallen': [1, 0], 'taken': [1, 0],
      'given': [1, 0], 'hidden': [1, 0], 'spoken': [1, 0], 'chosen': [1, 0],
      'water': [1, 0], 'river': [1, 0], 'forest': [1, 0], 'garden': [1, 0],
      'flower': [1, 0], 'mountain': [1, 0], 'valley': [1, 0], 'island': [1, 0],
      'shadow': [1, 0], 'window': [1, 0], 'mirror': [1, 0], 'silver': [1, 0],
      'golden': [1, 0], 'purple': [1, 0], 'silent': [1, 0], 'gentle': [1, 0],
      'bitter': [1, 0], 'tender': [1, 0], 'weary': [1, 0], 'dreary': [1, 0],
      'lonely': [1, 0], 'slowly': [1, 0], 'softly': [1, 0], 'kindly': [1, 0],
      'midnight': [1, 0], 'nothing': [1, 0], 'something': [1, 0],
      'someone': [1, 0], 'anyone': [1, 0, 0], 'everyone': [1, 0, 0],
      'morning': [1, 0], 'evening': [1, 0], 'autumn': [1, 0],
      'winter': [1, 0], 'myself': [0, 1], 'itself': [0, 1],
      'herself': [0, 1], 'himself': [0, 1], 'because': [0, 1],
      'perhaps': [0, 1], 'await': [0, 1], 'arise': [0, 1],
      'begin': [0, 1], 'become': [0, 1], 'belong': [0, 1],
      'believe': [0, 1], 'between': [0, 1], 'beside': [0, 1],
      'beyond': [0, 1], 'forget': [0, 1], 'forgive': [0, 1],
      'desire': [0, 1], 'despair': [0, 1], 'delight': [0, 1],
      'return': [0, 1], 'remain': [0, 1], 'remove': [0, 1],
      'repeat': [0, 1], 'reply': [0, 1], 'reveal': [0, 1],
      'today': [0, 1], 'tonight': [0, 1], 'toward': [0, 1],
      'alone': [0, 1], 'alive': [0, 1], 'asleep': [0, 1], 'awake': [0, 1],
      'beauty': [1, 0], 'body': [1, 0], 'city': [1, 0], 'country': [1, 0],
      'spirit': [1, 0], 'memory': [1, 0, 0], 'history': [1, 0, 0],
      'dying': [1, 0], 'living': [1, 0], 'falling': [1, 0], 'rising': [1, 0],
      'burning': [1, 0], 'turning': [1, 0], 'singing': [1, 0],
      'passing': [1, 0], 'growing': [1, 0], 'flowing': [1, 0],
      'gazing': [1, 0], 'setting': [1, 0], 'getting': [1, 0],
      'letting': [1, 0], 'resting': [1, 0], 'telling': [1, 0],
      'tapping': [1, 0], 'rapping': [1, 0], 'napping': [1, 0],
      'nodded': [1, 0], 'muttered': [1, 0],
      'having': [1, 0], 'being': [1, 0], 'seeing': [1, 0],
      'knowing': [1, 0], 'going': [1, 0], 'coming': [1, 0],
      'looking': [1, 0], 'standing': [1, 0], 'walking': [1, 0],
      'reaching': [1, 0], 'seeking': [1, 0], 'speaking': [1, 0],
      'sleeping': [1, 0], 'keeping': [1, 0], 'leaving': [1, 0],
      'early': [1, 0], 'clearly': [1, 0], 'nearly': [1, 0], 'dearly': [1, 0],
      'deeply': [1, 0], 'sweetly': [1, 0], 'greatly': [1, 0],
      'travel': [1, 0], 'yellow': [1, 0], 'grassy': [1, 0],
      'sorry': [1, 0], 'wanted': [1, 0], 'doubted': [1, 0],
      'trodden': [1, 0], 'equally': [1, 0, 0], 'another': [0, 1, 0],
      'diverged': [0, 1], 'traveled': [1, 0], 'difference': [1, 0, 0],
      'ages': [1, 0], 'leaves': [1], 'roads': [1], 'hence': [1],
      'somewhere': [1, 0], 'undergo': [0, 0, 1], 'undergrowth': [1, 0, 0],
      'better': [1, 0], 'really': [1, 0],

      'labor': [1, 0], 'leisure': [1, 0], 'carriage': [1, 0],
      'recess': [1, 0], 'children': [1, 0], 'gossamer': [1, 0, 0],
      'tippet': [1, 0], 'quivering': [1, 0, 0], 'civility': [0, 1, 0, 0],
      'immortality': [0, 1, 0, 1, 0],
      'ourselves': [0, 1],

      'ember': [1, 0], 'chamber': [1, 0], 'curtain': [1, 0],
      'certain': [1, 0], 'rustling': [1, 0], 'silken': [1, 0],
      'beating': [1, 0], 'entrance': [1, 0], 'visitor': [1, 0, 0],
      'volume': [1, 0], 'curious': [1, 0, 0], 'forgotten': [0, 1, 0],
      'remember': [0, 1, 0], 'december': [0, 1, 0],
      'separate': [1, 0, 0], 'eagerly': [1, 0, 0], 'vainly': [1, 0],
      'wrought': [1], 'ghost': [1], 'sought': [1], 'borrow': [1, 0],
      'sorrow': [1, 0], 'morrow': [1, 0], 'radiant': [1, 0, 0],
      'maiden': [1, 0], 'angels': [1, 0], 'nameless': [1, 0],
      'fantastic': [0, 1, 0], 'terrors': [1, 0], 'thrilled': [1],
      'filled': [1], 'repeating': [0, 1, 0], 'entreating': [0, 1, 0],

      'raisin': [1, 0], 'fester': [1, 0], 'rotten': [1, 0],
      'sugar': [1, 0], 'syrupy': [1, 0, 0], 'heavy': [1, 0],
      'deferred': [0, 1], 'explode': [0, 1], 'happens': [1, 0],
      'maybe': [1, 0],

      // ─── Three-syllable words ───
      'beautiful': [1, 0, 0], 'wonderful': [1, 0, 0], 'terrible': [1, 0, 0],
      'possible': [1, 0, 0], 'impossible': [0, 1, 0, 0],
      'yesterday': [1, 0, 0], 'tomorrow': [0, 1, 0], 'forever': [0, 1, 0],
      'together': [0, 1, 0], 'remember': [0, 1, 0], 'discover': [0, 1, 0],
      'consider': [0, 1, 0], 'continue': [0, 1, 0], 'already': [1, 1, 0],
      'however': [0, 1, 0], 'wherever': [0, 1, 0], 'whatever': [0, 1, 0],
      'whenever': [0, 1, 0], 'everything': [1, 0, 0], 'anything': [1, 0, 0],
      'wandering': [1, 0, 0], 'gathering': [1, 0, 0], 'glittering': [1, 0, 0],
      'offering': [1, 0, 0], 'suffering': [1, 0, 0], 'thundering': [1, 0, 0],
      'following': [1, 0, 0], 'borrowing': [1, 0, 0], 'narrowing': [1, 0, 0],
      'powerful': [1, 0, 0], 'sorrowful': [1, 0, 0], 'energy': [1, 0, 0],
      'traveler': [1, 0, 0], 'evermore': [1, 0, 1], 'nevermore': [1, 0, 1],
      'pondered': [1, 0], 'distinctly': [0, 1, 0],
      'uncertain': [0, 1, 0], 'surcease': [0, 1],

      // ─── Four-syllable words ───
      'eternity': [0, 1, 0, 0], 'melancholy': [1, 0, 0, 0],
      'imagination': [0, 1, 0, 1, 0], 'understanding': [0, 0, 1, 0],
      'everlasting': [1, 0, 1, 0], 'overwhelming': [0, 0, 1, 0],
      'opportunity': [0, 0, 1, 0, 0], 'university': [0, 0, 1, 0, 0],

      // ─── Contractions & archaic ───
      "summer's": [1, 0], "nature's": [1, 0], "heaven's": [1, 0],
      "ow'st": [1], "grow'st": [1], "wander'st": [1, 0],
      "dimm'd": [1], "untrimm'd": [0, 1],
      "'tis": [1],
    };

    // ── SYLLABLE COUNTING HEURISTIC ──────────────────────────
    function countSyllables(word) {
      const w = word.toLowerCase().replace(/[^a-z]/g, '');
      if (!w) return 0;
      if (w.length <= 2) return 1;
      let count = 0;
      const vowels = 'aeiouy';
      let prevVowel = false;
      for (let i = 0; i < w.length; i++) {
        const isV = vowels.includes(w[i]);
        if (isV && !prevVowel) count++;
        prevVowel = isV;
      }
      // silent e
      if (w.endsWith('e') && !w.endsWith('le') && count > 1) count--;
      // -ed endings
      if (w.endsWith('ed') && !w.endsWith('ted') && !w.endsWith('ded') && count > 1) count--;
      return Math.max(1, count);
    }

    // ── GET STRESS PATTERN FOR A WORD ─────────────────────────
    function getStressPattern(word) {
      const clean = word.toLowerCase().replace(/[^a-z']/g, '');
      if (!clean) return [];
      // Check dictionary
      if (STRESS_DICT[clean]) return [...STRESS_DICT[clean]];
      // Check without trailing s/ed
      if (clean.endsWith('s') && STRESS_DICT[clean.slice(0, -1)]) {
        return [...STRESS_DICT[clean.slice(0, -1)]];
      }
      if (clean.endsWith('ed') && STRESS_DICT[clean.slice(0, -2)]) {
        return [...STRESS_DICT[clean.slice(0, -2)]];
      }
      if (clean.endsWith('ing') && STRESS_DICT[clean.slice(0, -3)]) {
        return [...STRESS_DICT[clean.slice(0, -3)]];
      }
      if (clean.endsWith('ly') && STRESS_DICT[clean.slice(0, -2)]) {
        const base = [...STRESS_DICT[clean.slice(0, -2)]];
        base.push(0);
        return base;
      }
      // Heuristic: generate pattern based on syllable count
      const sylCount = countSyllables(clean);
      if (sylCount === 1) return [1];
      if (sylCount === 2) {
        // Common prefixes that are unstressed
        const unstressedPrefixes = ['a','be','de','re','un','in','en','em','ex','dis','mis','pre','pro','con','com'];
        for (const p of unstressedPrefixes) {
          if (clean.startsWith(p) && clean.length > p.length + 1) return [0, 1];
        }
        // Common stressed-first patterns
        return [1, 0];
      }
      // For 3+ syllables, alternate starting with unstressed
      const pattern = [];
      for (let i = 0; i < sylCount; i++) {
        pattern.push(i % 2 === 0 ? 0 : 1);
      }
      // Ensure at least one stress
      if (!pattern.includes(1) && pattern.length > 0) pattern[pattern.length > 1 ? 1 : 0] = 1;
      return pattern;
    }

    // ── RHYME DETECTION ───────────────────────────────────────
    function getLastWord(line) {
      const words = line.trim().replace(/[^a-zA-Z\\s'-]/g, '').split(/\\s+/);
      return words[words.length - 1]?.toLowerCase() || '';
    }

    function getPhonemeEnding(word) {
      // Simplified phoneme ending — last vowel cluster + trailing consonants
      const w = word.toLowerCase().replace(/[^a-z]/g, '');
      const match = w.match(/([aeiouy]+[^aeiouy]*)$/);
      return match ? match[1] : w.slice(-2);
    }

    function rhymeScore(w1, w2) {
      if (!w1 || !w2 || w1 === w2) return 0;
      const e1 = getPhonemeEnding(w1);
      const e2 = getPhonemeEnding(w2);
      // Perfect rhyme
      if (e1 === e2) return 3;
      // Eye rhyme (spelling match but different sound isn't detectable here, so treat same)
      if (w1.slice(-3) === w2.slice(-3) && w1.slice(-3).length >= 2) return 2;
      if (w1.slice(-2) === w2.slice(-2)) return 2;
      // Slant rhyme (vowel match)
      const v1 = e1.replace(/[^aeiouy]/g, '');
      const v2 = e2.replace(/[^aeiouy]/g, '');
      if (v1 && v1 === v2) return 1;
      return 0;
    }

    function detectRhymeScheme(lines) {
      const scheme = [];
      const endWords = lines.map(l => getLastWord(l));
      let nextLetter = 0;
      const assigned = {};

      for (let i = 0; i < endWords.length; i++) {
        if (!endWords[i]) { scheme.push(null); continue; }
        let found = false;
        for (let j = 0; j < i; j++) {
          if (scheme[j] === null) continue;
          const score = rhymeScore(endWords[i], endWords[j]);
          if (score >= 2) {
            scheme.push({ letter: scheme[j].letter, type: score === 3 ? 'perfect' : score === 2 ? 'slant' : 'eye' });
            found = true;
            break;
          }
        }
        if (!found) {
          scheme.push({ letter: String.fromCharCode(65 + (nextLetter % 26)), type: 'none' });
          nextLetter++;
        }
      }
      return scheme;
    }

    // ── METER IDENTIFICATION ──────────────────────────────────
    function identifyMeter(stressPatterns) {
      // Flatten all lines into a single stress sequence per line, then find dominant foot
      const footCounts = { iamb: 0, trochee: 0, anapest: 0, dactyl: 0, spondee: 0 };
      const lineLengths = [];

      for (const linePattern of stressPatterns) {
        if (linePattern.length < 2) { lineLengths.push(0); continue; }
        let feet = 0;
        for (let i = 0; i < linePattern.length - 1; i++) {
          if (linePattern[i] === 0 && linePattern[i + 1] === 1) { footCounts.iamb++; feet++; i++; }
          else if (linePattern[i] === 1 && linePattern[i + 1] === 0) { footCounts.trochee++; feet++; i++; }
          else if (i < linePattern.length - 2 && linePattern[i] === 0 && linePattern[i + 1] === 0 && linePattern[i + 2] === 1) { footCounts.anapest++; feet++; i += 2; }
          else if (i < linePattern.length - 2 && linePattern[i] === 1 && linePattern[i + 1] === 0 && linePattern[i + 2] === 0) { footCounts.dactyl++; feet++; i += 2; }
          else if (linePattern[i] === 1 && linePattern[i + 1] === 1) { footCounts.spondee++; feet++; i++; }
        }
        lineLengths.push(feet);
      }

      const totalFeet = Object.values(footCounts).reduce((a, b) => a + b, 0);
      if (totalFeet === 0) return { foot: 'Unknown', length: 'Unknown', label: 'Free Verse', confidence: 0 };

      const dominant = Object.entries(footCounts).sort((a, b) => b[1] - a[1])[0];
      const footName = { iamb: 'Iamb', trochee: 'Trochee', anapest: 'Anapest', dactyl: 'Dactyl', spondee: 'Spondee' }[dominant[0]];
      const footAdj = { iamb: 'Iambic', trochee: 'Trochaic', anapest: 'Anapestic', dactyl: 'Dactylic', spondee: 'Spondaic' }[dominant[0]];
      const confidence = Math.round((dominant[1] / totalFeet) * 100);

      // Average feet per line
      const validLengths = lineLengths.filter(l => l > 0);
      const avgFeet = validLengths.length > 0 ? Math.round(validLengths.reduce((a, b) => a + b, 0) / validLengths.length) : 0;
      const lengthNames = { 1: 'Monometer', 2: 'Dimeter', 3: 'Trimeter', 4: 'Tetrameter', 5: 'Pentameter', 6: 'Hexameter', 7: 'Heptameter', 8: 'Octameter' };
      const lengthName = lengthNames[avgFeet] || (avgFeet > 0 ? avgFeet + '-foot' : 'Irregular');

      return {
        foot: footName,
        length: lengthName,
        label: footAdj + ' ' + lengthName,
        confidence,
        footCounts,
        avgFeet
      };
    }

    // ── LITERARY DEVICE DETECTION ─────────────────────────────
    function detectDevices(lines) {
      const devices = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const words = line.split(/\\s+/).map(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase()).filter(Boolean);

        // Alliteration: 3+ words starting with same consonant in proximity
        for (let j = 0; j < words.length - 2; j++) {
          const c = words[j][0];
          if ('aeiou'.includes(c)) continue;
          let run = [words[j]];
          for (let k = j + 1; k < Math.min(j + 5, words.length); k++) {
            if (words[k][0] === c) run.push(words[k]);
          }
          if (run.length >= 2) {
            devices.push({ type: 'alliteration', line: i, words: run, description: 'Repeated initial "' + c.toUpperCase() + '" sound' });
            break; // one per line
          }
        }

        // Assonance: repeated vowel sounds
        const vowelSounds = words.map(w => {
          const m = w.match(/[aeiouy]+/g);
          return m ? m.join('') : '';
        }).filter(Boolean);
        const vowelMap = {};
        vowelSounds.forEach(v => { vowelMap[v] = (vowelMap[v] || 0) + 1; });
        const repeatedVowel = Object.entries(vowelMap).find(([k, v]) => v >= 2 && k.length >= 1);
        if (repeatedVowel) {
          devices.push({ type: 'assonance', line: i, description: 'Repeated "' + repeatedVowel[0] + '" vowel sound' });
        }

        // Enjambment: line doesn't end with punctuation and isn't last line of stanza
        const trimmed = line.replace(/\\s+$/, '');
        const lastChar = trimmed[trimmed.length - 1];
        const endPunctuation = '.!?;:,—–-\\"\\')';
        if (!endPunctuation.includes(lastChar) && i < lines.length - 1 && lines[i + 1]?.trim()) {
          devices.push({ type: 'enjambment', line: i, description: 'Line continues without end punctuation' });
        }

        // End-stop: line ends with strong punctuation
        if ('.!?'.includes(lastChar)) {
          devices.push({ type: 'end-stop', line: i, description: 'Line ends with terminal punctuation' });
        }
      }

      return devices;
    }

    // ── RHYME SCHEME COLORS ───────────────────────────────────
    const RHYME_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];
    const RHYME_CLASSES = ['rhyme-A', 'rhyme-B', 'rhyme-C', 'rhyme-D', 'rhyme-E', 'rhyme-F', 'rhyme-G', 'rhyme-H'];

    function getRhymeColorIndex(letter) {
      return letter ? (letter.charCodeAt(0) - 65) % RHYME_COLORS.length : 0;
    }

    // ── MAIN APP COMPONENT ────────────────────────────────────
    function App() {
      const [selectedPoem, setSelectedPoem] = useState('sonnet18');
      const [customText, setCustomText] = useState('');
      const [isCustom, setIsCustom] = useState(false);
      const [analysis, setAnalysis] = useState(null);
      const [activeTab, setActiveTab] = useState('stress');

      const poemText = isCustom ? customText : (POEMS[selectedPoem]?.text || '');
      const poemTitle = isCustom ? 'Custom Poem' : (POEMS[selectedPoem]?.title || '');
      const poemAuthor = isCustom ? '' : (POEMS[selectedPoem]?.author || '');

      const analyzePoem = useCallback(() => {
        if (!poemText.trim()) return;

        const rawLines = poemText.split('\\n');
        const stanzas = [];
        let currentStanza = [];
        for (const line of rawLines) {
          if (line.trim() === '') {
            if (currentStanza.length > 0) { stanzas.push(currentStanza); currentStanza = []; }
          } else {
            currentStanza.push(line);
          }
        }
        if (currentStanza.length > 0) stanzas.push(currentStanza);

        const allLines = rawLines.filter(l => l.trim() !== '');
        const lineAnalyses = allLines.map(line => {
          const words = line.trim().split(/\\s+/).filter(Boolean);
          const wordAnalyses = words.map(w => {
            const pattern = getStressPattern(w);
            return { word: w, stress: pattern };
          });
          const fullPattern = wordAnalyses.flatMap(wa => wa.stress);
          return { text: line, words: wordAnalyses, fullPattern };
        });

        const rhymeScheme = detectRhymeScheme(allLines);
        const meter = identifyMeter(lineAnalyses.map(la => la.fullPattern));
        const devices = detectDevices(allLines);

        // Stats
        const totalWords = allLines.reduce((acc, l) => acc + l.trim().split(/\\s+/).filter(Boolean).length, 0);
        const uniqueWords = new Set(allLines.flatMap(l => l.trim().split(/\\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean))).size;
        const avgSyllables = lineAnalyses.length > 0
          ? (lineAnalyses.reduce((acc, la) => acc + la.fullPattern.length, 0) / lineAnalyses.length).toFixed(1)
          : 0;
        const rhymePattern = rhymeScheme.filter(Boolean).map(r => r.letter).join(' ');

        setAnalysis({
          lineAnalyses,
          rhymeScheme,
          meter,
          devices,
          stanzas,
          stats: {
            lines: allLines.length,
            stanzas: stanzas.length,
            totalWords,
            uniqueWords,
            avgSyllables,
            rhymePattern,
          }
        });
      }, [poemText]);

      // Auto-analyze on poem change
      useEffect(() => {
        if (poemText.trim()) analyzePoem();
      }, [poemText, analyzePoem]);

      return (
        <div className="min-h-screen" style={{ background: '#faf8f5' }}>
          {/* Header */}
          <div className="border-b" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderColor: '#475569' }}>
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✒️</span>
                <div>
                  <h1 className="text-xl font-extrabold text-white">Poetry Meter & Rhyme Analyzer</h1>
                  <p className="text-sm text-slate-300">Syllable stress, meter identification, rhyme scheme & literary devices</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT: Input Panel */}
              <div className="lg:col-span-4 space-y-4">
                {/* Poem Selector */}
                <div className="rounded-xl border-2 p-4" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select a Poem</label>
                  <div className="space-y-1.5">
                    {Object.entries(POEMS).map(([key, poem]) => (
                      <button
                        key={key}
                        onClick={() => { setIsCustom(false); setSelectedPoem(key); }}
                        className={\`w-full text-left px-3 py-2 rounded-lg text-sm transition-all \${
                          !isCustom && selectedPoem === key
                            ? 'bg-indigo-50 border-2 border-indigo-400 font-medium text-indigo-900'
                            : 'border-2 border-transparent hover:bg-slate-50 text-slate-600'
                        }\`}
                      >
                        <span className="font-medium">{poem.title}</span>
                        <span className="text-slate-400 ml-1">— {poem.author}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCustom(true)}
                      className={\`w-full text-left px-3 py-2 rounded-lg text-sm transition-all \${
                        isCustom
                          ? 'bg-indigo-50 border-2 border-indigo-400 font-medium text-indigo-900'
                          : 'border-2 border-transparent hover:bg-slate-50 text-slate-600'
                      }\`}
                    >
                      ✏️ Paste Custom Poem
                    </button>
                  </div>
                </div>

                {/* Custom Input */}
                {isCustom && (
                  <div className="rounded-xl border-2 p-4 animate-fade" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your Poem</label>
                    <textarea
                      value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      placeholder="Paste your poem here...\\n\\nSeparate stanzas with blank lines."
                      className="w-full h-48 px-3 py-2 rounded-lg border-2 border-slate-200 text-sm poem-font focus:outline-none focus:border-indigo-400 resize-none"
                      style={{ lineHeight: '1.8' }}
                    />
                  </div>
                )}

                {/* Stats Panel */}
                {analysis && (
                  <div className="rounded-xl border-2 p-4 animate-fade" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <span>📊</span> Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Lines" value={analysis.stats.lines} />
                      <Stat label="Stanzas" value={analysis.stats.stanzas} />
                      <Stat label="Total Words" value={analysis.stats.totalWords} />
                      <Stat label="Unique Words" value={analysis.stats.uniqueWords} />
                      <Stat label="Avg Syllables/Line" value={analysis.stats.avgSyllables} />
                      <Stat label="Dominant Meter" value={analysis.meter.foot} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">Rhyme Scheme</div>
                      <div className="text-sm font-mono text-slate-700">{analysis.stats.rhymePattern || 'Free verse'}</div>
                    </div>
                  </div>
                )}

                {/* Meter Summary */}
                {analysis && (
                  <div className="rounded-xl border-2 p-4 animate-fade" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderColor: '#c7d2fe' }}>
                    <h3 className="text-sm font-bold text-indigo-800 mb-2">🎼 Meter</h3>
                    <div className="text-lg font-bold text-indigo-900">{analysis.meter.label}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: analysis.meter.confidence + '%' }} />
                      </div>
                      <span className="text-xs font-semibold text-indigo-700">{analysis.meter.confidence}%</span>
                    </div>
                    <p className="text-xs text-indigo-600 mt-2">Confidence based on foot pattern consistency</p>
                    {analysis.meter.footCounts && (
                      <div className="mt-3 pt-3 border-t border-indigo-200 space-y-1">
                        {Object.entries(analysis.meter.footCounts).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([foot, count]) => (
                          <div key={foot} className="flex justify-between text-xs">
                            <span className="text-indigo-700 capitalize">{foot}s</span>
                            <span className="font-semibold text-indigo-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Analysis Panel */}
              <div className="lg:col-span-8 space-y-4">
                {/* Tab Bar */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#e2e8f0' }}>
                  {[
                    { key: 'stress', label: 'Syllable Stress', icon: '◡́' },
                    { key: 'rhyme', label: 'Rhyme Scheme', icon: '🔤' },
                    { key: 'devices', label: 'Literary Devices', icon: '🔍' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={\`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all \${
                        activeTab === tab.key
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }\`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Poem Display with Title */}
                {analysis && (
                  <div className="rounded-xl border-2 overflow-hidden animate-fade" style={{ borderColor: '#d4c5a9' }}>
                    <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #fdf8f0, #f5efe6)' }}>
                      <h2 className="text-xl font-extrabold poem-font text-slate-800">{poemTitle}</h2>
                      {poemAuthor && <p className="text-sm poem-font text-slate-500 italic">by {poemAuthor}</p>}
                    </div>

                    <div className="parchment px-6 py-5">
                      {activeTab === 'stress' && <StressView analysis={analysis} />}
                      {activeTab === 'rhyme' && <RhymeView analysis={analysis} />}
                      {activeTab === 'devices' && <DevicesView analysis={analysis} />}
                    </div>
                  </div>
                )}

                {!analysis && (
                  <div className="rounded-xl border-2 p-12 text-center" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    <span className="text-5xl mb-4 block">✒️</span>
                    <p className="text-slate-500 text-lg">Select a poem or paste your own to begin analysis</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── STAT COMPONENT ────────────────────────────────────────
    function Stat({ label, value }) {
      return (
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-sm font-bold text-slate-800">{value}</div>
        </div>
      );
    }

    // ── STRESS VIEW ───────────────────────────────────────────
    function StressView({ analysis }) {
      const { lineAnalyses } = analysis;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
            <span><span className="stressed text-base">ˊ</span> = stressed (bold blue)</span>
            <span><span className="unstressed text-base">˘</span> = unstressed (gray)</span>
          </div>
          {lineAnalyses.map((la, i) => (
            <div key={i} className="pb-3 border-b border-dashed" style={{ borderColor: '#e8dcc8' }}>
              <div className="poem-font text-lg leading-relaxed mb-1">
                {la.words.map((wa, j) => (
                  <span key={j} className="mr-1">
                    {wa.word}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-0.5">
                {la.words.map((wa, j) => (
                  <React.Fragment key={j}>
                    <span className="inline-flex items-center gap-px mr-2">
                      {wa.stress.map((s, k) => (
                        <span key={k} className={\`text-base font-mono \${s ? 'stressed' : 'unstressed'}\`}>
                          {s ? 'ˊ' : '˘'}
                        </span>
                      ))}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ── RHYME VIEW ────────────────────────────────────────────
    function RhymeView({ analysis }) {
      const { lineAnalyses, rhymeScheme } = analysis;
      // Collect unique letters for the legend
      const usedLetters = [...new Set(rhymeScheme.filter(Boolean).map(r => r.letter))];

      return (
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-3">
            {usedLetters.map(letter => {
              const ci = getRhymeColorIndex(letter);
              return (
                <span key={letter} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ background: RHYME_COLORS[ci] + '20', color: RHYME_COLORS[ci] }}>
                  {letter}
                </span>
              );
            })}
            <span className="text-xs text-slate-400 ml-2">● perfect &nbsp; ○ slant/eye</span>
          </div>

          {lineAnalyses.map((la, i) => {
            const rs = rhymeScheme[i];
            const ci = rs ? getRhymeColorIndex(rs.letter) : 0;
            const lastWord = getLastWord(la.text);
            return (
              <div key={i} className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={rs ? { background: RHYME_COLORS[ci] + '20', color: RHYME_COLORS[ci] } : { background: '#f1f5f9', color: '#94a3b8' }}>
                  {rs ? rs.letter : '–'}
                </div>
                <div className="poem-font text-lg leading-relaxed flex-1">
                  {la.text.trim().replace(new RegExp(lastWord.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '[^a-zA-Z]*$', 'i'), '')}
                  {rs && rs.type !== 'none' ? (
                    <span className={\`px-1 rounded \${RHYME_CLASSES[ci]}\`}>{la.text.trim().match(new RegExp(lastWord.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '[^a-zA-Z]*$', 'i'))?.[0] || lastWord}</span>
                  ) : (
                    <span>{la.text.trim().match(new RegExp(lastWord.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '[^a-zA-Z]*$', 'i'))?.[0] || lastWord}</span>
                  )}
                </div>
                {rs && rs.type !== 'none' && (
                  <span className="text-xs text-slate-400 mt-1 shrink-0">{rs.type}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // ── DEVICES VIEW ──────────────────────────────────────────
    function DevicesView({ analysis }) {
      const { lineAnalyses, devices } = analysis;

      const devicesByType = {};
      devices.forEach(d => {
        if (!devicesByType[d.type]) devicesByType[d.type] = [];
        devicesByType[d.type].push(d);
      });

      const typeInfo = {
        alliteration: { label: 'Alliteration', icon: '🔤', color: '#f59e0b', desc: 'Repetition of initial consonant sounds' },
        assonance: { label: 'Assonance', icon: '🔊', color: '#8b5cf6', desc: 'Repetition of vowel sounds within words' },
        enjambment: { label: 'Enjambment', icon: '↪️', color: '#3b82f6', desc: 'Line continues into the next without pause' },
        'end-stop': { label: 'End-Stop', icon: '⏹️', color: '#22c55e', desc: 'Line ends with terminal punctuation' },
      };

      return (
        <div className="space-y-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(devicesByType).map(([type, items]) => {
              const info = typeInfo[type] || { label: type, icon: '?', color: '#64748b' };
              return (
                <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: info.color + '15', color: info.color }}>
                  {info.icon} {info.label}: {items.length}
                </span>
              );
            })}
          </div>

          {/* Detailed list by type */}
          {Object.entries(devicesByType).map(([type, items]) => {
            const info = typeInfo[type] || { label: type, icon: '?', color: '#64748b', desc: '' };
            return (
              <div key={type} className="rounded-xl border-2 p-4" style={{ borderColor: info.color + '40' }}>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-1" style={{ color: info.color }}>
                  {info.icon} {info.label}
                </h4>
                <p className="text-xs text-slate-500 mb-3">{info.desc}</p>
                <div className="space-y-2">
                  {items.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-slate-400 mt-0.5 shrink-0">L{item.line + 1}</span>
                      <div>
                        <div className="poem-font text-slate-700">{lineAnalyses[item.line]?.text.trim()}</div>
                        <div className="text-xs mt-0.5" style={{ color: info.color }}>{item.description}{item.words ? ': ' + item.words.join(', ') : ''}</div>
                      </div>
                    </div>
                  ))}
                  {items.length > 10 && (
                    <p className="text-xs text-slate-400 italic">...and {items.length - 10} more</p>
                  )}
                </div>
              </div>
            );
          })}

          {devices.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p>No literary devices detected in this poem.</p>
            </div>
          )}
        </div>
      );
    }

    // ── RENDER ─────────────────────────────────────────────────
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  <\/script>
</body>
</html>`;
