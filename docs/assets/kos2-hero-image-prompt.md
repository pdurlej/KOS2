# KOS2 README Hero Prompt

Use this to generate the illustrated hero asset for the public README.

## Prompt

```text
Use case: stylized-concept
Asset type: README hero image for an Obsidian knowledge workflow plugin
Primary request: A clever small bird named KOS perched on a messy mountain of handwritten notes, index cards, sticky notes, and knowledge scraps, carefully extracting glowing gold threads and tiny gold nuggets from the chaos. The image should feel like finding signal inside noise and turning notes into value.
Scene/background: A dark paper landscape made of layered notes and knowledge fragments, with a subtle desk-world feeling rather than literal office realism
Subject: A sharp, observant bird in motion, beak and claws pulling luminous gold from the pile of notes
Style/medium: Painterly editorial illustration with premium indie-product taste, warm and slightly magical, not childish, not corporate
Composition/framing: Wide cinematic composition, bird slightly left of center, clear readable negative space on the right for README title if needed
Lighting/mood: Soft dramatic light with warm gold glow emerging from the notes, deep contrast, elegant atmosphere
Color palette: Charcoal, paper beige, warm amber gold, muted forest green accents
Materials/textures: Rich paper texture, handwritten marks, layered scraps, subtle feather detail, metallic gold glow
Constraints: No text, no watermark, no logo, no extra characters, no UI mockup
Avoid: Tacky fantasy art, cartoon mascot look, stock illustration feel, oversaturated neon, clutter, chaotic composition
```

## CLI command

```bash
export IMAGE_GEN=/Users/pd/.codex/skills/imagegen/scripts/image_gen.py

uv run --with openai --with pillow python "$IMAGE_GEN" generate \
  --prompt "A clever small bird named KOS perched on a messy mountain of handwritten notes, index cards, sticky notes, and knowledge scraps, carefully extracting glowing gold threads and tiny gold nuggets from the chaos. The image should feel like finding signal inside noise and turning notes into value." \
  --use-case "README hero image for an Obsidian knowledge workflow plugin" \
  --scene "A dark paper landscape made of layered notes and knowledge fragments, with a subtle desk-world feeling rather than literal office realism" \
  --subject "A sharp, observant bird in motion, beak and claws pulling luminous gold from the pile of notes" \
  --style "Painterly editorial illustration with premium indie-product taste, warm and slightly magical, not childish, not corporate" \
  --composition "Wide cinematic composition, bird slightly left of center, clear readable negative space on the right for README title if needed" \
  --lighting "Soft dramatic light with warm gold glow emerging from the notes, deep contrast, elegant atmosphere" \
  --palette "Charcoal, paper beige, warm amber gold, muted forest green accents" \
  --materials "Rich paper texture, handwritten marks, layered scraps, subtle feather detail, metallic gold glow" \
  --constraints "No text, no watermark, no logo, no extra characters, no UI mockup" \
  --negative "Tacky fantasy art, cartoon mascot look, stock illustration feel, oversaturated neon, clutter, chaotic composition" \
  --size 1536x1024 \
  --quality high \
  --n 2 \
  --out-dir output/imagegen/kos2-hero
```

## Intended final asset path

After choosing the best variant, copy it to:

```text
images/kos2-hero.png
```
