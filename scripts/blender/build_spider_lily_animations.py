"""spider_lily（浮遊する彼岸花・第4章のボス「群れの母」の1体）に骨を入れ、
idle / walk / attack / hit / die / revive を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ 1、Z が上、-Y が前）。上に花、下に長い触手。
Tripo が色を読めず灰色にした所を塗り直す: 花の高さ（z > 0.62）は赤、触手は骨の白。
ゲームでは宙に浮かせ、3体を光の糸でつなぐ。attack は衝撃波を出すときに花を大きく開く。
die で花を閉じて沈み、復活するときは revive（die の逆再生）で起き上がる。

使い方:
  blender -b --factory-startup -P scripts/blender/build_spider_lily_animations.py -- \
    assets/mother/spider_lily_rtp.glb assets/mother/spider_lily_anim.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()

PETAL_RED = (0.78, 0.2, 0.24)
BONE_WHITE = (0.82, 0.78, 0.71)
colors, centers = lib.face_colors(mesh)
targets = {i: PETAL_RED if centers[i][2] > 0.62 else BONE_WHITE for i in range(len(colors))}
lib.repaint_faces(mesh, targets)
V = lib.mesh_vertices(mesh)

LEFT = [
    ('L_Petal', (0.05, 0, 0.8), (0.24, 0, 0.82), 'Head'),
    ('L_Tent1', (0.03, 0, 0.6), (0.04, 0, 0.4), 'Body'),
    ('L_Tent2', (0.04, 0, 0.4), (0.05, 0, 0.2), 'L_Tent1'),
    ('L_Tent3', (0.05, 0, 0.2), (0.05, 0, 0.0), 'L_Tent2'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.08), None),
    ('Body', (0, 0, 0.6), (0, 0, 0.78), 'Root'),
    ('Head', (0, 0, 0.78), (0, 0, 0.95), 'Body'),
    ('F_Petal', (0, -0.05, 0.8), (0, -0.24, 0.82), 'Head'),
    ('B_Petal', (0, 0.05, 0.8), (0, 0.24, 0.82), 'Head'),
    *LEFT,
    *RIGHT,
]
W = lib.distance_weights(mesh, V, bone_specs, exclude=('Root',))
arm = lib.rig_mesh(mesh, bone_specs, W)
ANIMATED = [name for name, *_rest in bone_specs if name != 'Root']
animator = lib.Animator(arm, ANIMATED)


def both(pose):
    out = dict(pose)
    for name, value in pose.items():
        if name.startswith('L_'):
            out.update(lib.mirror({name: value}))
    return out


def merge(*poses):
    out = {}
    for pose in poses:
        for name, value in pose.items():
            out[name] = {**out.get(name, {}), **value}
    return out


def petals(amount):
    """花びらを開く (+) / 閉じる (-)。外向きの骨の先を下げると開く。"""
    return merge(both({'L_Petal': {'Y': amount}}), {'F_Petal': {'X': amount}, 'B_Petal': {'X': -amount}})


def sway(side, depth=1.0):
    """触手を左右にうねらせる。side=+1 で根元が +X、先が -X へ（S 字）。"""
    return {
        f'{s}_Tent{k}': {'Y': angle * side * depth}
        for s in ('L', 'R') for k, angle in ((1, 8), (2, -12), (3, 14))
    }


NEUTRAL = {}

# --- 待機: 花がゆっくり呼吸し、触手が S 字にうねる (2.4s ループ) ---
IDLE_A = merge(petals(5), sway(1), {'Head': {'Y': 3}})
IDLE_B = merge(petals(-4), sway(-1), {'Head': {'Y': -3}, 'Body': {'X': 2}})
animator.build('idle', [(0, IDLE_A), (36, IDLE_B), (72, IDLE_A)])

# --- 移動: 前へ傾き、触手を後ろへなびかせる (1.2s ループ) ---
LEAN = {'Body': {'X': 10}, 'L_Tent1': {'X': -12}, 'R_Tent1': {'X': -12}}
animator.build('walk', [(0, merge(IDLE_A, sway(1, 1.4), LEAN)), (18, merge(IDLE_B, sway(-1, 1.4), LEAN)), (36, merge(IDLE_A, sway(1, 1.4), LEAN))])

# --- 攻撃（衝撃波）: 花を閉じて溜める → 一気に大きく開く → 戻る (1.2s) ---
CHARGE = merge(petals(-18), {'Head': {'loc': (0, 0, -0.03)}, 'Body': {'loc': (0, 0, -0.02)}}, sway(1, 0.4))
BLOOM = merge(petals(32), {'Head': {'loc': (0, 0, 0.03)}, 'Body': {'loc': (0, 0, 0.02)}},
              both({'L_Tent1': {'Y': -14}, 'L_Tent2': {'Y': -10}}))
animator.build('attack', [(0, NEUTRAL), (12, CHARGE), (18, CHARGE), (22, BLOOM), (28, BLOOM), (36, NEUTRAL)])

# --- 被弾: 花がすくみ、全体が揺れる (0.37s) ---
HIT = merge(petals(-10), {'Body': {'X': -8, 'Y': 6}, 'Head': {'X': -8}}, sway(-1, 0.6))
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡（倒れて復活を待つ）: 花が閉じてうなだれ、触手がしなびて縮む (1.4s, 最後で止める) ---
WILT = merge(petals(-26), {'Head': {'X': 30, 'loc': (0, 0, -0.04)}, 'Body': {'X': 12}},
             both({'L_Tent1': {'Y': 10}, 'L_Tent2': {'Y': 18}, 'L_Tent3': {'Y': 22}}))
DOWN = merge(petals(-34), {'Head': {'X': 55, 'loc': (0, 0, -0.08)}, 'Body': {'X': 25, 'loc': (0, 0, -0.06)}},
             both({'L_Tent1': {'Y': 16}, 'L_Tent2': {'Y': 30}, 'L_Tent3': {'Y': 35}}))
animator.build('die', [(0, NEUTRAL), (4, HIT), (18, WILT), (36, DOWN), (42, DOWN)])
# --- 復活: die を逆にたどって起き上がり、最後に花を開く (1.0s) ---
animator.build('revive', [(0, DOWN), (10, WILT), (22, merge(petals(20), {'Head': {'X': -6}})), (30, NEUTRAL)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die', 'revive'])
lib.export_glb(arm, DST, image_format='JPEG')
print('triangles', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
