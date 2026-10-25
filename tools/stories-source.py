# Source of truth for data/stories.json (run: python3 tools/stories-source.py). Edit stories here, then check with
# node tools/check-stories.mjs. Plain text only: target-sound words are marked automatically from `target`.
import json

SIGHT = "the a is on in and to I he she it was said we you my of".split()

def q(prompt, answer, *wrong):
    """Picture question: answer is (emoji, label); wrong are (emoji, label)."""
    return {"q": prompt, "choices": [{"e": answer[0], "t": answer[1]}] + [{"e": e, "t": t} for e, t in wrong], "answer": 0}

BASE = ["a", "i", "e", "o", "u", "sh", "ch", "th", "oo", "a_e", "i_e", "o_e", "u_e", "ai"]

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

 # ---- Phase 3: ten more stories for ages 7-8 (level 3). extraSight = extra sight words allowed in that story only. ----
 dict(id="stan-the-snail", title="Stan the Snail", emoji="🐌", level=3, focus="st blend", target="st", taught=BASE, extraSight=["go"],
  pages=[
   ("🐌", "Stan is a snail. Stan sits on a stone. The stone is flat and still."),
   ("🌿", "Stan has a plan. Stan will step up the stem. Step, step, step. Stan is not fast, but Stan is not stuck."),
   ("🌧️", "Splish, splash! It rains. Stan stops. Stan sits in his shell and waits."),
   ("☀️", "The rain stops. The sun is up. Stan is snug in his shell. The stem is wet."),
   ("🌿🐌", "Stan steps up the stem. Step, step, step. Stan is at the top. Stan is glad."),
   ("🌙🐌", "Stan sits at the top. The moon is up. Stan is still. Stan naps in his shell."),
  ],
  questions=[q("Who is on the stone?", ("🐌", "snail"), ("🐸", "frog"), ("🐛", "bug")),
             q("What does Stan sit in?", ("🐚", "shell"), ("☕", "mug"), ("🎩", "hat")),
             q("What comes up at the end?", ("🌙", "moon"), ("🌧️", "rain"), ("🚂", "train"))]),

 dict(id="blot-the-frog", title="Blot the Black Frog", emoji="🐸", level=3, focus="bl blend", target="bl", taught=BASE, extraSight=[],
  pages=[
   ("🐸", "Blake has a black frog. The frog is Blot. Blot is a blob of black."),
   ("🧱🐸", "Blot sits on a block. The block is flat. Blot can blink and blink."),
   ("🪵🐸", "Blot hops on the log. Blot hops in the bog. Blot gets wet. Blot is not glad."),
   ("🛏️", "Blake gets a blanket. Blake dabs Blot with the blanket. Blot is snug and glad."),
   ("😌🐸", "Blot sits on the blanket. Blot blinks and blinks. Blake pats Blot."),
   ("🌙😴", "The moon is up. Blake has a nap. Blot has a nap on the blanket. Blot is black and still."),
  ],
  questions=[q("What color is Blot?", ("⚫", "black"), ("🔴", "red"), ("🟡", "yellow")),
             q("What did Blake get?", ("🛏️", "blanket"), ("🎂", "cake"), ("🥄", "spoon"))]),

 dict(id="trip-on-the-tram", title="The Trip on the Tram", emoji="🚋", level=3, focus="tr blend", target="tr", taught=BASE, extraSight=["they", "for"],
  pages=[
   ("🚋", "Trish and Trent get on a tram. It is a trip! The tram is on a track."),
   ("🧳", "Trent has a trunk. Trish has a tin. The trunk is on the tram."),
   ("🛤️", "The tram stops. Trish and Trent hop off. They trot up the path."),
   ("👵", "Gran is at the end of the path. Gran has a big hug for Trish and Trent."),
   ("🍪", "Trish and Trent have a snack. Trent has a bun. Trish has a plum."),
   ("😴🚋", "Trish and Trent nap on the tram. Clack, clack, clack. The trip ends."),
  ],
  questions=[q("What did they ride?", ("🚋", "tram"), ("🚌", "bus"), ("🚢", "ship")),
             q("Who met them?", ("👵", "Gran"), ("👸", "queen"), ("🧑‍🍳", "chef"))]),

 dict(id="three-sheep", title="Three Sheep", emoji="🐑", level=3, focus="ee", target="ee", taught=BASE + ["ee"], extraSight=["by", "are"],
  pages=[
   ("🐑🐑🐑", "Three sheep sleep on the green hill. Sleep, sleep, sleep."),
   ("🐝", "A bee zips by the sheep. Bzz, bzz, bzz. The sheep feel the bee."),
   ("🌳", "The sheep seek a tree. The tree is deep in the grass. The sheep sit and rest."),
   ("🍃", "The breeze is cool. The sheep feel the breeze. The bee sits on a seed."),
   ("🐝🌳", "The bee is in the tree. Soon the bee is still. The sheep keep still."),
   ("🌙😴", "The moon is up. The sheep sleep. The bee sleeps in the tree. Sleep, sleep, sleep."),
  ],
  questions=[q("How many sheep?", ("3️⃣", "three"), ("🔟", "ten"), ("6️⃣", "six")),
             q("Where did the bee sleep?", ("🌳", "tree"), ("🪣", "pail"), ("🏠", "house"))]),

 dict(id="goat-in-the-boat", title="The Goat in the Boat", emoji="🐐", level=3, focus="oa", target="oa", taught=BASE + ["ee", "oa"], extraSight=["have", "they"],
  pages=[
   ("🐐⛵", "A goat is in a boat. The boat is on a pond. The boat can float."),
   ("🧥🐸", "The goat has a red coat. A toad sits on the boat. The toad is green."),
   ("💬", "The toad and the goat chat. Croak, croak! The toad is glad. The goat is glad."),
   ("💦", "Splash! The boat rocks. The goat gets wet. The toad gets wet. They soak and soak."),
   ("🧼🛁", "The goat has soap. The goat has a bath on the bank. The toad has a bath, then the goat."),
   ("🌙⛵", "The goat and the toad rest on the boat. The moon is up. The boat floats. Rest, rest, rest."),
  ],
  questions=[q("What floats on the pond?", ("⛵", "boat"), ("🚌", "bus"), ("🛏️", "bed")),
             q("Who sat with the goat?", ("🐸", "toad"), ("🐱", "cat"), ("🐷", "pig"))]),

 dict(id="night-light", title="The Night Light", emoji="💡", level=3, focus="igh", target="igh", taught=BASE + ["ee", "oa", "igh"], extraSight=["have"],
  pages=[
   ("🌙", "It is night. Kim is in bed. Dad has a light. The light is bright."),
   ("😨", "Kim has a fright. A big shape is on the shelf! It is not a cat."),
   ("👨", "Dad runs in. Dad sits on the bed. Dad has a light."),
   ("🔦", "Dad lifts the light up high. The light shines on the shelf."),
   ("🎒", "It is a bag on the shelf, not a big shape! Kim is glad. Kim grins."),
   ("😴", "Dad kisses Kim. Dad switches the light off. Kim sleeps tight. Night, night."),
  ],
  questions=[q("What did Dad have?", ("💡", "light"), ("🥄", "spoon"), ("🎩", "hat")),
             q("What was on the shelf?", ("🎒", "bag"), ("🐱", "cat"), ("🐍", "snake"))]),

 dict(id="farm-cart", title="The Farm Cart", emoji="🚜", level=3, focus="ar", target="ar", taught=BASE + ["ee", "oa", "igh", "ar"], extraSight=["are"],
  pages=[
   ("🏡", "Mark has a farm. The farm has a barn and a yard."),
   ("🛒", "A cart is in the yard. The cart is big. Mark can park the cart in the barn."),
   ("⭐", "It is dark. A star is up. Mark sits on the cart. Mark has a jar."),
   ("🍯", "The jar has jam. Mark has jam on a bun. Yum, yum, yum!"),
   ("🐱", "A cat is in the barn. Mark pats the cat. The cat is smart and soft."),
   ("🌙😴", "The moon and the stars are up. The farm is still. Mark and the cat nap in the barn."),
  ],
  questions=[q("What does Mark have?", ("🏡", "farm"), ("🚢", "ship"), ("🏰", "castle")),
             q("What is in the jar?", ("🍯", "jam"), ("🥛", "milk"), ("🐛", "bug"))]),

 dict(id="storm-and-fort", title="The Storm and the Fort", emoji="⛈️", level=3, focus="or", target="or", taught=BASE + ["ee", "oa", "igh", "ar", "or"], extraSight=["they"],
  pages=[
   ("👨", "Norm is a short man with a horn. Norm has a fork."),
   ("🌽", "Norm has corn. Norm gets a cob of corn. Norm sits and munches."),
   ("⛈️", "A storm is north of the fort. Norm and Mort sit in the fort."),
   ("📯", "Norm toots his horn. Toot, toot! The storm is not glad."),
   ("🏰", "Norm and Mort munch corn. They sit in the fort. The storm is soft and soft."),
   ("🌙😴", "The storm ends. The moon is up. Norm and Mort nap in the fort."),
  ],
  questions=[q("What does Norm blow?", ("📯", "horn"), ("🥄", "spoon"), ("🪁", "kite")),
             q("What did they munch?", ("🌽", "corn"), ("🍕", "pizza"), ("🐟", "fish"))]),

 dict(id="bird-and-girl", title="The Bird and the Girl", emoji="🐦", level=3, focus="ir ur er", target="ir|ur|er", taught=BASE + ["ee", "oa", "igh", "ar", "or", "ir", "ur", "er"], extraSight=["her", "are", "little"],
  pages=[
   ("👧🐦", "Shirl has a bird. The bird is Burt. Burt is a little bird."),
   ("🎵", "Burt can chirp. Burt can flutter. Burt can hop on the sill."),
   ("🖐️🐦", "Shirl lifts Burt up. Burt flaps and flutters. Shirl sits still."),
   ("🌽", "Burt gets a bit of corn. Shirl stirs the milk. Burt sips the milk."),
   ("🪺", "Burt is in his nest. Shirl pats her bird. Burt purrs and chirps."),
   ("🌙😴", "The moon is up. Shirl is in bed. Burt is in the nest. Burt and Shirl nap."),
  ],
  questions=[q("What is Burt?", ("🐦", "bird"), ("🐱", "cat"), ("🐸", "frog")),
             q("Where does Burt sleep?", ("🪺", "nest"), ("🛁", "bath"), ("🚌", "bus"))]),

 dict(id="cow-in-town", title="The Cow in the Town", emoji="🐮", level=3, focus="ow ou", target="ow|ou", taught=BASE + ["ee", "oa", "igh", "ar", "or", "ir", "ur", "er", "ow", "ou"], extraSight=["they", "are"],
  pages=[
   ("🐮", "A brown cow is in the town. The cow sits down."),
   ("👥", "A crowd is in the town. The crowd is loud. The cow is not loud."),
   ("🐭🏠", "A mouse is in the house. The mouse is out! The mouse runs down the road."),
   ("📢", "The cow shouts, Moo! The mouse jumps. The crowd shouts and shouts."),
   ("🐮🐭", "The cow and the mouse sit down. They are not loud now."),
   ("🌙😴", "The moon is up. The town is still. The cow and the mouse nap. Hush, hush, hush."),
  ],
  questions=[q("What color is the cow?", ("🟤", "brown"), ("🔴", "red"), ("🟡", "yellow")),
             q("Who ran out of the house?", ("🐭", "mouse"), ("🐷", "pig"), ("🐔", "hen"))]),
]

out = {"meta": {"sight": SIGHT, "ending": "Good night!", "note": "The closing 'Good night!' is a spoken farewell, shown separately from the story text and not counted for decodability."}, "stories": []}
for s in STORIES:
    pages = [{"scene": sc, "text": tx} for sc, tx in s["pages"]]
    words = sum(len(p["text"].split()) for p in pages)
    out["stories"].append({**{k: v for k, v in s.items() if k not in ("pages",)}, "pages": pages, "words": words})
json.dump(out, open("data/stories.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print([ (s["title"], s["words"]) for s in out["stories"]])
