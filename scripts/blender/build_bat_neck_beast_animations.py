"""bat_neck_beast（黒衣の長首翼獣・第2章のボス「追い手」）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ 1、Z が上、-Y が前）。前脚で這い、長い首が前へ垂れ、
後ろ半分は黒い布をかぶっている。頭の左右のひげは Tripo が色を読めず灰色の板になったので消す。
attack は産卵: 立ち止まって首と翼を持ち上げ、胸を開く（ゲームではこの間だけ弱点が開く）。2.6 秒。

使い方:
  blender -b --factory-startup -P scripts/blender/build_bat_neck_beast_animations.py -- \
    assets/mother/bat_neck_beast_rtp.glb assets/mother/bat_neck_beast_anim.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()

# --- ひげ（灰色の板）を消す: 面の 7 割以上が「色を読めなかった灰色」の島 ---
colors, _centers = lib.face_colors(mesh)
gray = lib.is_unread_gray(colors)
islands = lib.face_islands(mesh)
drop = [i for i, k in enumerate(islands) if gray[islands == k].mean() > 0.7]
print('whisker faces removed', len(drop), 'of', len(islands))
lib.delete_faces(mesh, drop)
V = lib.mesh_vertices(mesh)

LEFT = [
    ('L_Arm', (0.14, -0.02, 0.55), (0.19, -0.03, 0.25), 'Chest'),
    ('L_Hand', (0.19, -0.03, 0.25), (0.21, -0.05, 0.02), 'L_Arm'),
    ('L_Wing', (0.06, 0.02, 0.7), (0.17, 0.12, 0.85), 'Chest'),
    ('L_WingTip', (0.17, 0.12, 0.85), (0.3, 0.25, 1.0), 'L_Wing'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.08), None),
    ('Hips', (0, 0.25, 0.35), (0, 0.05, 0.6), 'Root'),
    ('Chest', (0, 0.05, 0.6), (0, -0.12, 0.62), 'Hips'),
    ('Neck1', (0, -0.12, 0.62), (0, -0.25, 0.5), 'Chest'),
    ('Neck2', (0, -0.25, 0.5), (0, -0.32, 0.35), 'Neck1'),
    ('Head', (0, -0.32, 0.35), (0, -0.33, 0.12), 'Neck2'),
    ('Cloak', (0, 0.2, 0.4), (0, 0.38, 0.04), 'Hips'),
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


NEUTRAL = {}

# --- 待機: 肩で息をし、首がゆっくり揺れ、翼が震える (2.0s ループ) ---
IDLE_A = merge(both({'L_Wing': {'Y': -4}}), {'Chest': {'X': 2}, 'Neck1': {'Z': 6}, 'Head': {'Z': -4}})
IDLE_B = merge(both({'L_Wing': {'Y': 5}, 'L_WingTip': {'Y': 4}}), {
    'Chest': {'X': -2}, 'Neck1': {'Z': -6, 'X': 4}, 'Head': {'Z': 5}, 'Hips': {'loc': (0, 0, 0.01)},
})
animator.build('idle', [(0, IDLE_A), (30, IDLE_B), (60, IDLE_A)])

# --- 移動: 前脚を交互に出して這う。首は振り子、布が後ろへなびく (1.2s で 2 歩ループ) ---
CRAWL = {
    'Hips': {'Z': 5, 'loc': (0, 0, -0.015)}, 'Chest': {'Z': -6, 'X': 3},
    'Neck1': {'Z': 8}, 'Neck2': {'Z': 4}, 'Head': {'Z': -6},
    'L_Arm': {'X': -28}, 'L_Hand': {'X': 16}, 'R_Arm': {'X': 18}, 'R_Hand': {'X': -6},
    'Cloak': {'X': -6, 'Z': 4}, 'L_Wing': {'Y': 6}, 'R_Wing': {'Y': -4},
}
PASS = {
    'Hips': {'loc': (0, 0, 0.02)}, 'Chest': {'X': -2},
    'L_Arm': {'X': -4}, 'L_Hand': {'X': 30}, 'R_Arm': {'X': -6}, 'R_Hand': {'X': 4},
    'Cloak': {'X': -10}, **both({'L_Wing': {'Y': -3}}),
}
animator.build('walk', [(0, CRAWL), (9, PASS), (18, lib.mirror(CRAWL)), (27, lib.mirror(PASS)), (36, CRAWL)])

# --- 攻撃（産卵）: 首を持ち上げ、翼を横に広げて胸を開く → そのまま脈打つ → 戻る (2.6s) ---
REAR = merge(both({'L_Wing': {'Y': 28, 'X': 8}, 'L_WingTip': {'Y': 12}, 'L_Arm': {'X': 12, 'Y': -8}}), {
    'Hips': {'X': 8, 'loc': (0, 0.02, -0.03)}, 'Chest': {'X': -26}, 'Neck1': {'X': -30}, 'Neck2': {'X': -18}, 'Head': {'X': -10},
    'Cloak': {'X': 8},
})
PULSE = merge(REAR, both({'L_Wing': {'Y': 36, 'X': 10}}), {'Chest': {'X': -30}, 'Neck1': {'X': -34}, 'Hips': {'loc': (0, 0.02, -0.05)}})
animator.build('attack', [(0, NEUTRAL), (10, REAR), (24, PULSE), (38, REAR), (52, PULSE), (66, REAR), (78, NEUTRAL)])

# --- 被弾: 首がのけぞり、翼がすくむ (0.37s) ---
HIT = merge(both({'L_Wing': {'Y': 14}, 'L_Arm': {'X': 10}}), {'Chest': {'X': -10, 'Y': 6}, 'Neck1': {'X': -18}, 'Head': {'X': -12}})
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞる → 前脚が崩れる → 首から地面に伏せ、翼が垂れる (1.6s, 最後で止める) ---
DIE_RECOIL = merge(both({'L_Wing': {'Y': -20}}), {'Chest': {'X': -18}, 'Neck1': {'X': -22}, 'Head': {'X': -14}})
DIE_FALL = merge(both({'L_Arm': {'X': -30, 'Y': -25}, 'L_Hand': {'X': 40}, 'L_Wing': {'Y': 25, 'X': -10}}), {
    'Hips': {'loc': (0, 0, -0.1)}, 'Chest': {'X': 8, 'loc': (0, 0, -0.04)}, 'Neck1': {'X': 12}, 'Neck2': {'X': 8},
})
DIE_DOWN = merge(both({'L_Arm': {'X': -50, 'Y': -45}, 'L_Hand': {'X': 50}, 'L_Wing': {'Y': 55, 'X': -20}, 'L_WingTip': {'Y': 30}}), {
    'Hips': {'Y': 12, 'loc': (0, 0, -0.18)}, 'Chest': {'X': 8, 'loc': (0, 0, -0.06)}, 'Neck1': {'X': 12, 'Z': 12}, 'Neck2': {'X': 10},
    'Head': {'X': 10, 'Y': 20}, 'Cloak': {'X': 10},
})
DIE_SETTLE = merge(DIE_DOWN, {'Hips': {'Y': 10, 'loc': (0, 0, -0.17)}})
animator.build('die', [(0, NEUTRAL), (6, DIE_RECOIL), (20, DIE_FALL), (36, DIE_DOWN), (42, DIE_SETTLE), (48, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST, image_format='JPEG')
print('triangles', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
