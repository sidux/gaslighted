# Speech Marks and SSML Guide

This document explains how the speech marks and SSML (Speech Synthesis Markup Language) system works in Gaslighted.

## Overview

The game uses neural text-to-speech APIs with SSML and speech marks to create a dynamic rhythm-based gameplay experience. Speech marks contain precise timing information about when each word is spoken, allowing the game to create realistic "safe zones" for releasing gas during speech.

## Direct SSML in Level Files

Dialogue in level files includes direct SSML tags that control speech rhythm and pauses:

```yaml
dialogues:
  - speakerId: boomer
    text: "<speak>Welcome to the meeting. <break time=\"500ms\"/> Let's begin.</speak>"
    delay: 2000
    duration: 5000
    safetyStatus: neutral
```

## Fully Supported SSML Tags for Neural Voices

According to the [Amazon Polly documentation](https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html), these SSML tags have full availability with neural voices:

### Essential Structure
- `<speak>...</speak>` - Wraps all SSML content

### Pauses (Full Availability)
- `<break time="300ms"/>` - Short pause (300 milliseconds)
- `<break time="500ms"/>` - Medium pause (half second)
- `<break time="1s"/>` - Long pause (1 second)

### Language Tags (Full Availability)
- `<lang xml:lang="fr-FR">...</lang>` - For multilingual text

### Paragraph and Sentence Tags (Full Availability)
- `<p>...</p>` - Creates paragraph pauses
- `<s>...</s>` - Creates sentence pauses

### Other Fully Supported Tags
- `<mark name="label"/>` - Custom marker
- `<phoneme alphabet="ipa" ph="...">...</phoneme>` - Phonetic pronunciation
- `<sub alias="...">...</sub>` - Substitution
- `<w role="...">...</w>` - Word part of speech

## Creating SSML Patterns for Gameplay

When designing dialogue for gameplay, consider these patterns:

### Easy Sections
```xml
<speak>This is a simple sentence with a <break time="700ms"/> long pause.</speak>
```

### Medium Difficulty
```xml
<speak>Now let's <break time="300ms"/> review the <break time="200ms"/> quarterly report <break time="500ms"/> highlights.</speak>
```

### Hard Sections
```xml
<speak>And these numbers<break time="100ms"/>show our<break time="100ms"/>rapid<break time="200ms"/>growth this quarter.</speak>
```

## Why Some Tags Don't Work

According to Amazon Polly documentation:

1. **Emphasis Tag**: `<emphasis>` is NOT supported by neural voices, only by standard voices
2. **Prosody Tag**: `<prosody>` has partial availability with neural voices:
   - Only `volume` and `rate` attributes work, but not `pitch`
   - Usage is limited in neural voices
3. **Amazon Effects**: Most `<amazon:effect>` tags are NOT available with neural voices

## Recommended Neural Voices

These voices have the best compatibility with speech marks:

- Matthew, Brian - Male voices with clear diction
- Joanna, Olivia - Female voices with excellent clarity 
- Justin, Kendra - Younger-sounding voices
- Stephen - Authoritative voice

## Generating Audio and Speech Marks

```bash
# Configure AWS credentials in .env first
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Then run the generation script
npm run generate-audio
```

This creates both the audio files and speech mark JSON files in `audio/dialogue/` and `audio/dialogue/speech_marks/` directories.
