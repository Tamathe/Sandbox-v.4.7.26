'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mic } from 'lucide-react'

export default function ExperiencePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Back nav */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-white/5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          University of Kentucky
        </Link>
        <Link
          href="/build"
          className="flex items-center gap-2 text-sm font-medium text-white bg-[#0033A0] hover:bg-[#0033A0]/80 px-4 py-1.5 rounded-full transition-colors"
        >
          Build something
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-32">

        {/* Kicker */}
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#0033A0] mb-6">
          What you can build
        </p>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight mb-10">
          Building Interactive Hamlet
        </h1>

        {/* Body */}
        <div className="prose prose-invert prose-lg max-w-none space-y-6 leading-relaxed text-white/80">

          <p>
            You&apos;ve been staring at your Shakespeare paper for twenty minutes when the idea hits you.
          </p>

          <p>
            <em>What if you didn&apos;t just read Hamlet. What if you were him.</em>
          </p>

          <p>
            Not in some passive, highlight-the-text way. You mean actually inhabit the character. Speak his lines. Make his choices. And every other character — the Ghost, Claudius, Ophelia, Horatio, Polonius — all of them voiced by an AI that knows the play cold and stays in character no matter what you say.
          </p>

          <p>
            Voice to voice. You talk, it talks back. Elsinore Castle, rendered in conversation.
          </p>

          <p>
            You&apos;ve built tools on the University of Kentucky platform before. A mock interview trainer. A constitutional law quiz that adapts to what you get wrong. You know the platform. You know it&apos;s possible. You open a new tab.
          </p>

          {/* Section */}
          <h2 className="text-xl font-extrabold text-white pt-4">The Build Hub</h2>

          <p>
            The hero textarea sits at the top of the page, cursor blinking. You&apos;ve been here before, but this time the stakes feel different. This isn&apos;t a study tool. This is a performance.
          </p>

          <p>You type:</p>

          <blockquote className="border-l-2 border-[#0033A0] pl-5 text-white/60 italic not-italic">
            &ldquo;I want to build an interactive Hamlet where I play the role of Hamlet and the AI plays every other character — the Ghost, Claudius, Ophelia, Horatio, Polonius. The story should progress act by act. I want it to be voice-to-voice.&rdquo;
          </blockquote>

          <p>
            You pause before hitting enter. Is this too much? Will it understand what you mean by voice-to-voice? You hit enter anyway.
          </p>

          {/* Section */}
          <h2 className="text-xl font-extrabold text-white pt-4">The Builder</h2>

          <p>
            The screen splits. Left side: a chat panel. Right side: a preview that says <em>&ldquo;Your tool preview will appear here.&rdquo;</em>
          </p>

          <p>
            The AI builder responds almost immediately. It asks one clarifying question: <em>Should the AI nudge Hamlet toward canonical choices, or let you go off-script and improvise?</em>
          </p>

          <p>You type back: <em>&ldquo;Let me improvise. But keep the other characters true to the play.&rdquo;</em></p>

          <p>
            And then something remarkable happens. While you&apos;re still reading its response, the right panel starts filling in. A tool name appears in the top bar: <strong className="text-white">Interactive Hamlet</strong>. A welcome message materializes in the preview:
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white/70 leading-relaxed not-italic">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-semibold">Tool Preview</p>
            <p>
              The castle ramparts of Elsinore. It is nearly midnight. Cold. You are Prince Hamlet, and something is deeply wrong in Denmark. Your father is dead. Your uncle now wears the crown and shares your mother&apos;s bed. And tonight, the guards swear they have seen a ghost.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {["I'll walk the ramparts alone.", "Take me to the ghost.", "Begin at the court — Act 1, Scene 2."].map((q) => (
                <span key={q} className="text-xs border border-white/20 rounded-full px-3 py-1 text-white/50">
                  {q}
                </span>
              ))}
            </div>
          </div>

          <p>
            You sit back for a second. That&apos;s exactly right. That&apos;s the tone. The AI built that from one exchange.
          </p>

          <p>You click <em>&ldquo;Take me to the ghost.&rdquo;</em></p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm leading-relaxed">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-semibold">AI Response</p>
            <p>
              <span className="font-bold text-white">GHOST:</span>{' '}
              <span className="text-white/70">
                I am thy father&apos;s spirit, doomed for a certain term to walk the night — and for the day confined to fast in fires, till the foul crimes done in my days of nature are burnt and purged away. But that I am forbid to tell the secrets of my prison house, I could a tale unfold whose lightest word would harrow up thy soul.
              </span>
            </p>
          </div>

          <p>
            The <strong className="text-white">GHOST:</strong> prefix is right there, bolded, before the words. Every character comes prefixed like that. When Claudius speaks he announces himself. When Ophelia enters she announces herself. You&apos;re not reading a chat log — you&apos;re reading a playscript that you&apos;re inside of.
          </p>

          <p>The Build button has appeared. Green. You don&apos;t click it yet.</p>

          <p>
            You test it harder. You go off-script. You tell the Ghost: <em>&ldquo;I don&apos;t believe you. Prove it.&rdquo;</em>
          </p>

          <p>
            The Ghost doesn&apos;t break. It improvises within character — sorrowful, urgent, staying true to the play&apos;s logic without quoting lines verbatim. You push harder. You tell Claudius you suspect him in open court. He deflects, smooth and dangerous. You confess your plan to Horatio. He responds with the exact mix of loyalty and alarm that Horatio would.
          </p>

          <p className="text-white font-semibold text-lg">It holds.</p>

          <p>You click Build.</p>

          {/* Section */}
          <h2 className="text-xl font-extrabold text-white pt-4">The Publish</h2>

          <p>
            A loading overlay. A brief moment where the whole thing crystallizes from draft into something real. Then you&apos;re on the tool&apos;s page.
          </p>

          <p>It&apos;s live. It has a URL. It has your name on it.</p>

          <p>
            But you&apos;re not done. You came here for voice-to-voice, and you haven&apos;t gotten there yet.
          </p>

          <p>
            You find your way to the audio settings. Six voice options: alloy, echo, fable, onyx, nova, shimmer. You pick <strong className="text-white">onyx</strong> because it sounds like it might be deep. You have no real way of knowing. You save and come back to the tool.
          </p>

          <p>You click the microphone button.</p>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="size-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
              <Mic className="size-4 text-red-400" />
            </div>
            <p className="text-sm text-white/60 italic">&ldquo;Who&apos;s there?&rdquo;</p>
          </div>

          <p>
            Your words appear in the text box — transcribed, waiting. You hit send.
          </p>

          <p>
            The Ghost speaks back. Out loud. Through your speakers. Deep, measured, genuinely dramatic. The voice is good. Better than you expected. It doesn&apos;t sound robotic. It sounds like theater.
          </p>

          <p>
            You take your headphones off and put them back on. You ask it again. Different words this time. You start ad-libbing as Hamlet — confused, angry, grieving. The Ghost responds. Claudius responds. Ophelia responds.
          </p>

          <p className="text-white font-semibold text-lg">You&apos;re in the play.</p>

          {/* Section */}
          <h2 className="text-xl font-extrabold text-white pt-4">What You Made</h2>

          <p>
            You built a Shakespearean roleplay engine in an afternoon. It knows every character. It stays in period. It tracks narrative progression through acts. It speaks aloud. You speak back. You can share it with a link and someone else can be Hamlet tomorrow.
          </p>

          <p>Your Shakespeare paper is still open in another tab.</p>

          <p>You&apos;re not thinking about it anymore.</p>

        </div>

        {/* CTA */}
        <div className="mt-20 pt-10 border-t border-white/10">
          <p className="text-white/40 text-sm mb-6">Ready to build yours?</p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 bg-[#0033A0] hover:bg-[#0033A0]/80 text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Open the Build Hub
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-16 text-xs text-white/20">
          Built with CATS-AI — University of Kentucky
        </p>

      </div>
    </div>
  )
}
