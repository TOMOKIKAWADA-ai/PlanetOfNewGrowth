"""ivory_dragonfly（白骨の昆虫型・スナイパー）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ 1、Z が上、-Y が前）。
細い手足と背中の羽なので、ボーンを線分として置き、近いボーンほど強く効くウェイトにする。
attack は狙撃の構え: 右腕を前に突き出し、羽を開いて上体を反らす。

使い方:
  blender -b --factory-startup -P scripts/blender/build_ivory_dragonfly_animations.py -- \
    assets/enemies/ivory_dragonfly_rtp.glb assets/enemies/ivory_dragonfly_anim.glb
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
    ('L_Thigh', (0.055, 0.0, 0.46), (0.055, 0.0, 0.25), 'Hips'),
    ('L_Shin', (0.055, 0.0, 0.25), (0.06, 0.02, 0.02), 'L_Thigh'),
    ('L_UpperArm', (0.1, 0.0, 0.73), (0.11, 0.0, 0.58), 'Spine'),
    ('L_Forearm', (0.11, 0.0, 0.58), (0.115, -0.01, 0.42), 'L_UpperArm'),
    ('L_Wing', (0.05, 0.07, 0.68), (0.17, 0.12, 0.48), 'Spine'),
    ('L_WingTip', (0.17, 0.12, 0.48), (0.25, 0.17, 0.27), 'L_Wing'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.08), None),
    ('Hips', (0, 0, 0.46), (0, 0, 0.58), 'Root'),
    ('Spine', (0, 0, 0.58), (0, 0, 0.76), 'Hips'),
    ('Head', (0, 0, 0.76), (0, -0.02, 1.0), 'Spine'),
    *LEFT,
    *RIGHT,
]
W = lib.distance_weights(mesh, V, bone_specs, exclude=('Root',))
arm = lib.rig_mesh(mesh, bone_specs, W)
ANIMATED = [name for name, *_rest in bone_specs if name != 'Root']
animator = lib.Animator(arm, ANIMATED)


def both(pose):
    """L_ の指定を左右対称に写す（腕・羽を同じように動かすとき）。"""
    out = dict(pose)
    for name, value in pose.items():
        if name.startswith('L_'):
            out.update(lib.mirror({name: value}))
    return out


NEUTRAL = {}

# --- 待機: 羽を小さく震わせ、首をかしげる (2.0s ループ) ---
IDLE_A = both({'L_Wing': {'Y': 3}, 'L_UpperArm': {'Y': 2}}) | {'Head': {'Y': 4}, 'Spine': {'X': 1}}
IDLE_B = both({'L_Wing': {'Y': -4}, 'L_WingTip': {'Y': -3}}) | {'Head': {'Y': -3, 'X': 3}, 'Spine': {'X': -1}}
animator.build('idle', [(0, IDLE_A), (15, IDLE_B), (30, IDLE_A), (45, IDLE_B), (60, IDLE_A)])

# --- 歩き: 背筋を伸ばしたまま細い脚で歩く (1.0s で 2 歩ループ) ---
WALK_CONTACT = {
    'Hips': {'Z': 5, 'loc': (0, 0, -0.01)},
    'Spine': {'Z': -4},
    'L_Thigh': {'X': -24}, 'L_Shin': {'X': 6},
    'R_Thigh': {'X': 18}, 'R_Shin': {'X': 20},
    'L_UpperArm': {'X': 10}, 'R_UpperArm': {'X': -10},
    'L_Wing': {'Y': 4}, 'R_Wing': {'Y': -4},
}
WALK_PASS = {
    'Hips': {'loc': (0, 0, 0.012)},
    'L_Thigh': {'X': 0}, 'L_Shin': {'X': 6},
    'R_Thigh': {'X': -14}, 'R_Shin': {'X': 45},
    **both({'L_Wing': {'Y': -3}}),
}
animator.build('walk', [
    (0, WALK_CONTACT), (8, WALK_PASS), (15, lib.mirror(WALK_CONTACT)), (23, lib.mirror(WALK_PASS)), (30, WALK_CONTACT),
])

# --- 攻撃（狙撃）: 羽を開き、右腕をまっすぐ前へ突き出して撃つ (0.8s) ---
AIM = {
    'Spine': {'X': -6, 'Z': 10}, 'Head': {'X': 4, 'Z': -6},
    'R_UpperArm': {'X': -80, 'Y': 8}, 'R_Forearm': {'X': -8},
    'L_UpperArm': {'X': 10, 'Y': 10},
    **both({'L_Wing': {'Y': -22, 'X': -10}, 'L_WingTip': {'Y': -10}}),
}
FIRE = {
    **AIM,
    'Spine': {'X': -12, 'Z': 10}, 'Head': {'X': -4, 'Z': -6},
    'R_UpperArm': {'X': -95, 'Y': 8}, 'R_Forearm': {'X': 0},
    'Hips': {'loc': (0, 0.03, 0)},
}
animator.build('attack', [(0, NEUTRAL), (6, AIM), (12, AIM), (14, FIRE), (18, FIRE), (24, NEUTRAL)])

# --- 被弾: 羽をすくめて上体がはねる (0.37s) ---
HIT = {
    'Spine': {'X': -14, 'Y': 6}, 'Head': {'X': -16, 'Y': 10},
    **both({'L_Wing': {'Y': 12}, 'L_UpperArm': {'X': 18, 'Y': 6}}),
    'Hips': {'loc': (0, 0.03, -0.01)},
}
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞる → 膝から崩れる → 横向きに倒れる (1.3s, 最後で止める) ---
DIE_RECOIL = {'Spine': {'X': -18}, 'Head': {'X': -24}, **both({'L_Wing': {'Y': -18}})}
DIE_BUCKLE = {
    'Hips': {'loc': (0, 0.02, -0.16)},
    'Spine': {'X': 20}, 'Head': {'X': 22, 'Y': 12},
    **both({'L_Thigh': {'X': -50}, 'L_Shin': {'X': 90}, 'L_Wing': {'Y': 10}, 'L_UpperArm': {'X': -8}}),
}
DIE_DOWN = {
    'Hips': {'Y': 84, 'loc': (0.12, 0.02, -0.4)},
    'Spine': {'X': 8}, 'Head': {'Y': 12},
    'L_Thigh': {'X': -30}, 'L_Shin': {'X': 40}, 'R_Thigh': {'X': -10}, 'R_Shin': {'X': 20},
    **both({'L_Wing': {'Y': 18}, 'L_WingTip': {'Y': 10}}),
}
DIE_SETTLE = {**DIE_DOWN, 'Hips': {'Y': 80, 'loc': (0.12, 0.02, -0.38)}}
animator.build('die', [(0, NEUTRAL), (5, DIE_RECOIL), (15, DIE_BUCKLE), (28, DIE_DOWN), (32, DIE_SETTLE), (39, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
