#!/usr/bin/env python3
"""Answer library for the 问一问 · Ask chat (Brocade Mirror).

TypeSafe's Jev model does not write text: it picks which of these vetted answers fits the
question (see tools/ask_server.py). So every answer the chat can give is written here, in
Chinese and English, and reviewed by a person. Move-specific benefits / technique come from
Baduanjin/Resources/moves.json; general guidance follows taichi_knowledge/06 (safety) and 03
(adapted tracks). General guidance only, not medical advice.

    python3 web/tools/ask_content.py      # writes web/data-ask.js and web/content/ask.json
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
MOVES = json.load(open(os.path.join(WEB, '..', 'Baduanjin', 'Resources', 'moves.json'), encoding='utf-8'))['moves']

# (id, category, move or None, description for Jev (en), question zh, question en, answer zh, answer en)
G = [
  # ------------------------------------------------------------------ benefits
  ('b-overview', 'benefits', None, 'What Baduanjin is and what it is good for overall; general benefits',
   '八段锦有什么好处？', 'What are the benefits of Baduanjin?',
   '八段锦是一套八个动作、约 12 分钟的传统健身气功。它动作缓慢、强度低，结合伸展、站桩和呼吸：常见的好处是全身舒展、改善姿势和柔韧性、锻炼腿部力量与平衡，并帮助放松、平复情绪。几乎不需要场地和器材，适合每天练。',
   'Baduanjin (Eight Brocades) is a set of eight slow qigong movements that takes about 12 minutes. It combines stretching, gentle stances and calm breathing. People usually notice a full-body stretch, better posture and flexibility, stronger legs and balance, and a calmer mood. It needs no equipment and little space, so it suits daily practice.'),
  ('b-balance', 'benefits', None, 'Balance, fall prevention, leg strength, benefits for older adults',
   '八段锦能改善平衡、预防跌倒吗？', 'Can Baduanjin improve balance or prevent falls?',
   '可以帮助。马步、重心转移和第八式的提踵都在练腿部力量和平衡。研究中，太极、气功类练习对老年人平衡和减少跌倒的证据最充分，通常需要每周 2–3 次、坚持 8–24 周。平衡不好时，先扶椅背练，用高马步。',
   'It can help. The horse stance, weight shifts and the heel raises in move 8 all train leg strength and balance. Balance and fewer falls in older adults is the best-supported benefit of tai chi and qigong-style practice in studies, usually with 2–3 sessions a week for 8–24 weeks. If your balance is shaky, start with one hand on a chair back and a high stance.'),
  ('b-stress-sleep', 'benefits', None, 'Stress, anxiety, relaxation, mood and sleep quality',
   '八段锦对减压和睡眠有帮助吗？', 'Does Baduanjin help with stress or sleep?',
   '很多人练后感觉更放松。缓慢的动作配合细长的呼吸，会让心率和呼吸慢下来。研究显示气功、太极对睡眠质量和情绪有一定改善，但证据质量参差不齐。想助眠的话，睡前一两小时练一遍，动作放慢，可以用 0.75× 速度跟练。',
   'Many people feel calmer afterwards: slow movement with long, easy breaths lowers the heart and breathing rate. Studies of qigong and tai chi show some improvement in sleep quality and mood, though the evidence is mixed in quality. For sleep, do one gentle round an hour or two before bed; slowing the video to 0.75× helps.'),
  ('b-posture', 'benefits', None, 'Flexibility, posture, stiff neck, shoulders and back, desk or office workers',
   '久坐办公、肩颈僵硬，练八段锦有用吗？', 'I sit at a desk all day with a stiff neck and shoulders. Will Baduanjin help?',
   '很适合。第一式全身上拔、第二式扩胸、第三式上下对拉、第四式转头后瞧，正好针对久坐造成的含胸、圆肩和颈部僵硬。工作间隙练一两式也有用，比如每隔一两个小时做 3 遍第一式。动作都在无痛范围内做，颈椎有问题时转头幅度要小。',
   'It suits desk workers well. Move 1 lifts and lengthens the whole body, move 2 opens the chest, move 3 stretches up and down, and move 4 turns the head to look back, which targets the slumped chest, rounded shoulders and stiff neck that come from sitting. Even one or two moves between tasks help, for example 3 reps of move 1 every hour or two. Stay within a pain-free range, and keep head turns small if you have neck problems.'),
  ('b-evidence', 'benefits', None, 'What scientific research and studies say; how strong the evidence is',
   '八段锦有科学依据吗？', 'Is there scientific evidence for Baduanjin?',
   '有一些。八段锦是国家体育总局 2003 年推广的健身气功之一，国内外已有不少临床研究和荟萃分析，涉及平衡、睡眠、情绪、血压、膝关节炎和慢阻肺患者的生活质量等，结果多为正面，但很多研究规模小、质量参差。证据最强的是同类太极练习对老年人平衡和防跌倒的作用。把它当作安全的温和运动，而不是治疗。',
   'Some. Baduanjin is one of the Health Qigong sets standardised by China’s General Administration of Sport in 2003, and many trials and meta-analyses have looked at balance, sleep, mood, blood pressure, knee arthritis and quality of life in COPD. Results are mostly positive, but many studies are small or of mixed quality. The strongest evidence is for related tai chi practice improving balance and reducing falls in older adults. Treat it as safe, gentle exercise, not as a treatment.'),
  ('b-timeline', 'benefits', None, 'How long until I see results; how many weeks to notice benefits',
   '练多久能看到效果？', 'How long until I notice results?',
   '放松感和身体舒展当天就能感到。柔韧性和姿势一般 2–4 周开始改善；平衡、腿力和睡眠这类变化，研究中通常是每周练 3–5 次、坚持 8–12 周以上才明显。规律比时长更重要：每天 10 分钟胜过周末一次练一小时。',
   'You will feel looser and calmer the same day. Flexibility and posture usually start to improve in 2–4 weeks; changes in balance, leg strength and sleep typically show in studies after 8–12 weeks or more of practice 3–5 times a week. Consistency matters more than length: 10 minutes a day beats one long session at the weekend.'),
  ('b-weight', 'benefits', None, 'Weight loss, burning calories, fat loss, cardio fitness',
   '八段锦能减肥吗？', 'Can Baduanjin help me lose weight?',
   '直接作用有限。八段锦是低强度运动，一遍消耗的热量不多，不能替代快走、骑车等有氧运动和饮食调整。它的价值在于改善柔韧、姿势、平衡和情绪，容易坚持，可以作为每天运动的开头或收尾。',
   'Only a little. Baduanjin is low-intensity, so one round burns few calories and does not replace brisk walking, cycling or changes to diet. Its value is flexibility, posture, balance and mood, and it is easy to keep up, so it works well as the start or end of a daily exercise habit.'),
  ('b-names', 'benefits', None, 'Meaning of traditional names like Triple Burner, spleen and stomach, heart fire, kidneys; traditional Chinese medicine claims',
   '“理三焦”“去心火”这些名字是什么意思？', 'What do names like “Triple Burner” or “heart fire” mean?',
   '这些是中医传统说法：三焦泛指胸腹腔的气机运行，“去心火”指平心静气，“固肾腰”指强健腰部。动作名字描述了古人认为的作用，不是现代医学意义上的疗效。从运动角度看，它们分别对应全身伸展、扩胸、侧向伸展、颈部转动、髋部活动、前屈、握力和提踵平衡。',
   'They come from traditional Chinese medicine: the Triple Burner refers to the flow of qi through the chest and abdomen, “calming heart fire” means settling the mind, and “strengthening the kidneys and waist” means building the lower back. The names describe traditional ideas about each move, not proven medical effects. In exercise terms, the moves are a full-body stretch, chest opener, side stretch, neck rotation, hip mobility, forward bend, grip work and heel-raise balance.'),
  # ------------------------------------------------------------------ modifications
  ('mod-seated', 'modify', None, 'Seated or chair version; wheelchair users; cannot stand for long',
   '可以坐着练八段锦吗？', 'Can I do Baduanjin sitting down?',
   '可以。坐在稳固、无扶手的椅子前半部，双脚平放、与肩同宽，背部挺直。上肢动作照常做：托天、开弓、单举、转头、握拳都能坐着完成；马步和摇头摆尾改为上身小幅转动；攀足改为双手沿大腿滑到膝部；颠足改为坐姿提踵、脚跟轻落。另外还有专门的“坐式八段锦”。',
   'Yes. Sit near the front of a sturdy chair without armrests, feet flat and hip-width apart, back upright. Do the arm movements as usual: holding up the heavens, drawing the bow, single-arm lift, turning the head and the fist punches all work seated. Replace the horse stance and the swaying move with small upper-body turns, slide the hands down the thighs to the knees for move 6, and for move 8 lift and gently lower the heels while seated. There is also a separate classical Seated Baduanjin set.'),
  ('mod-knees', 'modify', None, 'Knee pain, knee arthritis, knee injury; how to adapt stances',
   '膝盖不好，还能练吗？', 'I have knee pain. Can I still practise?',
   '通常可以，注意几点：马步只微屈膝，站得高一些，不要深蹲；膝盖始终对着脚尖方向，不能内扣，也不要在承重时扭转膝盖；第五式摇头摆尾幅度小、重心不要压太低；第六式攀足时膝盖可以微屈。出现刺痛就停下。膝关节炎患者练太极、气功的研究结果总体正面，但急性肿痛期先休息并咨询医生。',
   'Usually, yes, with care: keep a high stance with only a slight knee bend, never a deep squat; keep the knees pointing over the toes, never caving in or twisting while bearing weight; make the swaying in move 5 small and don’t sink low; bend the knees slightly in move 6. Stop if you feel sharp pain. Studies of tai chi and qigong for knee arthritis are generally positive, but rest and see a doctor during an acute, swollen flare.'),
  ('mod-back', 'modify', None, 'Low back pain, lumbar disc herniation, sciatica',
   '腰不好（腰痛、腰椎间盘突出）怎么练？', 'How should I practise with low back pain or a disc problem?',
   '以舒适为限：第六式攀足不要弯到底，双手扶在大腿或膝盖即可，屈膝、背部保持平直，用髋部折叠而不是弯腰；第五式摇摆和第二式转体幅度减小；所有动作慢起慢落，不憋气。急性腰痛发作或有腿部麻木放射痛时先停练，请医生或康复师评估。',
   'Work within comfort: in move 6 don’t fold all the way down; rest your hands on your thighs or knees, bend the knees and keep the back flat, hinging at the hips rather than rounding the spine. Make the swaying in move 5 and the turn in move 2 smaller. Rise and lower slowly and never hold your breath. During an acute flare, or if pain or numbness runs down a leg, pause and get assessed by a doctor or physiotherapist.'),
  ('mod-neck', 'modify', None, 'Neck problems, cervical spondylosis, stiff or painful neck',
   '颈椎不好要注意什么？', 'What if I have neck problems?',
   '第四式往后瞧和第一式抬头看手是颈部动作最多的地方：转头幅度减半，以眼睛带动、颈部跟随，不要用力扭；第一式可以平视前方，不必仰头；第五式摇头时头部不要低于心脏，幅度小一些。动作要慢，有头晕、手麻就停下。',
   'Move 4 (looking backward) and the upward gaze in move 1 load the neck most. Halve the head turn, lead with the eyes and let the neck follow without forcing; in move 1 you can look straight ahead instead of up. In move 5 keep the head above heart level and the circle small. Move slowly, and stop if you feel dizzy or your hands tingle.'),
  ('mod-shoulder', 'modify', None, 'Shoulder pain, frozen shoulder, cannot raise arms overhead',
   '肩膀疼、手举不过头怎么办？', 'My shoulder hurts and I can’t raise my arms overhead. What should I do?',
   '把手举到不痛的高度就停，比如胸前或额前，随着练习慢慢加高；第一式和第三式上托时肘部可以微屈；第二式拉弓幅度小一些；不要甩手或借力。如果是冻结肩，温和、规律、无痛的活动有帮助，但持续疼痛或受伤后请先看医生。',
   'Lift only as high as is pain-free, for example chest or forehead height, and raise it gradually over the weeks. Keep a slight bend in the elbows when pushing up in moves 1 and 3, draw a smaller bow in move 2, and never swing or jerk the arms. With a frozen shoulder, gentle, regular, pain-free movement helps, but see a doctor first for ongoing pain or after an injury.'),
  ('mod-balance', 'modify', None, 'Poor balance, older adults, elderly, fear of falling, using a chair for support',
   '平衡不好或年纪大，怎么安全地练？', 'I have poor balance or I am older. How do I practise safely?',
   '在稳固的椅背或台面旁练，一只手扶住；脚距稍宽，马步站高；第四式、第五式转动慢一些；第八式颠足改为扶椅缓慢提踵、脚跟轻轻落下，不要用力震脚。身边留出空间、地面防滑，穿平底鞋。熟练后再逐渐松手。',
   'Practise beside a sturdy chair back or counter and keep one hand on it. Stand with feet a little wider and the stance high, turn slowly in moves 4 and 5, and in move 8 rise onto the toes holding the chair and lower the heels gently instead of dropping. Clear the space around you, use a non-slip floor and wear flat shoes. Let go of the support only once you feel steady.'),
  ('mod-bp-heart', 'modify', None, 'High blood pressure, hypertension, heart disease, heart conditions',
   '高血压或心脏病能练吗？', 'Can I practise with high blood pressure or a heart condition?',
   '多数情况下温和练习是适合的，但先问过医生。练时自然呼吸，绝对不要憋气；第六式攀足和第五式摇头时头部不要低于心脏；第七式握拳不要咬牙用力；动作慢起慢落。出现胸痛、胸闷、心慌、头晕或气短，立即停止并就医。',
   'Gentle practice usually suits, but check with your doctor first. Breathe naturally and never hold your breath. In move 6 and move 5 keep your head above heart level, don’t clench your jaw or strain in the fist punches of move 7, and rise and lower slowly. Stop immediately and get medical help if you feel chest pain or tightness, palpitations, dizziness or shortness of breath.'),
  ('mod-pregnancy', 'modify', None, 'Pregnancy, pregnant, postpartum',
   '怀孕期间能练八段锦吗？', 'Can I practise Baduanjin while pregnant?',
   '很多孕妇在医生同意后练习温和的站姿或坐姿动作。注意：马步站高、脚距不要太宽；第六式攀足改为双手扶大腿、不压迫腹部；第八式颠足改为轻轻提踵不震落；避免憋气和过度扭转，随时可以坐下。孕期有任何并发症或不适，先咨询产科医生；产后恢复也请先得到医生许可。',
   'Many people practise gentle standing or seated versions during pregnancy with their doctor’s approval. Keep the stance high and not too wide; in move 6 rest your hands on your thighs and don’t compress the belly; in move 8 rise gently onto the toes without dropping; avoid breath-holding and deep twists, and sit down whenever you need to. With any complication or discomfort, ask your obstetrician first, and get clearance before restarting after giving birth.'),
  ('mod-osteoporosis', 'modify', None, 'Osteoporosis, low bone density, fragile bones',
   '骨质疏松可以练吗？', 'Is it safe with osteoporosis?',
   '温和的负重和平衡练习对骨质疏松者通常有益，但要改两处：第六式不要深度前屈，双手扶大腿、背部平直；第八式颠足不要用力震落，改为缓慢提踵、轻轻放下。避免负重下的大幅扭转，扶椅练以防跌倒。',
   'Gentle weight-bearing and balance work is usually good for people with osteoporosis, with two changes: in move 6 avoid a deep forward bend, keeping the hands on the thighs and the back flat; in move 8 don’t drop hard onto the heels, rise slowly and lower softly. Avoid big loaded twists, and use a chair for support to prevent falls.'),
  ('mod-dizzy', 'modify', None, 'Dizziness, vertigo, lightheaded when looking up or turning the head',
   '练的时候头晕怎么办？', 'What if I feel dizzy during practice?',
   '先停下，扶稳或坐下，等症状消失。之后再练：第一式不要仰头，眼睛平视；第四式转头、第五式摇头放慢并减小幅度；动作中保持睁眼，自然呼吸不憋气；可以改为坐姿练。头晕反复出现或伴随胸痛、气短，请就医。',
   'Stop, hold on to something or sit down, and wait until it passes. When you continue: don’t tilt the head back in move 1, keep the eyes level; slow down and shrink the head turns in moves 4 and 5; keep your eyes open and breathe naturally without holding your breath; you can switch to the seated version. See a doctor if dizziness keeps coming back or comes with chest pain or breathlessness.'),
  ('mod-hip', 'modify', None, 'Hip replacement, hip pain, hip surgery',
   '做过髋关节置换还能练吗？', 'Can I practise after a hip replacement?',
   '恢复期请按外科医生和康复师的要求来。一般建议：脚距窄一些，马步站高；避免髋部深屈（第六式只扶到大腿）；第五式摇摆幅度小；不要让腿交叉过身体中线。先坐姿练上肢动作，得到许可后再加站姿。',
   'Follow your surgeon’s and physiotherapist’s precautions during recovery. In general: use a narrower, higher stance; avoid deep hip bending (in move 6 reach only to the thighs); keep the swaying in move 5 small; and don’t let a leg cross the body’s midline. Start with the seated arm movements and add standing work once you’re cleared.'),
  ('mod-stance', 'modify', None, 'Horse stance too hard, legs tired or shaking, making stances easier for beginners',
   '马步太累、腿发抖怎么办？', 'The horse stance is too hard and my legs shake. How do I make it easier?',
   '站高一点：膝盖只微屈，脚距缩到略宽于肩。腿抖说明肌肉在适应，可以缩短停留时间或只做一侧再休息。随着几周练习，再逐渐降低高度。重点是上身中正、膝盖对脚尖，而不是蹲得低。',
   'Stand taller: bend the knees only slightly and narrow the feet to just wider than the shoulders. Shaking means the muscles are adapting; shorten the hold or rest between sides. Lower the stance gradually over a few weeks. What matters is an upright torso and knees over the toes, not how low you go.'),
  ('mod-toes', 'modify', None, 'Cannot touch toes, tight hamstrings, limited flexibility in forward bend',
   '摸不到脚尖怎么办？', 'I can’t touch my toes. Is that OK?',
   '完全没关系。第六式摸到膝盖或小腿就好，膝盖可以微屈，背部尽量平直，用髋部折叠。柔韧性会随着练习慢慢改善，不要弹振或硬压。有高血压、腰椎或骨质疏松问题时，双手停在大腿即可。',
   'Completely fine. In move 6 reach to your knees or shins, bend the knees a little, keep the back as flat as you can and hinge at the hips. Flexibility improves gradually; never bounce or force the stretch. With high blood pressure, back problems or osteoporosis, stop with your hands on your thighs.'),
  ('mod-short', 'modify', None, 'Short on time, only a few minutes, shorter version of the routine',
   '时间很少，能只练几分钟吗？', 'I only have a few minutes. Can I do a shorter version?',
   '可以。在“全套跟练”里，八式各一遍约 80 秒；三遍大约 5 分钟。也可以只挑一两式重点练，比如久坐后练第一式和第四式。短而规律的练习同样有效，有时间时再做完整版。',
   'Yes. In Full routine, one round of all eight moves takes about 80 seconds, so three rounds take about 5 minutes. You can also focus on one or two moves, for example moves 1 and 4 after sitting. Short, regular practice works too; do the full version when you have time.'),
  ('mod-injury', 'modify', None, 'Recent surgery, recovering from injury, chronic illness, when to get medical clearance',
   '刚做完手术或受伤，什么时候能练？', 'When can I practise after surgery or an injury?',
   '先得到医生或康复师的许可，并问清楚哪些动作要避免。恢复初期从坐姿上肢动作开始，范围小、速度慢；受伤部位不痛再逐步加量。任何动作引起疼痛加重、肿胀或伤口不适，都要停下。',
   'Get clearance from your doctor or physiotherapist first, and ask which movements to avoid. Early on, start with seated arm movements in a small range at a slow pace, and build up only while the injured area stays pain-free. Stop any movement that increases pain or swelling or bothers a wound.'),
  # ------------------------------------------------------------------ keep in mind
  ('k-breathing', 'caution', None, 'How to breathe during Baduanjin; breathing technique; holding breath',
   '练八段锦时怎么呼吸？', 'How should I breathe during Baduanjin?',
   '初学时自然呼吸，用鼻吸鼻呼，不要刻意憋气。熟练后再配合动作：向上、向外展开时吸气，下落、收回时呼气，动作停顿处可稍停。App 里的呼吸环会提示 吸 / 呼 / 停。感到气短就回到自然呼吸。',
   'At first just breathe naturally, in and out through the nose, and never force or hold your breath. Once the moves feel familiar, match the breath to them: inhale as you rise or open, exhale as you lower or close, with a brief pause at the held positions. The breathing ring in the app shows 吸 inhale / 呼 exhale / 停 pause. If you feel short of breath, go back to natural breathing.'),
  ('k-when', 'caution', None, 'Best time of day to practise; after meals; on an empty stomach; before bed',
   '什么时候练最好？饭后能练吗？', 'When is the best time to practise? Can I do it after eating?',
   '早晨和傍晚都很好，选你能坚持的时间。饭后约一小时再练，太饱时做前屈和转体会不舒服；也不要空腹饿着练。睡前练要放慢、轻柔一些。',
   'Morning and evening are both good; pick a time you can keep. Wait about an hour after a meal, since forward bends and twists are uncomfortable on a full stomach, and don’t practise when very hungry either. Before bed, keep it slow and gentle.'),
  ('k-warmup', 'caution', None, 'Warm-up before practice and cooling down or closing afterwards',
   '练之前需要热身吗？', 'Do I need to warm up first?',
   '八段锦本身动作温和，可以当作热身。开始前站立放松一两分钟，活动一下手腕、脚踝，转转肩，再从预备势开始；结束时做收势：两手叠于腹前，静站片刻、调匀呼吸，再慢慢走动。天冷时多活动一会儿。',
   'Baduanjin is gentle enough to serve as a warm-up itself. Before starting, stand relaxed for a minute or two and circle the wrists, ankles and shoulders, then begin from the preparation stance. Finish with the closing: hands resting on the lower belly, stand still for a moment and let the breath settle, then walk around slowly. Warm up a little longer when it’s cold.'),
  ('k-pain', 'caution', None, 'Pain or muscle soreness during or after practice; stretch versus pain; when to stop',
   '练的时候感到疼痛正常吗？', 'Is it normal to feel pain during practice?',
   '轻微的拉伸感和肌肉酸是正常的，刺痛、关节痛、麻木则不正常。原则是“七分力”：动作做到舒适的极限之前就停。疼痛时减小幅度或跳过该动作；第二天的轻度肌肉酸会自行缓解，关节持续疼痛请咨询医生。',
   'A mild stretch or muscle ache is normal; sharp pain, joint pain or numbness is not. Work at about 70% effort and stop short of your comfortable limit. If something hurts, make it smaller or skip it. Mild muscle soreness the next day goes away on its own; ongoing joint pain is a reason to see a doctor.'),
  ('k-stop', 'caution', None, 'Warning signs to stop immediately: chest pain, shortness of breath, fainting, severe dizziness',
   '出现什么情况要马上停下？', 'When should I stop immediately?',
   '出现以下情况请立即停止并坐下休息：胸痛或胸闷、明显气短、心慌、头晕或眼前发黑、恶心、关节剧痛或突然麻木无力。症状不缓解或较重时，立即就医或拨打急救电话（中国 120，美国 911）。',
   'Stop right away and sit down if you have chest pain or tightness, marked shortness of breath, palpitations, dizziness or faintness, nausea, sharp joint pain, or sudden numbness or weakness. If the symptoms don’t settle or are severe, get medical help now or call emergency services (911 in the US, 120 in China).'),
  ('k-doctor', 'caution', None, 'Who should consult a doctor before starting; medical conditions',
   '哪些人开始前应该先问医生？', 'Who should check with a doctor before starting?',
   '一般健康的人可以直接开始。以下情况建议先咨询医生：心脏病、未控制的高血压、近期手术或骨折、严重骨质疏松、关节置换、孕期、经常头晕或跌倒、慢性病急性发作期。医生通常会鼓励温和运动，并告诉你哪些动作要改。',
   'Healthy people can simply start. Check with a doctor first if you have heart disease, uncontrolled high blood pressure, recent surgery or a fracture, severe osteoporosis, a joint replacement, a pregnancy, frequent dizziness or falls, or a flare-up of a chronic condition. Doctors usually encourage gentle exercise and can tell you which movements to adapt.'),
  ('k-frequency', 'caution', None, 'How often to practise; how many times per week; how many repetitions',
   '多久练一次？每次练几遍？', 'How often should I practise, and how many rounds?',
   '每天或每周至少 3–5 次最好。初学者每次跟练一遍完整套路（约 12 分钟的标准版，或 App 里的 80 秒速览版练 3–5 遍），再挑一个还不熟的动作单独慢练。标准套路中每式重复的次数在“分解”标签里有写。',
   'Daily, or at least 3–5 times a week, works best. As a beginner, follow one full round each session (the standard set takes about 12 minutes, or do the app’s 80-second routine 3–5 times), then slow-practise one move you don’t know well yet. The standard number of reps for each move is listed in its Steps tab.'),
  ('k-mistakes', 'caution', None, 'Most common general mistakes beginners make',
   '初学者最常见的错误有哪些？', 'What mistakes do beginners make most?',
   '最常见的五个：憋气；耸肩、肩膀紧张；膝盖锁死或内扣；动作太快、用力过猛；只顾手、身体歪斜。纠正方法：自然呼吸、沉肩坠肘、膝盖微屈对脚尖、放慢到 0.75×、多用侧面和背面视角对照身体是否中正。',
   'The five most common: holding the breath; shrugging or tensing the shoulders; locking the knees or letting them cave in; moving too fast or too forcefully; and focusing on the hands while the body leans. Fixes: breathe naturally, drop the shoulders and elbows, keep knees soft and over the toes, slow the video to 0.75×, and use the side and back views to check that you stay upright.'),
  ('k-clothing', 'caution', None, 'What to wear, shoes, barefoot, space and floor needed',
   '练习时穿什么？需要多大地方？', 'What should I wear, and how much space do I need?',
   '穿宽松、有弹性的衣服；平底软鞋或防滑袜，地面不滑时也可以赤脚，但第八式颠足在硬地上最好穿鞋缓冲。需要大约两臂张开、前后一步的空间，周围不要有尖角家具。',
   'Wear loose, stretchy clothes, and flat, soft shoes or grippy socks; barefoot is fine on a non-slip floor, but wear shoes for the heel drops of move 8 on hard floors. You need about arms’-width of space and a step in each direction, away from sharp furniture.'),
  ('k-mind', 'caution', None, 'Mental focus, relaxation, intention, mindfulness while practising',
   '练的时候心里想什么？', 'What should I focus on mentally?',
   '讲究“松静自然”：身体放松但不懈怠，心思放在动作和呼吸上。每个动作先想清楚方向（向上撑、向外拉、向下按），再慢慢做出来。走神了就回到呼吸。音乐和背景可以帮助进入状态。',
   'The traditional principle is “relaxed, calm and natural”: loose but not slack, with your attention on the movement and the breath. Before each move, picture its direction (push up, draw out, press down), then move slowly into it. When your mind wanders, come back to the breath. The music and scenes can help you settle.'),
  ('k-order', 'caution', None, 'Do I have to do all eight moves in order; practising single moves; doing both sides',
   '一定要按顺序把八式练完吗？', 'Do I have to do all eight moves in order?',
   '完整套路按顺序练效果最好，因为八式从上到下、由开到合地安排。但单独练某一式也完全可以，比如肩颈僵硬就多练第一式和第四式。左右两侧的动作要做得一样多。',
   'The full set in order works best, because it is arranged to progress through the body and from opening to closing. But practising a single move is perfectly fine, for example extra rounds of moves 1 and 4 for a stiff neck. Always do equal reps on the left and right.'),
  ('k-age', 'caution', None, 'Is Baduanjin suitable for any age, children, teenagers, seniors, beginners',
   '什么年龄的人适合练？', 'Is Baduanjin suitable for any age?',
   '几乎所有年龄都适合：动作慢、冲击小，学校、社区和老年活动中心都在推广。儿童可以当作伸展游戏，老年人扶椅、站高练更安全。行动不便者可以坐着练。',
   'Almost any age: it is slow and low-impact, and it is taught in schools, community groups and senior centres. Children can treat it as a stretching game; older adults are safest with a chair for support and a high stance; people with limited mobility can do it seated.'),
  ('k-vs-taichi', 'caution', None, 'Difference between Baduanjin, tai chi and other qigong; which to learn first',
   '八段锦和太极拳有什么区别？', 'How is Baduanjin different from tai chi?',
   '八段锦是健身气功：八个独立动作，每个反复做几遍，好学好记，一两周就能掌握大概。太极拳是连贯的套路，动作多、步法复杂，需要更长时间学习。很多人先学八段锦作为入门和每天的热身，再学太极。',
   'Baduanjin is a health qigong set: eight separate movements, each repeated a few times, so it is easy to learn and remember, and you can get the outline in a week or two. Tai chi is a continuous form with many movements and more complex footwork that takes longer to learn. Many people start with Baduanjin as a first program and daily warm-up, then move on to tai chi.'),
  ('k-app', 'caution', None, 'How to learn with this app: slow motion, mirror mode, camera angles, loops, step pause',
   '用这个 App 怎么学最有效？', 'How do I learn best with this app?',
   '建议：①先用“单式精学”一式一式学，速度调到 0.5×–0.75×；②打开“镜像”，面对屏幕时左右和你一致；③用左、右、背面和四视角看清身体姿态；④点步骤里的 ↻ 单步循环，难点反复练；⑤开“逐步停”，每步结束自动暂停跟做；⑥熟练后到“全套跟练”连起来练。',
   'Try this: 1) learn one move at a time in Learn a move, at 0.5×–0.75× speed; 2) turn on Mirror so left and right match you as you face the screen; 3) use the left, right, back and 4-angle views to check your posture; 4) tap ↻ on a step to loop the hard part; 5) switch on Step pause to stop after each step and copy it; 6) once it feels familiar, join everything up in Full routine.'),
]

# Per-move adaptation advice (authored; complements the move's own benefits/mistakes in moves.json)
ADAPT = {
  1: ('肩部受限时手只举到不痛的高度，肘部微屈；颈部不适或易头晕时不必仰头看手，平视即可；可以坐着做。',
      'With limited shoulders, lift only to a pain-free height with soft elbows; if your neck is sore or you get dizzy, don’t look up at the hands, keep the gaze level; it also works seated.'),
  2: ('马步站高、脚距缩小；腿力不够时可以不下蹲，只做上身拉弓；肩痛时拉弓幅度小一些；坐姿也能完整做上肢动作。',
      'Use a higher, narrower stance; if your legs tire, skip the squat and do only the bow-draw with the upper body; draw a smaller bow if a shoulder hurts; the arm movement works fully seated.'),
  3: ('上举之手只举到舒适高度，肘部可以微屈；下按之手不必用力；膝盖保持微屈不锁死；坐姿同样可做。',
      'Raise the upper hand only as far as is comfortable, elbow slightly bent; the lower hand needn’t press hard; keep the knees soft, not locked; it works seated too.'),
  4: ('颈椎不好时转头幅度减半，用眼睛带动；容易头晕的人放慢速度、保持睁眼；可以坐在椅子上做。',
      'With neck problems, halve the turn and lead with the eyes; if you get dizzy, slow down and keep your eyes open; you can do it sitting on a chair.'),
  5: ('这是八式中负荷最大的一式：马步站高，摆动幅度和下蹲深度都减小，可双手扶大腿支撑；高血压、头晕或颈椎问题者头部不要低于心脏；膝盖不好时只做小幅上身摆动。',
      'This is the most demanding move: use a high stance, make the sway and the dip smaller, and rest the hands on the thighs for support; with high blood pressure, dizziness or neck problems keep the head above the heart; with bad knees do only a small upper-body sway.'),
  6: ('摸到膝盖或小腿即可，膝盖微屈，背部平直；高血压、颈椎病、腰椎间盘突出、骨质疏松或孕期，双手停在大腿、头部不低于心脏；坐姿时双手沿大腿滑到膝部。',
      'Reach only to the knees or shins with soft knees and a flat back; with high blood pressure, neck or disc problems, osteoporosis or pregnancy, stop with the hands on the thighs and keep the head above the heart; seated, slide the hands down the thighs to the knees.'),
  7: ('马步站高；出拳轻松，不咬牙、不憋气，高血压者尤其注意；“怒目”只是眼神专注，表情保持放松；坐姿也可以出拳。',
      'Keep the stance high; punch lightly without clenching the jaw or holding the breath, especially with high blood pressure; the “glaring eyes” just means a focused gaze, with a relaxed face; you can punch seated too.'),
  8: ('平衡不好时扶椅背；骨质疏松、足跟痛、踝关节或膝关节问题者不要震落，改为缓慢提踵、脚跟轻放；坐姿时做提踵放下。',
      'Hold a chair back if your balance is unsteady; with osteoporosis, heel pain, or ankle or knee problems, don’t drop: rise slowly and lower the heels softly; seated, lift and lower the heels.'),
}


def move_entries():
    out = []
    for m in MOVES:
        n, zh, en = m['id'], m['nameZh'], m['nameEn']
        tag = '第%s式' % m['seal']
        out.append({
            'id': 'm%d-benefit' % n, 'cat': 'move', 'move': n,
            'desc': 'Move %d %s (%s): its benefits, what it is good for, and how to breathe in it' % (n, en, zh),
            'q': {'zh': '%s“%s”有什么好处？' % (tag, zh), 'en': 'What is move %d, %s, good for?' % (n, en)},
            'a': {'zh': '%s 呼吸：%s 遍数：%s。' % (m['benefitsZh'], m['breathingZh'], m['repsZh']),
                  'en': '%s Breathing: %s Reps: %s.' % (m['benefitsEn'], m['breathingEn'], m['repsEn'])},
        })
        kp_zh = '；'.join(k['zh'].rstrip('。') for k in m.get('keyPoints', []))
        kp_en = ' '.join(k['en'] for k in m.get('keyPoints', []))
        mi_zh = '；'.join('%s → %s' % (x['zh'].rstrip('。'), x['fixZh'].rstrip('。')) for x in m.get('mistakes', []))
        mi_en = ' '.join('%s → %s' % (x['en'], x['fixEn']) for x in m.get('mistakes', []))
        out.append({
            'id': 'm%d-technique' % n, 'cat': 'move', 'move': n,
            'desc': 'Move %d %s (%s): how to do it correctly, key points and common mistakes' % (n, en, zh),
            'q': {'zh': '%s“%s”要注意什么、常见错误有哪些？' % (tag, zh), 'en': 'How do I do move %d, %s, correctly?' % (n, en)},
            'a': {'zh': '要领：%s。易错：%s。' % (kp_zh, mi_zh), 'en': 'Key points: %s Common mistakes: %s' % (kp_en, mi_en)},
        })
        a_zh, a_en = ADAPT[n]  # ADAPT already covers the move's own caution text (move 6)
        out.append({
            'id': 'm%d-adapt' % n, 'cat': 'move', 'move': n,
            'desc': 'Move %d %s (%s): how to modify or make it easier, and cautions for health conditions' % (n, en, zh),
            'q': {'zh': '%s“%s”怎么简化、谁要小心？' % (tag, zh), 'en': 'How can I modify move %d, %s?' % (n, en)},
            'a': {'zh': a_zh, 'en': a_en},
        })
    return out


def build():
    entries = []
    for (i, cat, mv, desc, qz, qe, az, ae) in G:
        entries.append({'id': i, 'cat': cat, 'move': mv, 'desc': desc, 'q': {'zh': qz, 'en': qe}, 'a': {'zh': az, 'en': ae}})
    entries += move_entries()
    ids = [e['id'] for e in entries]
    assert len(ids) == len(set(ids)) and len(ids) <= 255, 'ids must be unique and fit one Choice question'
    data = {
        'version': 1,
        'starters': {  # the three chips shown when the chat opens
            'benefits': ['b-overview', 'b-stress-sleep', 'b-balance'],
            'modify': ['mod-knees', 'mod-seated', 'mod-back'],
            'caution': ['k-breathing', 'k-stop', 'k-when'],
        },
        'safety': 'k-stop',
        'entries': entries,
    }
    os.makedirs(os.path.join(WEB, 'content'), exist_ok=True)
    with open(os.path.join(WEB, 'content', 'ask.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(os.path.join(WEB, 'data-ask.js'), 'w', encoding='utf-8') as f:
        f.write('/* GENERATED by tools/ask_content.py, do not edit */\nwindow.BDJ_ASK = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    print('wrote %d answers (%d general, %d move) to data-ask.js + content/ask.json' % (len(entries), len(G), len(entries) - len(G)))


if __name__ == '__main__':
    build()
