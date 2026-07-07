# Aspen Grove 

### The Purpose of the Project

Why does Aspen Grove exist? There is already the ChatGPT app and the Claude app. Then there are countless other apps that let you talk to all the LLMs you want. My sense is that there are a few key gaps:

### Mobile Loom

To date, there is still not a good standalone mobile loom with a real app. Some of the LLM interfaces have branching capabilities, but most are limited. This is still a needed piece, and the main driver behind this app. 

### Knowledge collection & curation

I want something like a mix of Notion, Apple Notes, Bear Markdown Notes, Lightpage where an LLM can draw context from your whole notebook - and where a base model can continue your document, making each note into a loom tree when you want that. 

### Mobile Backrooms

I still don't know of a mobile app where you can easily drop in two instances of the same model (or any two models really) and just let them go. 

### Mobile Agent Harness

This is the most controversial feature in my mind, simply because it introduces scope creep. But I personally want it. I want it tied into LM Studio. I want to make LM Studio the primary local model provider for this feature, with support for Ollama too. But this is different than dialogue mode or document mode - this is like dispatch mode or maybe we call it C-3LM and brand it like a cool little agent dude idk. But the goal would be:
1. I can use Aspen Grove to hit models running on my desktop machine via LM Studio, and those models should have access to any MCPs I want them to be able to use on said machine. Meaning MCPs i already have set up on my machine. 
2. those models can reach back into my phone and do stuff via the actions provided in iOS shortcuts or the android equivalent, if there is one. 
But honestly, even as I type this, this is not the right direction. I'm not building OpenClaw. They already have a mobile app in fact, which I'm quite excited about. 

I need to think about the audience for this app:
- mainly it's loom nerds like myself, into AI research and cyborgism and experimentation and latent space exploration. So I should optimize for features in that space, not what's trending on X right now.
- this means interpretability, latent space mapping, ability to design and run experiments to some extent, these type of things all become the extra features outside the core loom vision. 
- the custom tooling and multimodal hypergraph trees are the main product moat. provenance features too - I don't see anyone doing that. 
- mapping/interp stuff seems important to me. this dovetails nicely with local model support, meaning both on-device and easy self hosted setups. prioritizing these types of features is the right call - i know this from the discord servers I am on and the real users I have waiting to try this app out.
- an easy way to import existing looms and export looms from the app will be paramount. I think an easy subscription option would be device sync, like what obsidian does - end to end encrypted data sync. that's one of the few things I think the target user would consider paying for. 
- an easy way to publish research or results to either existing platforms or a new social platform designed around looms. does this exist already? need to do some research. but again thinking of the target user, giving them an easy way to share what they have found and having the loom file be explorable right there by anyone on the internet is a powerful idea. and not hard to implement either. almost like a lesswrong type experience, but specifically for looms and owned and curated by intrinsic labs. that would postion the lab as an entity that cares about curating this type of work. 

I think the core featureset is still correct. And i remember having some features in there, like a field guide, to help newcomers and non-loom enthusiasts to get started and get plugged into the community. I think that's still important too. explaining to your average joe why a loom matters at all and giving people access to one that's approachable, understandable, and that you can easily share your findings from is important to me, while also being honest that the main user base is probably people who already know a good bit about what they're doing, so optimizing the featureset to meet their needs too. 
