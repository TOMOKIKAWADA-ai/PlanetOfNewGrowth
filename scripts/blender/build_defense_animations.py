"""defense_001（ガーディアン）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

ツタに根を張った女性像なので、根元（Root）は動かさず、高さで Body / Chest / Head に
ウェイトを分ける。腕は胸と一緒に動くように Chest に寄せる。

使い方:
  blender -b --factory-startup -P scripts/blender/build_defense_animations.py -- \
    assets/enemies/defense_001.glb assets/enemies/defense_001_anim.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import enemy_anim_lib as lib  # noqa: E402

BODY_Z, CHEST_Z, HEAD_Z = 0.16, 0.5, 0.71
# 腕の範囲（x, y の箱）。高さ 0.2〜0.66 の間だけ使う
ARM_BOXES = [((-0.115, -0.03), (-0.21, 0.0)), ((0.17, 0.27), (-0.16, 0.04))]

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()
V = lib.mesh_vertices(mesh)
torso = V[(V[:, 2] > 0.5) & (V[:, 2] < 0.62)]
cx, cy = np.median(torso[:, 0]), np.median(torso[:, 1])

bone_specs = [
    ('Root', (cx, cy, 0.0), (cx, cy, 0.12), None),
    ('Body', (cx, cy, BODY_Z), (cx, cy, CHEST_Z), 'Root'),
    ('Chest', (cx, cy, CHEST_Z), (cx, cy, HEAD_Z), 'Body'),
    ('Head', (cx, cy, HEAD_Z), (cx, cy, 0.95), 'Chest'),
]

z = V[:, 2]
# 胴から離れたツタは根元と一緒に地面に残す（腰より上はすべて体に付ける）
axis_distance = np.hypot(V[:, 0] - cx, V[:, 1] - cy)
near_body = np.maximum(1 - lib.smoothstep(0.2, 0.28, axis_distance), lib.smoothstep(0.45, 0.55, z))
grown = lib.smoothstep(0.1, 0.22, z) * near_body
chest = lib.smoothstep(CHEST_Z - 0.05, CHEST_Z + 0.05, z)
head = lib.smoothstep(HEAD_Z - 0.03, HEAD_Z + 0.03, z)
arm_mask = np.zeros(len(V))
for (x0, x1), (y0, y1) in ARM_BOXES:
    inside = (V[:, 0] > x0) & (V[:, 0] < x1) & (V[:, 1] > y0) & (V[:, 1] < y1) & (z > 0.2) & (z < 0.66)
    arm_mask = np.maximum(arm_mask, inside.astype(float))
chest = np.maximum(chest, arm_mask)
grown = np.maximum(grown, arm_mask)
W = np.stack([
    1 - grown,
    grown * (1 - chest),
    grown * chest * (1 - head),
    grown * chest * head,
], axis=1)
# 小さな破片は 1 つの塊として動かし、引き伸ばしを防ぐ
for piece in lib.mesh_islands(mesh):
    if np.ptp(V[piece], axis=0).max() < 0.1:
        W[piece] = W[piece].mean(axis=0)
arm = lib.rig_mesh(mesh, bone_specs, W)
animator = lib.Animator(arm, ['Body', 'Chest', 'Head'])

NEUTRAL = {}

# --- 待機: ゆっくり揺れて首をかしげる (3.0s ループ) ---
IDLE_A = {'Body': {'Y': 1.5}, 'Chest': {'X': 2}, 'Head': {'Y': 5}}
IDLE_B = {'Body': {'Y': -1.5, 'X': 1}, 'Chest': {'X': -1}, 'Head': {'Y': -3, 'X': 3}}
animator.build('idle', [(0, IDLE_A), (45, IDLE_B), (90, IDLE_A)])

# --- 移動: 根を引きずって左右に揺れながら進む (1.0s ループ) ---
WALK_L = {'Body': {'X': 5, 'Y': 5}, 'Chest': {'Y': -3, 'Z': 4}, 'Head': {'Y': -3}}
WALK_MID = {'Body': {'X': 7}, 'Chest': {'X': 2}, 'Head': {'X': -3}}
animator.build('walk', [(0, WALK_L), (8, WALK_MID), (15, lib.mirror(WALK_L)), (23, WALK_MID), (30, WALK_L)])

# --- 攻撃: のけぞって溜め、上体を叩きつける (0.8s) ---
WINDUP = {'Body': {'X': -8}, 'Chest': {'X': -14, 'Z': 8}, 'Head': {'X': -12}}
STRIKE = {'Body': {'X': 16}, 'Chest': {'X': 24, 'Z': -6}, 'Head': {'X': 12}}
animator.build('attack', [(0, NEUTRAL), (8, WINDUP), (10, WINDUP), (13, STRIKE), (17, STRIKE), (24, NEUTRAL)])

# --- 被弾: 後ろにしなる (0.37s) ---
HIT = {'Body': {'X': -7, 'Y': 3}, 'Chest': {'X': -12}, 'Head': {'X': -15, 'Y': 8}}
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞる → 崩れる → 前に倒れる (1.3s, 最後で止める) ---
DIE_RECOIL = {'Body': {'X': -8}, 'Chest': {'X': -16}, 'Head': {'X': -20}}
DIE_SLUMP = {'Body': {'X': 12, 'Y': -5}, 'Chest': {'X': 35}, 'Head': {'X': 30, 'Y': 10}}
DIE_DOWN = {'Body': {'X': 82, 'Y': -6, 'Z': 8}, 'Chest': {'X': 6}, 'Head': {'X': -12, 'Y': 20}}
DIE_BOUNCE = {'Body': {'X': 75, 'Y': -6, 'Z': 8}, 'Chest': {'X': 10}, 'Head': {'X': -6, 'Y': 20}}
animator.build('die', [(0, NEUTRAL), (5, DIE_RECOIL), (16, DIE_SLUMP), (29, DIE_DOWN), (33, DIE_BOUNCE), (39, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
