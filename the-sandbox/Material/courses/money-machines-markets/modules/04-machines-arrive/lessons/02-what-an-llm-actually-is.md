---
id: 02-what-an-llm-actually-is
title: What a Large Language Model Actually Is
order: 2
estimatedMinutes: 25
learningOutcomes:
  - Describe an LLM mechanically as a function from a token sequence to a probability distribution over the next token.
  - Distinguish weights, tokens, embeddings, and the context window without confusing them.
  - State why "it's just predicting the next word" is technically true and intellectually misleading at the same time.
concepts:
  - llm
  - tokens
  - weights
  - embeddings
  - context-window
  - next-token-prediction
---

## Reading

Half the public conversation about AI is shaped by the fact that almost nobody — including a lot of people writing about AI for a living — has a working mechanical picture of what a large language model actually is. This lesson is about supplying that picture, in the smallest amount of jargon possible, so that you can hear someone say "the model thinks" or "the model just autocompletes" and know which parts of the claim are real and which parts are sloppy.

A large language model is a function. The function takes in a sequence of tokens, and it outputs a probability distribution over what the next token should be. That's the entire mechanical core. Everything else — the chat interfaces, the assistants, the agents, the tool-using, the writing of essays — is built on top of running this function in a loop and sampling from it.

Let's unpack the four pieces.

**Tokens.** A token is a chunk of text the model treats as a single unit. Tokens are not characters and they are not words. They are produced by a subword tokenizer that breaks text into common pieces — sometimes whole short words ("the," "is"), sometimes word fragments ("run" + "ning"), sometimes single characters when nothing else fits, and sometimes whole rare words. Modern models have vocabularies of around 100,000 to 200,000 distinct tokens. The English word "tokenization" might be a single token or it might be three (`token` + `iza` + `tion`), depending on the tokenizer. This sounds like a footnote and isn't. The fact that the model sees text as a sequence of tokens, not letters and not words, explains a lot of the "weird" things models do — why they can't reliably count letters in a word, why they sometimes mishandle numbers, why they sometimes invent strange spellings. They are not seeing what you are seeing.

**Weights.** A model's *weights* are a giant array of numbers — billions of them in modern frontier models, sometimes trillions — that parameterize the function. The architecture (transformer, attention layers, feedforward layers) is the same across many models; the weights are what distinguish them. Training is the process of adjusting these weights so that the function gets better at next-token prediction on a huge text corpus. Inference — when you actually use the model — is the process of running the function with the weights frozen. The weights of a trained model are static. They do not update while you talk to it. The model does not "learn" from your conversation in any persistent sense. It just runs the same fixed function on whatever you type.

**Embeddings.** An embedding is a vector — a list of a few thousand numbers — that represents a token (or, by extension, a sequence of tokens) in a high-dimensional space the model has learned. Tokens that mean similar things end up at similar coordinates. The famous early example was that the embedding for "king" minus the embedding for "man" plus the embedding for "woman" ended up close to the embedding for "queen." Modern embedding spaces are vastly more complex than that toy, but the principle holds: the model represents meaning as geometric relationships between vectors. Every input token is converted to an embedding before the model processes it, and the entire forward pass of the network is operations on these vectors.

**Context window.** The context window is the maximum number of tokens the model can attend to at once. In 2020, GPT-3 had a context window of 2,048 tokens — about 1,500 words. By 2024, frontier models had context windows of 200,000 to 1,000,000 tokens — entire books, codebases, transcripts. The size of the context window matters because anything outside it is invisible to the model. It is not "remembering" your earlier conversation; it is being fed the entire conversation back into its context every turn, and if the conversation gets longer than the window, the oldest parts fall off and disappear. A model's "memory" is exactly the size of its context window and not one token longer.

Now put the four pieces together. When you type a prompt and press send, the system tokenizes your prompt, looks up an embedding for each token, runs all of those vectors through the layers of the network (the transformer's job is to let every token "attend to" every other token in the context), and produces a probability distribution over the next token. The system samples a token from that distribution, appends it to the sequence, and runs the whole thing again to produce the token after that. And again. Until the model produces a stop token or hits a length limit. **Every word you read in a model's response was produced one token at a time by repeatedly running this same function.** There is no inner narrative, no plan, no "the model is now thinking about what to say next." There is only: a function, a probability distribution, a sample, repeat.

This brings us to the "it's just predicting the next word" criticism, which is true and which I think people use as a way to feel comfortable dismissing the technology. The mechanical description is correct. The implication that follows from it — *and therefore the model isn't really doing anything* — does not follow. To predict the next token in a passage of text well, especially across the diversity of texts these models are trained on, the model has to internally represent an extraordinary amount of structure: grammar, factual associations, logical patterns, the format of programming languages, the conventions of dozens of professional fields, the structure of stories, the rules of arithmetic, the way humans answer questions when asked. *Compressing all of that into a function whose only job is to guess the next token forces the function to learn things that look indistinguishable from understanding when you query them.* Whether those things actually constitute understanding is a philosophical question that nobody has settled in seventy years of AI research, and pretending the question is settled — in either direction — is intellectually lazy. The honest position is: this is a function whose mechanism is simple and whose behavior is stranger than the mechanism would lead you to expect, and we do not fully know why.

## Concrete example

Take this prompt: *"The first person to walk on the moon was"*. A trained LLM, given this prompt, will assign very high probability to the token `Neil`, lower probability to `the`, and tiny probabilities to thousands of other tokens. It will sample (probably) `Neil`, append it, and re-run with the new context. Now the prompt is *"The first person to walk on the moon was Neil"*, and the highest-probability next token is `Armstrong`. And so on. Notice three things. First, there is no separate "fact lookup" — the knowledge that Armstrong walked on the moon is entirely encoded in the relationships between weights, learned from having seen millions of mentions of Armstrong and the moon during training. Second, the model has no way of knowing whether it is right; it just produces the most likely next token according to the patterns it has internalized. Third, if you asked the same question about a less famous astronaut, the model might confidently produce a wrong name with the same mechanism — the *confidence* is a property of the probability distribution, not of the truth. This is why models hallucinate, and why hallucination is not a bug to be patched but a structural feature of the architecture that can be mitigated, never eliminated, by this design alone.

## Uncomfortable question

If a system that mechanically does nothing more than predict the next token can pass the bar exam, write working code, debug your reasoning, and explain a concept in seven different registers — and if "predicting the next token" turns out to require internally representing huge amounts of what we previously considered intelligence — then what was the word "intelligence" doing in our vocabulary in the first place? Either you keep the old definition and admit these systems satisfy more of it than you expected, or you upgrade the definition to something stricter and find yourself defending what makes humans special on increasingly narrow grounds. Neither move is comfortable. Pick one and notice what you had to give up to make it.
