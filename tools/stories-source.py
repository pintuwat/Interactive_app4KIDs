# Source of truth for data/stories.json (run: python3 tools/stories-source.py). Edit stories here, then check with
# node tools/check-stories.mjs. Plain text only: target-sound words are marked automatically from `target`.
import json

SIGHT = "the a is on in and to I he she it was said we you my of".split()

def q(prompt, answer, *wrong):
    """Picture question: answer is (emoji, label); wrong are (emoji, label)."""
    return {"q": prompt, "choices": [{"e": answer[0], "t": answer[1]}] + [{"e": e, "t": t} for e, t in wrong], "answer": 0}

STORIES = [
 dict(id="cat-on-the-mat", title="The Cat on the Mat", emoji="🐱", level=1, focus="short a", target="a", taught=["a"],
  pages=[
   ("🐱", "Pat is a tan cat. Pat has a mat. It is a flat mat."),
   ("🐱🧶", "Pat sat on the mat. Pat sat and sat. Pat is glad."),
   ("👦🎒", "Sam ran in. Sam has a bag. Sam is glad."),
   ("👦🐱", "Sam sat on the mat. Sam pats Pat. Pat is a glad cat."),
   ("💡", "Dad ran in. Dad has a lamp. The lamp is on."),
   ("😴", "Pat naps on the mat. Sam naps on a bag. Nap, nap, nap."),
  ],
  questions=[q("Who sat on the mat?", ("🐱", "cat"), ("🐷", "pig"), ("🐸", "frog")),
             q("What did Sam have?", ("🎒", "bag"), ("🎩", "hat"), ("🥄", "spoon"))]),

 dict(id="pip-the-pig", title="Pip the Pig", emoji="🐷", level=1, focus="short i", target="i", taught=["a", "i"],
  pages=[
   ("🐷", "Pip is a pig. Pip is big and pink. Pip is a glad pig."),
   ("🐷🏖️", "Pip sits in the sand. Pip digs and digs. Pip digs a big pit."),
   ("🕳️🐷", "Pip hid in the pit. Pip is in the pit. Pip is a bit sad."),
   ("👦", "Tip is a kid. Tip ran to Pip. Tip said, I can fix it."),
   ("🥛", "Tip and Pip sit in the pit. Tip sips milk. Pip sips milk."),
   ("🛏️🐷", "Pip is in his pit. Pip had a big sip. Pip is still."),
  ],
  questions=[q("Who is pink?", ("🐷", "pig"), ("🐱", "cat"), ("🐶", "dog")),
             q("What did Pip dig?", ("🕳️", "pit"), ("🎂", "cake"), ("🚪", "door")),
             q("What did Tip and Pip sip?", ("🥛", "milk"), ("🍎", "apple"), ("🍞", "bun"))]),

 dict(id="red-hen", title="The Red Hen", emoji="🐔", level=2, focus="short e", target="e", taught=["a", "i", "e"],
  pages=[
   ("🐔", "The red hen is in the pen. The red hen has ten eggs."),
   ("🥚🐔", "The hen sits on ten eggs. The hen sits and sits. Peck, peck, peck."),
   ("👨‍⚕️", "Ben is a vet. Ben gets in the pen. Ben is glad to help the hen."),
   ("🛏️", "Ben sets a bed in the pen. The eggs sit in the bed. Ben fed the hen."),
   ("🐔🥚", "The red hen is well. The ten eggs sit in the bed. Ben left."),
   ("😴", "The red hen and the ten eggs rest. Ben is in his bed. Rest, rest, rest."),
  ],
  questions=[q("Who is red?", ("🐔", "hen"), ("🐷", "pig"), ("🐱", "cat")),
             q("How many eggs?", ("🔟", "ten"), ("3️⃣", "three"), ("6️⃣", "six"))]),

 dict(id="dog-on-the-log", title="The Dog on the Log", emoji="🐶", level=2, focus="short o", target="o", taught=["a", "i", "e", "o"],
  pages=[
   ("🐶", "Tom has a dog. The dog is Dot. Dot is a red dog."),
   ("🐶🪵", "Dot hops on a log. Dot sits on the log. The log is big."),
   ("🐸🪵", "A frog hops on the log. Hop, hop, hop! Dot is not mad."),
   ("🐶🐸", "Dot and the frog sit on the log. The frog is on top. Dot is on the end."),
   ("👦🐶", "Tom ran to Dot. Tom pats Dot. Tom pats the frog."),
   ("🌫️", "It is not hot. Fog is on the pond. Dot naps on the log."),
  ],
  questions=[q("What is on the log?", ("🐸", "frog"), ("🐘", "elephant"), ("🦊", "fox")),
             q("Who has a dog?", ("👦", "Tom"), ("👧", "girl"), ("👸", "queen"))]),

 dict(id="bug-in-the-mug", title="The Bug in the Mug", emoji="🐛", level=2, focus="short u", target="u", taught=["a", "i", "e", "o", "u"],
  pages=[
   ("🐛☕", "A bug sat in a mug. It is a red bug. The mug is on a rug."),
   ("👦🥯", "Gus has a mug. Gus has a bun. Gus is glad."),
   ("👦☕🐛", "Gus got the mug. A bug is in the mug! Gus said, A bug!"),
   ("🐛💧", "The bug is wet. The bug is not glad. The bug is stuck in the mug."),
   ("👦🐛", "Gus lifts the bug up. Gus sets the bug on the rug."),
   ("😴🐛", "The bug runs and runs. Then the bug naps on the rug. Gus naps in his bed."),
  ],
  questions=[q("Where was the bug?", ("☕", "mug"), ("🛏️", "bed"), ("🚌", "bus")),
             q("What did Gus have?", ("🍞", "bun"), ("🍕", "pizza"), ("🐟", "fish"))]),

 dict(id="ship-and-fish", title="The Ship and the Fish", emoji="🚢", level=3, focus="sh", target="sh", taught=["a", "i", "e", "o", "u", "sh"],
  pages=[
   ("🚢", "A big ship sits on a pond. The ship is red."),
   ("🐟", "A fish is in the pond. The fish can swim. Swish, swish, swish."),
   ("👦🚢", "Josh is on the ship. Josh has a net. Josh has a shell."),
   ("🥅🐟", "Josh got a fish in the net. Josh let the fish swim."),
   ("🌠", "Josh has a wish. Josh wishes the fish well."),
   ("😴🚢", "The ship is still. The fish swim. Josh sits on the ship. Hush, hush, hush."),
  ],
  questions=[q("What did Josh have?", ("🐚", "shell"), ("🍎", "apple"), ("🎩", "hat")),
             q("What swims in the pond?", ("🐟", "fish"), ("🐱", "cat"), ("🐰", "rabbit"))]),

 dict(id="chip-the-chick", title="Chip the Chick", emoji="🐥", level=3, focus="ch", target="ch", taught=["a", "i", "e", "o", "u", "sh", "ch", "th"],
  pages=[
   ("🐥", "Chip is a chick. Chip is a red chick. Chip can chat."),
   ("🐒", "Chen is a chimp. Chen can chat. Chip and Chen chat on a bench."),
   ("🍱", "Chen has a lunch. It is a big lunch. Chip has a bit of the lunch."),
   ("🍟", "Chen has chips. Chip has chips. Thick chips and thin chips."),
   ("😋", "Chip and Chen munch and munch. Munch, munch, munch! Chip has a chip on his chin."),
   ("😴🐥", "Chip is not up. Chen is not up. Chip and Chen nap on the bench."),
  ],
  questions=[q("Who is a chick?", ("🐥", "Chip"), ("🐒", "Chen"), ("🐷", "Pip")),
             q("What did they munch?", ("🍟", "chips"), ("🎂", "cake"), ("🌽", "corn"))]),

 dict(id="moon-and-spoon", title="The Moon and the Spoon", emoji="🌙", level=3, focus="oo", target="oo", taught=["a", "i", "e", "o", "u", "sh", "ch", "th", "oo"],
  pages=[
   ("🌙", "The moon is up. The moon is big. The moon is cool."),
   ("🥄🏠", "A spoon sits on the roof. The moon is on the spoon."),
   ("🐱🥄", "A cat sits on a stool. The cat has a spoon. The cat has a pot of food."),
   ("🍲", "The food is hot. Toot, toot! The food is cool soon."),
   ("🐱🌙", "The cat sits and sits. Soon the cat has a nap on the stool."),
   ("🌙😴", "The moon and the spoon sit on the roof. Zoom, zoom, zoom. Soon the moon is still."),
  ],
  questions=[q("What is on the roof?", ("🥄", "spoon"), ("🐟", "fish"), ("🎩", "hat")),
             q("What is in the sky?", ("🌙", "moon"), ("🚂", "train"), ("🪁", "kite"))]),

 dict(id="cake-by-the-lake", title="The Cake by the Lake", emoji="🎂", level=3, focus="magic e", target="a_e", taught=["a", "i", "e", "o", "u", "sh", "ch", "th", "oo", "a_e", "i_e", "o_e", "u_e"],
  pages=[
   ("🎂", "Jake and Kate bake a cake. It is a big cake."),
   ("🧑‍🍳", "Kate mixes. Jake bakes. The cake is hot."),
   ("🏞️🎂", "Jake and Kate take the cake to the lake."),
   ("🍰", "Jake and Kate sit at the lake. Jake has a slice of cake. Kate has a slice of cake."),
   ("🐟💦", "A fish jumps in the lake. Splash! Kate and Jake smile."),
   ("🌅😴", "The sun sets. The lake is still. Kate and Jake nap at the lake."),
  ],
  questions=[q("What did they bake?", ("🎂", "cake"), ("🍞", "bun"), ("🍕", "pizza")),
             q("Where did they sit?", ("🏞️", "lake"), ("🚌", "bus"), ("🏠", "home"))]),

 dict(id="rain-train", title="The Rain Train", emoji="🚂", level=3, focus="ai", target="ai", taught=["a", "i", "e", "o", "u", "sh", "ch", "th", "oo", "a_e", "i_e", "o_e", "u_e", "ai"],
  pages=[
   ("🌧️🚂", "Rain, rain, rain! The train is in the rain."),
   ("👧🚂", "Gail is on the train. Gail has a snail. The snail is in a pail."),
   ("🐌🪣", "The snail sits in the pail. The pail sits on the train. Wait, wait, wait."),
   ("🚂💨", "The train can zip. Chug, chug, chug! The rain taps on the train."),
   ("⏰", "Gail and the snail wait and wait. The train is on time."),
   ("🌙😴", "The rain is soft. The train is still. Gail and the snail nap on the train."),
  ],
  questions=[q("Who has a snail?", ("👧", "Gail"), ("👦", "Tom"), ("🐶", "Dot")),
             q("What is in the rain?", ("🚂", "train"), ("🚢", "ship"), ("🚌", "bus"))]),
]

out = {"meta": {"sight": SIGHT, "ending": "Good night!", "note": "The closing 'Good night!' is a spoken farewell, shown separately from the story text and not counted for decodability."}, "stories": []}
for s in STORIES:
    pages = [{"scene": sc, "text": tx} for sc, tx in s["pages"]]
    words = sum(len(p["text"].split()) for p in pages)
    out["stories"].append({**{k: v for k, v in s.items() if k not in ("pages",)}, "pages": pages, "words": words})
json.dump(out, open("data/stories.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print([ (s["title"], s["words"]) for s in out["stories"]])
