"""dragonfly_nymph（白と赤のヤゴ・水の敵 dragonflyLarva）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（長さ 1、Z が上、-Y が前）。前に大あごの頭、胸から6本の脚が
横へ広がり、後ろの腹は少し上へ反って先に尾毛がある。ゲームでは水辺をはい回る。
attack は下あご（仮面）を前へ突き出す捕食、die は脚を縮めて腹を上にひっくり返る。

使い方:
  blender -b --factory-startup -P scripts/blender/build_dragonfly_nymph_animations.py -- \
    assets/enemies/dragonfly_nymph_rtp.glb assets/enemies/dragonfly_nymph_anim.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()
V = lib.mesh_vertices(mesh)

LEFT = [
    ('L_FrontLeg', (0.12, -0.29, 0.19), (0.24, -0.37, 0.12), 'Body'),
    ('L_FrontFoot', (0.24, -0.37, 0.12), (0.33, -0.44, 0.02), 'L_FrontLeg'),
    ('L_MidLeg', (0.14, -0.12, 0.19), (0.29, -0.05, 0.22), 'Body'),
    ('L_MidFoot', (0.29, -0.05, 0.22), (0.43, 0.02, 0.09), 'L_MidLeg'),
    ('L_HindLeg', (0.11, 0.0, 0.18), (0.18, 0.09, 0.18), 'Body'),
    ('L_HindFoot', (0.18, 0.09, 0.18), (0.27, 0.22, 0.03), 'L_HindLeg'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.05), None),
    ('Body', (0, 0.0, 0.2), (0, -0.3, 0.22), 'Root'),
    ('Head', (0, -0.3, 0.22), (0, -0.42, 0.2), 'Body'),
    ('Jaw', (0, -0.4, 0.13), (0, -0.5, 0.03), 'Head'),
    ('Abd1', (0, 0.0, 0.2), (0, 0.2, 0.24), 'Body'),
    ('Abd2', (0, 0.2, 0.24), (0, 0.4, 0.31), 'Abd1'),
    ('Cerci', (0, 0.4, 0.31), (0, 0.5, 0.38), 'Abd2'),
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
    """ボーンごとに指定を重ねる（後ろのポーズが同じ軸を上書きする）。"""
    out = {}
    for pose in poses:
        for name, value in pose.items():
            out[name] = {**out.get(name, {}), **value}
    return out


def step(leg, swing, lift):
    """脚1本を前後に振る (swing: Z 回り、+ で先が前へ) ・持ち上げる (lift: Y、- で先が上へ)。"""
    side = 1 if leg.startswith('L_') else -1
    foot = leg.replace('Leg', 'Foot')
    return {leg: {'Z': -side * swing, 'Y': -side * lift}, foot: {'Y': -side * lift * 0.6}}


def tripod(phase):
    """6本脚の三脚歩行。phase +1 で 左前・右中・左後 が前へ出て浮き、残りが後ろへかく。"""
    a = ['L_FrontLeg', 'R_MidLeg', 'L_HindLeg']
    b = ['R_FrontLeg', 'L_MidLeg', 'R_HindLeg']
    pose = {}
    for leg in a:
        pose = merge(pose, step(leg, 14 * phase, 12 if phase > 0 else 0))
    for leg in b:
        pose = merge(pose, step(leg, -14 * phase, 12 if phase < 0 else 0))
    return pose


NEUTRAL = {}

# --- 待機: 腹をゆっくり上下させて呼吸し、尾毛が揺れる (1.6s ループ) ---
BREATHE_A = {'Abd1': {'X': -3}, 'Abd2': {'X': -5}, 'Cerci': {'X': -6}, 'Body': {'loc': (0, 0, -0.006)}}
BREATHE_B = merge({'Abd1': {'X': 3}, 'Abd2': {'X': 4}, 'Cerci': {'X': 6}, 'Head': {'Z': 4}, 'Body': {'loc': (0, 0, 0.006)}},
                  both({'L_FrontLeg': {'Z': -3}}))
animator.build('idle', [(0, BREATHE_A), (24, BREATHE_B), (48, BREATHE_A)])

# --- 移動: 三脚歩行でせかせかはう。腹が左右に揺れる (0.6s ループ) ---
WALK_A = merge(tripod(1), {'Body': {'Z': 3, 'loc': (0, 0, 0.01)}, 'Abd1': {'Z': -5}, 'Abd2': {'Z': -6}})
WALK_B = merge(tripod(-1), {'Body': {'Z': -3, 'loc': (0, 0, 0.01)}, 'Abd1': {'Z': 5}, 'Abd2': {'Z': 6}})
animator.build('walk', [(0, WALK_A), (9, WALK_B), (18, WALK_A)])

# --- 攻撃: 身を沈めて溜め、下あご（仮面）を前へ突き出して捕らえる (0.6s) ---
CROUCH = merge({
    'Body': {'X': 6, 'loc': (0, 0.03, -0.03)}, 'Head': {'X': -8}, 'Jaw': {'X': -25},
    'Abd1': {'X': -6}, 'Abd2': {'X': -8},
}, both({'L_FrontLeg': {'Z': 10}, 'L_MidLeg': {'Y': 6}}))
STRIKE = merge({
    'Body': {'X': -4, 'loc': (0, -0.06, 0.0)}, 'Head': {'X': 6}, 'Jaw': {'X': 35, 'loc': (0, -0.05, 0)},
    'Abd1': {'X': 6}, 'Abd2': {'X': 8},
}, both({'L_FrontLeg': {'Z': -12, 'Y': -12}, 'L_FrontFoot': {'Y': -10}}))
animator.build('attack', [(0, NEUTRAL), (6, CROUCH), (9, CROUCH), (12, STRIKE), (15, STRIKE), (18, NEUTRAL)])

# --- 被弾: 頭がはじかれ、脚がすくむ (0.37s) ---
HIT = merge({
    'Body': {'X': -8, 'Z': 8, 'loc': (0, 0.04, 0.02)}, 'Head': {'X': -12}, 'Jaw': {'X': -15},
    'Abd1': {'X': 8}, 'Abd2': {'X': 10}, 'Cerci': {'X': 12},
}, both({'L_FrontLeg': {'Y': -14}, 'L_MidLeg': {'Y': -10}, 'L_HindLeg': {'Y': -8}}))
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞって腹を上にひっくり返り、脚を縮めて丸まる (1.2s, 最後で止める) ---
CURL = both({
    'L_FrontLeg': {'Y': -30}, 'L_FrontFoot': {'Y': -40},
    'L_MidLeg': {'Y': -30}, 'L_MidFoot': {'Y': -45},
    'L_HindLeg': {'Y': -25}, 'L_HindFoot': {'Y': -40},
})
REAR = merge(HIT, {'Body': {'X': -18, 'Y': 30, 'loc': (0, 0.02, 0.05)}})
FLIP = merge(CURL, {'Body': {'Y': 150, 'loc': (0, 0, 0.12)}, 'Abd1': {'X': 10}, 'Abd2': {'X': 14}, 'Head': {'X': 10}})
LIE = merge(CURL, {'Body': {'Y': 175, 'loc': (0, 0, 0.14)}, 'Abd1': {'X': 14}, 'Abd2': {'X': 18}, 'Cerci': {'X': 10}, 'Jaw': {'X': 20}})
animator.build('die', [(0, NEUTRAL), (4, HIT), (12, REAR), (24, FLIP), (32, LIE), (36, LIE)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST, image_format='JPEG')
print('triangles', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
