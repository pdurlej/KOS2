# KOS Philosophy

KOS2 is not meant to be “ChatGPT inside Obsidian.”

It is meant to be an operating layer for turning notes into usable work.

## The Core Idea

Most note systems fail in one of two ways:

- they become storage with no movement
- or they become output without structure

KOS tries to avoid both.

The point is not only to capture information. The point is to move information through a clear operational path until it becomes action, decision, or review.

## Where PARA Fits

`PARA` comes from Tiago Forte.

It is a simple and powerful way to organize knowledge into four containers:

- `Projects`
- `Areas`
- `Resources`
- `Archives`

PARA is useful because it gives notes a stable place to live. It reduces friction around storage and retrieval.

But PARA alone does not tell you what should happen next.

## What KOS Adds

KOS treats note work as an operational loop, not just a filing system.

In this repo we use the shorthand `PARA + SI`.

That means:

- `PARA` gives the structural containers
- `SI` is our added operational layer for turning stored knowledge into movement

In practice, `SI` is the difference between:

- a note sitting in a vault
- and a note becoming a routed artifact, a next step, a decision, or a review

## Why KOS2 Exists

A generic AI assistant is good at answering whatever you ask next.

KOS2 is meant to be better at helping you do the same kinds of work repeatedly:

- organise intake
- identify the real next move
- draft decisions from evidence
- review outcomes and close loops

That is why the plugin is being shaped around explicit workflow paths rather than an ever-growing list of providers and novelty features.

## Why Ollama-First

For KOS, local-first is not only a deployment detail. It is part of the philosophy.

Some notes are disposable. Some are not.

KOS2 separates those concerns:

- `Ollama Local` for the work you want to keep on your machine
- `Ollama Cloud` only where web search or web fetch actually adds value

This is why `Privacy (local) Mode` and `KOS2 Local Agent` exist. They are not just UX toggles. They express the intended operating model.

KOS2 can be run fully local:

- local chat
- local embeddings
- local vault retrieval
- no cloud dependency unless you explicitly want web help

In other words, “hybrid” is supported, but it is not forced. Local is a first-class path, not a fallback.

## What “Good” Looks Like

A good KOS2 workflow looks like this:

1. capture a messy note
2. route it clearly
3. extract the next meaningful action
4. make or update a decision when the evidence is sufficient
5. review outcomes and feed the result back into the system

In the current KOS2 plugin, this loop is already visible, but not yet fully as strong as the more mature `kos` repo contract. The strongest part today is safe routing with traceability and explicit next workflow guidance.

The goal is not more AI.

The goal is less ambiguity.

## Product Consequence

This philosophy shapes the product in concrete ways:

- the plugin should feel like a calm operational cockpit, not a provider zoo
- local workflow quality matters more than feature sprawl
- retrieval should support note decisions, not just semantic novelty
- workflow prompts should beat generic suggestion spam

KOS2 is useful when it helps you consistently turn note entropy into clear movement.
