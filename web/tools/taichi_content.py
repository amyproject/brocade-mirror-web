#!/usr/bin/env python3
"""Source of the Tai Chi site content (web/taichi.html). Writes web/content/taichi.json and
web/data-taichi.js. Step times are seconds within each outfit's 10 s front clip in
taichi/me_video/<outfit>/moves/<slug>/front.mp4 (the two outfits are separate takes).
Backgrounds and music are shared with the Baduanjin site (read from moves.json)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
BDJ = json.load(open(os.path.join(WEB, "..", "Baduanjin", "Resources", "moves.json"), encoding="utf-8"))

def P(zh, en): return {"zh": zh, "en": en}
def S(zh, en, breath, best, red, qipao): return {"zh": zh, "en": en, "breath": breath, "best": best, "t": {"red": red, "qipao": qipao}}
def M(zh, en, fzh, fen): return {"zh": zh, "en": en, "fixZh": fzh, "fixEn": fen}
def F(zh, en, x, y, s): return {"zh": zh, "en": en, "x": x, "y": y, "scale": s}
ALL = ["front", "left", "right", "back"]

moves = [
 dict(id=1, slug="01-commencing", seal="壹", nameZh="起势", nameEn="Commencing Form",
  subtitleZh="开步抬臂 · 气沉丹田", subtitleEn="Open the stance, raise the arms, sink the qi",
  angles={"red": ["front", "right", "back"], "qipao": ALL},
  benefitsZh="起势是整套太极的开端：放松全身、调匀呼吸、把注意力收回身体，为后面的动作做好准备。",
  benefitsEn="The opening of every Tai Chi set: it relaxes the body, evens the breath and brings your attention inward, ready for what follows.",
  breathingZh="两臂上抬时吸气，屈膝下按时呼气。", breathingEn="Inhale as the arms float up, exhale as the knees bend and the palms press down.",
  repsZh="缓慢做 3 遍", repsEn="3 slow repetitions",
  steps=[S("两脚开立与肩同宽，两臂自然下垂，头正身直。", "Step out to shoulder width, arms hanging naturally, head and body upright.", "out", "front", [0, 1.5], [0, 1.5]),
         S("两臂慢慢向前平举，与肩同高，手腕放松。", "Float both arms forward and up to shoulder height, wrists relaxed.", "in", "right", [1.5, 4.5], [1.5, 4.5]),
         S("屈膝松胯，两掌轻轻下按至腹前。", "Bend the knees, relax the hips and gently press the palms down in front of the belly.", "out", "front", [4.5, 7.5], [4.5, 7.5]),
         S("沉肩坠肘，静立片刻，气沉丹田。", "Drop the shoulders and elbows, stand quietly, let the breath sink to the belly.", "hold", "back", [7.5, 10], [7.5, 10])],
  keyPoints=[P("上抬时肩不耸，好像手腕被线轻轻提起。", "Don’t lift the shoulders — feel as if a thread lifts the wrists."),
             P("下按与屈膝同时，上下相随。", "Press down and bend the knees together — upper and lower body move as one."),
             P("膝盖不超过脚尖，臀部不后翘。", "Knees stay behind the toes; the hips don’t stick out.")],
  mistakes=[M("耸肩、手臂僵直。", "Shoulders hunched, arms stiff.", "沉肩坠肘，手臂微屈如抱气球。", "Sink the shoulders and elbows; keep the arms softly rounded."),
            M("下蹲时低头弯腰。", "Looking down and bending at the waist when sinking.", "头顶虚领，躯干保持竖直下沉。", "Lift the crown and sink straight down.")],
  focus=[F("手臂", "Arms", 0.5, 0.35, 1.9), F("双膝", "Knees", 0.5, 0.72, 2.2)],
  angleTips={"front": P("两臂平行、左右对称", "Arms parallel and symmetrical"), "left": P("手臂高度与肩平", "Arms at shoulder height"),
             "right": P("手臂高度与肩平", "Arms at shoulder height"), "back": P("沉肩，脊柱竖直", "Shoulders sinking, spine upright")}),
 dict(id=2, slug="02-repulse-monkey", seal="贰", nameZh="倒卷肱", nameEn="Repulse the Monkey",
  subtitleZh="退步卷肱 · 以退为进", subtitleEn="Step back while the arms coil — yield to advance",
  angles={"red": ALL, "qipao": ALL},
  benefitsZh="退步练习平衡与下肢控制，转腰卷臂能放松肩背、增强协调。", benefitsEn="Stepping back trains balance and leg control; the waist turn and arm coil loosen the shoulders and back and build coordination.",
  breathingZh="后手划弧向上时吸气，推掌退步时呼气。", breathingEn="Inhale as the rear hand circles up, exhale as you push and step back.",
  repsZh="左右交替 4 次", repsEn="Alternate left and right, 4 times",
  steps=[S("转腰，后手向后上方划弧至肩高，掌心向上。", "Turn the waist; the rear hand circles back and up to shoulder height, palm up.", "in", "left", [0, 3.5], [0, 3.5]),
         S("后手屈肘经耳侧向前推出，同时退步。", "Bend the rear elbow, bring the hand past the ear and push forward as you step back.", "out", "front", [3.5, 6.5], [3.5, 6.5]),
         S("前手收回腰侧，重心落在后腿。", "The front hand draws back to the waist; the weight settles on the back leg.", "hold", "right", [6.5, 8], [6.5, 8]),
         S("换另一侧，左右交替退步卷肱。", "Switch sides and keep alternating as you step back.", "in", "back", [8, 10], [8, 10])],
  keyPoints=[P("退步时脚尖先着地，再慢慢踩实。", "Step back toes first, then slowly roll onto the whole foot."),
             P("两脚不要踩在一条直线上，保持左右间距。", "Keep the feet apart side to side — not on one line."),
             P("推掌与退步同时完成，以腰带手。", "Finish the push and the step together, led by the waist.")],
  mistakes=[M("退步时身体后仰或左右摇晃。", "Leaning back or wobbling when stepping.", "上体中正，先稳住重心再退步。", "Keep the torso upright; settle the weight before stepping."),
            M("推掌只用手臂，腰没有转。", "Pushing with the arm only, no waist turn.", "先转腰，手臂随腰而动。", "Turn the waist first; the arm follows.")],
  focus=[F("推掌", "Push", 0.4, 0.33, 2.2), F("退步", "Step back", 0.5, 0.82, 2.2)],
  angleTips={"front": P("推掌高度与肩平", "Push at shoulder height"), "left": P("后手划弧的路线", "The rear hand’s arc"),
             "right": P("退步时脚尖先着地", "Toes land first when stepping back"), "back": P("转腰，两肩平稳", "Waist turns, shoulders level")}),
 dict(id=3, slug="03-brush-knee", seal="叁", nameZh="搂膝拗步", nameEn="Brush Knee and Push",
  subtitleZh="搂膝推掌 · 上下相随", subtitleEn="Brush past the knee and push — upper and lower body as one",
  angles={"red": ALL, "qipao": ALL},
  benefitsZh="弓步与推掌配合，强健腿部，练习重心转移和全身协调。", benefitsEn="Combining the bow stance with the push strengthens the legs and trains weight shifting and whole-body coordination.",
  breathingZh="转体划弧时吸气，弓步推掌时呼气。", breathingEn="Inhale while turning and circling, exhale as you push in the bow stance.",
  repsZh="左右各 3 次", repsEn="3 times each side",
  steps=[S("转体收脚，一手划弧至耳侧，一手落于胸前。", "Turn and draw the foot in; one hand circles up beside the ear, the other settles in front of the chest.", "in", "front", [0, 1.5], [0, 2]),
         S("上步成弓步，下手搂过膝前，上手向前推出。", "Step into a bow stance; the lower hand brushes past the knee as the upper hand pushes forward.", "out", "left", [1.5, 5.5], [2, 5]),
         S("重心后坐，前脚尖外撇，准备换步。", "Sit back, turn the front toes out, ready to switch.", "in", "back", [5.5, 7], [5, 7]),
         S("换另一侧，搂膝推掌。", "Repeat on the other side: brush the knee and push.", "out", "right", [7, 10], [7, 10])],
  keyPoints=[P("弓步前膝对准脚尖，后腿自然伸直。", "Front knee over the toes, back leg naturally extended."),
             P("推掌时沉肩坠肘，掌根用力。", "Sink the shoulder and elbow and push through the palm heel."),
             P("两脚横向保持约一拳宽，站得稳。", "Keep about a fist’s width between the feet side to side for stability.")],
  mistakes=[M("弓步时两脚在一条线上，身体不稳。", "Feet on one line in the bow stance, so you wobble.", "横向留出间距，像走在两条轨道上。", "Leave width between the feet, like walking on two rails."),
            M("推掌时上体前倾。", "Leaning forward when pushing.", "力从后脚经腰传到手，上体保持中正。", "Power travels from the back foot through the waist; stay upright.")],
  focus=[F("推掌", "Push", 0.35, 0.35, 2.2), F("弓步", "Bow stance", 0.5, 0.8, 2.0)],
  angleTips={"front": P("搂手经过膝前", "The brushing hand passes the knee"), "left": P("弓步：前膝不过脚尖", "Bow stance: knee behind the toes"),
             "right": P("推掌与弓步同时完成", "Push and stance finish together"), "back": P("两脚横向间距", "Width between the feet")}),
 dict(id=4, slug="04-wild-horse", seal="肆", nameZh="野马分鬃", nameEn="Part the Wild Horse’s Mane",
  subtitleZh="弓步分掌 · 舒展大方", subtitleEn="Open the arms in a bow stance — expansive and calm",
  angles={"red": ALL, "qipao": ALL},
  benefitsZh="抱球与分掌舒展胸背，弓步转换提高腿部力量和平衡。", benefitsEn="Holding the ball and parting the hands opens the chest and back; the stance changes build leg strength and balance.",
  breathingZh="抱球时吸气，分掌弓步时呼气。", breathingEn="Inhale as you hold the ball, exhale as the hands part in the bow stance.",
  repsZh="左右各 3 次", repsEn="3 times each side",
  steps=[S("收脚抱球：一手在上一手在下，掌心相对。", "Draw the foot in and hold a ball: one hand above, one below, palms facing.", "in", "front", [0, 2], [0, 1.5]),
         S("上步成弓步，两手斜向分开，前手与眼同高。", "Step into a bow stance and part the hands diagonally, front hand at eye level.", "out", "left", [2, 5.5], [1.5, 5]),
         S("重心后坐，翻掌在另一侧抱球。", "Sit back and turn the palms to hold the ball on the other side.", "in", "back", [5.5, 7.5], [5, 7.5]),
         S("换另一侧上步分鬃。", "Step through and part the mane on the other side.", "out", "right", [7.5, 10], [7.5, 10])],
  keyPoints=[P("分掌时以腰带臂，两手一上一下同时分开。", "Let the waist drive the arms; both hands part at the same time."),
             P("前手掌心斜向上，后手按于胯旁。", "Front palm angled up, rear hand pressing by the hip."),
             P("上步时脚跟先着地，轻起轻落。", "Land the heel first when stepping — light and soft.")],
  mistakes=[M("抱球时耸肩夹臂。", "Shoulders hunched and arms squeezed when holding the ball.", "两臂撑圆，腋下留空。", "Keep the arms rounded with space under the armpits."),
            M("弓步太窄或太长，重心不稳。", "Stance too narrow or too long, unstable.", "前后约三脚长，左右约一拳宽。", "About three foot-lengths long and a fist wide.")],
  focus=[F("分掌", "Parting hands", 0.45, 0.35, 1.9), F("弓步", "Bow stance", 0.5, 0.8, 2.0)],
  angleTips={"front": P("两手分开的方向", "Direction the hands part"), "left": P("前手与眼同高", "Front hand at eye level"),
             "right": P("后手按于胯旁", "Rear hand by the hip"), "back": P("转腰带动两臂", "The waist turns the arms")}),
 dict(id=5, slug="05-wave-hands", seal="伍", nameZh="云手", nameEn="Wave Hands Like Clouds",
  subtitleZh="腰为轴 · 手如行云", subtitleEn="The waist turns, the hands drift like clouds",
  angles={"red": ALL, "qipao": ALL},
  benefitsZh="以腰为轴的连续转动放松腰背，侧行步改善平衡与专注。", benefitsEn="Continuous turning around the waist loosens the back, and the side steps improve balance and focus.",
  breathingZh="手向上云时吸气，向下云时呼气，自然连贯。", breathingEn="Inhale as a hand rises, exhale as it sinks — smooth and continuous.",
  repsZh="向侧方云手 3 次", repsEn="3 cloud hands to the side",
  steps=[S("一手向上云至面前，一手向下云至腹前。", "One hand rises in front of the face as the other sinks in front of the belly.", "in", "front", [0, 2.5], [0, 2.5]),
         S("以腰带手，向一侧云转，眼随上手。", "Turn from the waist, carrying the hands to the side; eyes follow the upper hand.", "out", "back", [2.5, 5], [2.5, 5]),
         S("侧行步：一脚并向另一脚。", "Side step: bring one foot in beside the other.", "in", "left", [5, 7.5], [5, 7.5]),
         S("两手交换上下，继续向侧方开步云转。", "Swap the hands and keep stepping and turning to the side.", "out", "front", [7.5, 10], [7.5, 10])],
  keyPoints=[P("腰是轴，手跟着腰走，不要只摆手臂。", "The waist is the axle — the hands follow it, not just the arms waving."),
             P("重心平移，身体高度保持不变。", "Shift the weight level — your height stays the same."),
             P("并步时脚尖先着地，两脚平行。", "Toes touch first when stepping in; feet parallel.")],
  mistakes=[M("身体忽高忽低。", "Bobbing up and down.", "保持膝盖弯曲的高度一致。", "Keep the same knee bend throughout."),
            M("只动手臂，腰不转。", "Only the arms move, the waist stays still.", "先转腰，再带动手臂画圆。", "Turn the waist first, then let it draw the arm circles.")],
  focus=[F("双手", "Hands", 0.5, 0.33, 2.0), F("步法", "Footwork", 0.5, 0.84, 2.2)],
  angleTips={"front": P("两手一上一下画圆", "Hands circle one up, one down"), "left": P("并步时身体高度不变", "Height stays level when stepping in"),
             "right": P("并步时身体高度不变", "Height stays level when stepping in"), "back": P("以腰为轴转动", "Turning around the waist")}),
 dict(id=6, slug="06-golden-rooster", seal="陆", nameZh="金鸡独立", nameEn="Golden Rooster Stands on One Leg",
  subtitleZh="提膝独立 · 稳如松", subtitleEn="Lift the knee and stand — steady as a pine",
  angles={"red": ["front"], "qipao": ["front"]},
  benefitsZh="单腿站立锻炼平衡与核心力量，对预防跌倒很有帮助。", benefitsEn="Standing on one leg builds balance and core strength — great for preventing falls.",
  breathingZh="提膝时吸气，站稳时自然呼吸，落脚时呼气。", breathingEn="Inhale as the knee lifts, breathe naturally while balancing, exhale as the foot lowers.",
  repsZh="左右各 2 次，每次站稳 3 秒", repsEn="2 times each side, hold 3 s each",
  steps=[S("重心慢慢移到支撑腿，站稳。", "Slowly shift your weight onto the standing leg and settle.", "out", "front", [0, 2], [0, 2]),
         S("提膝过腰，同侧手上挑至面前。", "Lift the knee above the waist; the same-side hand rises in front of the face.", "in", "front", [2, 4], [2, 4]),
         S("独立站稳，另一手按于胯旁。", "Balance on one leg, the other hand pressing by the hip.", "hold", "front", [4, 6.5], [4, 6.5]),
         S("落脚还原，换另一侧。", "Lower the foot and switch sides.", "out", "front", [6.5, 10], [6.5, 10])],
  keyPoints=[P("支撑腿微屈，不要锁死膝盖。", "Keep the standing knee slightly soft, never locked."),
             P("头向上顶，眼看前方一点帮助平衡。", "Lift the crown and fix your eyes on one point ahead."),
             P("初学可扶椅背练习。", "Beginners can hold a chair back.")],
  mistakes=[M("提膝时身体歪斜。", "Body tilting when the knee lifts.", "收腹立腰，肩胯保持水平。", "Engage the belly; keep shoulders and hips level."),
            M("憋气。", "Holding the breath.", "保持自然呼吸，放松肩膀。", "Keep breathing naturally and relax the shoulders.")],
  focus=[F("上挑手", "Raised hand", 0.5, 0.25, 2.2), F("提膝", "Lifted knee", 0.5, 0.6, 2.0)],
  angleTips={"front": P("肩胯保持水平", "Shoulders and hips level"), "left": P("提膝高过腰", "Knee above the waist"),
             "right": P("提膝高过腰", "Knee above the waist"), "back": P("身体不歪斜", "Body stays vertical")},
  caution=P("平衡不好时请在椅子旁练习。", "If your balance is unsteady, practise next to a chair.")),
 dict(id=7, slug="07-heel-kick", seal="柒", nameZh="蹬脚", nameEn="Heel Kick",
  subtitleZh="分手蹬脚 · 力达脚跟", subtitleEn="Open the arms and kick through the heel",
  angles={"red": ["front"], "qipao": ["front"]},
  benefitsZh="提膝蹬脚增强腿部力量与髋部灵活性，同时考验平衡。", benefitsEn="The knee lift and heel kick strengthen the legs and free the hips while challenging balance.",
  breathingZh="合手提膝时吸气，分手蹬脚时呼气。", breathingEn="Inhale as the hands close and the knee lifts, exhale as the arms open and the heel kicks.",
  repsZh="左右各 2 次", repsEn="2 times each side",
  steps=[S("两手交叉合抱于胸前，提膝。", "Cross the hands in front of the chest and lift the knee.", "in", "front", [0, 2.5], [0, 2.5]),
         S("两手向两侧分开，同时以脚跟向前蹬出。", "Open the arms to the sides as the heel kicks forward.", "out", "front", [2.5, 4.5], [2.5, 4.5]),
         S("收小腿，落步站稳。", "Draw the lower leg back and set the foot down.", "in", "front", [4.5, 6], [4.5, 6]),
         S("换另一侧合手、提膝、蹬脚。", "Repeat on the other side: close, lift, kick.", "out", "front", [6, 10], [6, 10])],
  keyPoints=[P("力在脚跟，脚尖回勾。", "Power goes through the heel; toes pull back."),
             P("分手与蹬脚同时完成，两臂与腿方向一致。", "Arms open as the kick lands; the arm points the same way as the leg."),
             P("蹬脚高度量力而行，稳比高更重要。", "Kick only as high as is comfortable — stable beats high.")],
  mistakes=[M("蹬脚时上体后仰。", "Leaning back while kicking.", "支撑腿微屈，上体保持竖直。", "Soften the standing knee and stay upright."),
            M("用脚尖踢。", "Kicking with the toes.", "勾脚尖，用脚跟发力。", "Flex the foot and push through the heel.")],
  focus=[F("蹬出的脚", "Kicking foot", 0.65, 0.55, 2.0), F("双臂", "Arms", 0.5, 0.33, 1.8)],
  angleTips={"front": P("两臂与腿方向一致", "Arms line up with the leg"), "left": P("脚跟用力，脚尖回勾", "Heel leads, toes pulled back"),
             "right": P("脚跟用力，脚尖回勾", "Heel leads, toes pulled back"), "back": P("上体不后仰", "No leaning back")}),
 dict(id=8, slug="08-grasp-the-birds-tail", seal="捌", nameZh="揽雀尾", nameEn="Grasp the Bird’s Tail",
  subtitleZh="掤捋挤按 · 太极四正", subtitleEn="Ward off, roll back, press, push — the four core energies",
  angles={"red": ["front"], "qipao": ["front"]},
  benefitsZh="包含太极最核心的四种劲法，练习前后重心转换与以腰发力。", benefitsEn="Contains Tai Chi’s four core energies and trains shifting forward and back with power from the waist.",
  breathingZh="掤、挤时呼气，捋、后坐时吸气，按出时呼气。", breathingEn="Exhale on ward-off and press, inhale on roll-back and sitting back, exhale on the push.",
  repsZh="左右各 2 次", repsEn="2 times each side",
  steps=[S("掤：弓步，前臂向前掤出，掌心向内。", "Ward off: in a bow stance, round the forearm forward, palm facing in.", "out", "front", [0, 2.5], [0, 3]),
         S("捋：重心后坐，两手随腰向后下方捋。", "Roll back: sit back and draw both hands down and back with the waist.", "in", "front", [2.5, 5], [3, 5.5]),
         S("挤：两手相搭，重心前移向前挤出。", "Press: join the hands and press forward as the weight shifts.", "out", "front", [5, 7.5], [5.5, 7.5]),
         S("按：后坐分手，再弓步向前按出。", "Push: sit back, separate the hands, then push forward in a bow stance.", "out", "front", [7.5, 10], [7.5, 10])],
  keyPoints=[P("四个动作连贯不断，像推拉潮水。", "Link the four movements without stopping, like a tide flowing in and out."),
             P("后坐时臀部不后翘，前移时膝不过脚尖。", "Don’t stick the hips out when sitting back; keep the knee behind the toes moving forward."),
             P("每个动作都由腰带动。", "The waist leads every movement.")],
  mistakes=[M("捋时只拉手臂，身体不后坐。", "Pulling with the arms only during roll-back.", "先后坐转腰，手臂随之。", "Sit back and turn the waist first; the arms follow."),
            M("按时耸肩、手臂伸直。", "Shoulders up and arms locked on the push.", "沉肩坠肘，手臂保持微屈。", "Sink the shoulders and elbows; keep a slight bend.")],
  focus=[F("双手", "Hands", 0.45, 0.38, 2.0), F("弓步", "Bow stance", 0.5, 0.8, 2.0)],
  angleTips={"front": P("掤捋挤按的路线", "The path of the four energies"), "left": P("前后重心转换", "Weight shifting forward and back"),
             "right": P("前后重心转换", "Weight shifting forward and back"), "back": P("以腰带动", "Led by the waist")}),
]
for m in moves:
    m.setdefault("caution", None)
    m["quad"] = None
    m["repsZh"] = m["repsZh"]; m["thumbTime"] = 0

chapters = [round(i * 473 / 8, 2) for i in range(8)]
data = {
  "version": 1,
  "site": {
    "id": "taichi", "logo": "云手",
    "title": {"zh": "云手 · 太极八式一式一式学", "en": "Cloud Hands · Learn Tai Chi"},
    "paths": {"video": "../../me_video/", "thumb": "content/taichi/thumbs/"},
    "strings": {
      "zh": {"appTitle": "云手", "appSub": "太极八式 · 一式一式学到位", "fullTitle": "太极八式 · 全套",
             "fullSub": "从起势到揽雀尾，连贯跟练约 8 分钟", "allDoneK": "八式都学完了",
             "about": "云手（Cloud Hands）· 视频：你的数字形象，红色太极服与旗袍两套，每式 10 秒、多角度；全套约 7 分 53 秒。部分角度仍在制作中。"},
      "en": {"appTitle": "Cloud Hands", "appSub": "Eight Tai Chi moves, one at a time", "fullTitle": "The complete set",
             "fullSub": "From Commencing to Grasp the Bird’s Tail — about 8 minutes", "allDoneK": "You’ve studied all eight",
             "about": "Cloud Hands (云手). Footage: your own avatar in a red Tai Chi uniform and a qipao — 10 s per move from several angles, full set 7:53. Some angles are still in production."}
    }
  },
  "fullRoutine": {
    "red": {"file": "taichi-red-uniform/full-set-red-uniform", "chapters": chapters, "duration": 473},
    "qipao": {"file": "taichi-qipao/full-set-qipao", "chapters": chapters, "duration": 473}
  },
  "moves": moves,
  "outfits": [
    {"id": "red", "avatar": "content/avatars/taichi_red.png", "dir": "taichi-red-uniform", "thumb": "red", "timed": True, "multiAngle": True,
     "zh": "红色太极服", "en": "Red Tai Chi uniform", "noteZh": "传统练功服 · 多角度", "noteEn": "Traditional uniform · several angles"},
    {"id": "qipao", "avatar": "content/avatars/taichi_qipao.png", "dir": "taichi-qipao", "thumb": "qipao", "timed": True, "multiAngle": True,
     "zh": "旗袍", "en": "Qipao", "noteZh": "深红旗袍 · 多角度", "noteEn": "Deep-red cheongsam · several angles"}
  ],
  "backgrounds": BDJ["backgrounds"],
  "music": BDJ["music"],
}
out = os.path.join(WEB, "content", "taichi.json")
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
with open(os.path.join(WEB, "data-taichi.js"), "w", encoding="utf-8") as f:
    f.write("/* GENERATED by web/tools/taichi_content.py. Do not edit by hand. */\nwindow.BDJ = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")
print("wrote", out, "and data-taichi.js")
