"""jellyfish_stalk（茎の生えた赤いクラゲ・第3章のボス「水門の母」）に骨を入れ、
idle / attack / hit / surface / stun / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ 1、Z が上、-Y が前）。上に赤い傘、下に白い触手、
黒い茎が地面の根につながる。三面図の細い垂れ糸は消してから Tripo に渡した（残った灰色の糸もここで消す）。
ゲームではふだん水に沈めて傘だけ出し（idle で傘が脈打つ）、attack でオタマジャクシを吐く。
魚形態で噛まれると hit、浮き上がると surface → stun（気絶。ループ）。根は地面に固定して動かさない。

使い方:
  blender -b --factory-startup -P scripts/blender/build_jellyfish_stalk_animations.py -- \
    assets/mother/jellyfish_stalk_rtp.glb assets/mother/jellyfish_stalk_anim.glb
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()

# --- 残った垂れ糸（灰色ばかりの細い島）を消す ---
colors, _centers = lib.face_colors(mesh)
gray = lib.is_unread_gray(colors)
islands = lib.face_islands(mesh)
drop = [i for i, k in enumerate(islands) if gray[islands == k].mean() > 0.7]
print('gray string faces removed', len(drop), 'of', len(islands))
if drop:
    lib.delete_faces(mesh, drop)
V = lib.mesh_vertices(mesh)

LEFT = [
    ('L_Rim', (0.03, 0, 0.88), (0.2, 0, 0.84), 'Bell'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.05), None),
    ('Trunk1', (0, 0.03, 0.06), (0.05, 0.05, 0.3), 'Root'),
    ('Trunk2', (0.05, 0.05, 0.3), (0.05, 0.03, 0.52), 'Trunk1'),
    ('Trunk3', (0.05, 0.03, 0.52), (0.01, 0, 0.76), 'Trunk2'),
    ('Bell', (0, 0, 0.76), (0, 0, 1.0), 'Trunk3'),
    ('F_Rim', (0, -0.03, 0.88), (0, -0.2, 0.84), 'Bell'),
    ('B_Rim', (0, 0.03, 0.88), (0, 0.2, 0.84), 'Bell'),
    *LEFT,
    *RIGHT,
]
W = lib.distance_weights(mesh, V, bone_specs, exclude=('Root',))
# 根（地面近く）は Root に付けて動かさない。z 0.08〜0.16 で茎へなめらかにつなぐ
root = [name for name, *_rest in bone_specs].index('Root')
anchor = 1 - lib.smoothstep(0.08, 0.16, V[:, 2])
W *= (1 - anchor)[:, None]
W[:, root] += anchor
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


def rim(amount):
    """傘のふちを縮める (+、先が下・内へ) / 広げる (-)。"""
    return merge(both({'L_Rim': {'Y': amount}}), {'F_Rim': {'X': amount}, 'B_Rim': {'X': -amount}})


NEUTRAL = {}

# --- 待機（沈んでいる）: 傘が脈打ち、茎がゆっくり揺れる (2.0s ループ) ---
IDLE_A = merge(rim(10), {'Bell': {'loc': (0, 0, -0.012)}, 'Trunk2': {'Y': 3}, 'Trunk3': {'Y': -4}})
IDLE_B = merge(rim(-7), {'Bell': {'loc': (0, 0, 0.012)}, 'Trunk2': {'Y': -3}, 'Trunk3': {'Y': 4, 'X': 2}})
animator.build('idle', [(0, IDLE_A), (30, IDLE_B), (60, IDLE_A)])

# --- 攻撃（オタマジャクシを吐く）: 傘をぎゅっと縮めて溜め → 一気に開いて押し出す → 戻る (1.2s) ---
SQUEEZE = merge(rim(28), {'Bell': {'X': -6, 'loc': (0, 0, -0.03)}, 'Trunk3': {'X': -6}})
PUSH = merge(rim(-22), {'Bell': {'X': 10, 'loc': (0, 0, 0.03)}, 'Trunk3': {'X': 8}, 'Trunk2': {'X': 4}})
animator.build('attack', [(0, NEUTRAL), (12, SQUEEZE), (16, SQUEEZE), (21, PUSH), (28, PUSH), (36, NEUTRAL)])

# --- 被弾（魚に噛まれる）: 茎がびくっと曲がり、傘がすくむ (0.4s) ---
HIT = merge(rim(18), {'Trunk2': {'X': -8, 'Y': 6}, 'Trunk3': {'X': -12}, 'Bell': {'Y': 8}})
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (12, NEUTRAL)])

# --- 浮上: 水から引きずり出されてのけぞり、ふちを大きく広げる → 気絶の姿へ (0.8s) ---
DAZED = merge(rim(-14), {'Trunk2': {'X': 6}, 'Trunk3': {'X': 16, 'Y': 6}, 'Bell': {'X': 16, 'Y': -6}})
JOLT = merge(rim(-28), {'Trunk2': {'X': -10}, 'Trunk3': {'X': -16}, 'Bell': {'X': -14}})
animator.build('surface', [(0, NEUTRAL), (6, JOLT), (12, JOLT), (24, DAZED)])

# --- 気絶（ループ）: 傘を垂らしたまま、ふらふらと円を描くように揺れる (1.6s) ---
DAZED_L = merge(DAZED, {'Trunk3': {'X': 14, 'Y': 12}, 'Bell': {'X': 18, 'Y': -10}})
DAZED_R = merge(DAZED, {'Trunk3': {'X': 18, 'Y': -4}, 'Bell': {'X': 12, 'Y': 8}}, rim(-8))
animator.build('stun', [(0, DAZED), (12, DAZED_L), (24, DAZED), (36, DAZED_R), (48, DAZED)])

# --- 死亡: 傘がしぼんで前へ折れ、茎ごと崩れる (1.6s, 最後で止める) ---
WILT = merge(rim(24), {'Trunk2': {'X': 14}, 'Trunk3': {'X': 26}, 'Bell': {'X': 24, 'loc': (0, 0, -0.03)}})
DOWN = merge(rim(34), {'Trunk1': {'X': 10}, 'Trunk2': {'X': 30, 'Y': 8}, 'Trunk3': {'X': 44}, 'Bell': {'X': 36, 'loc': (0, 0, -0.06)}})
animator.build('die', [(0, NEUTRAL), (5, HIT), (22, WILT), (42, DOWN), (48, DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'attack', 'hit', 'surface', 'stun', 'die'])
lib.export_glb(arm, DST, image_format='JPEG')
print('triangles', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
