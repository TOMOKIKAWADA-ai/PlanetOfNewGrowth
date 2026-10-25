"""Spawning_001（産卵型のクモ）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

元のメッシュは骨がなく、細かい破片に分かれているので、頂点の位置からウェイトを決める:
  - 足元の巣（卵）  : Root（動かない）
  - 胴体と口元      : Body
  - 外側に伸びた脚  : 方位ごとに 8 本へ分け、膝より上を Upper、下を Lower
attack は産卵の動き（胴体を巣に下ろす）。

使い方:
  blender -b --factory-startup -P scripts/blender/build_spawning_animations.py -- \
    assets/enemies/Spawning_001.glb assets/enemies/Spawning_001_anim.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import enemy_anim_lib as lib  # noqa: E402

LEG_COUNT = 8
BODY_Z = 0.62

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()
V = lib.mesh_vertices(mesh)

center = V[V[:, 2] > 0.6][:, :2].mean(axis=0)
rel = V[:, :2] - center
radius = np.hypot(rel[:, 0], rel[:, 1])
azimuth = np.arctan2(rel[:, 1], rel[:, 0])
egg_zone = (V[:, 2] < 0.04) | ((V[:, 2] < 0.24) & (radius < 0.32))

# 脚の方位: 卵の範囲より外側の頂点の方位を k-means（円周上）で 8 つに分ける
outer = ~egg_zone & (radius > 0.26) & (V[:, 2] > 0.1) & (V[:, 2] < 0.6)
angles = azimuth[outer]
centers = np.linspace(-math.pi, math.pi, LEG_COUNT, endpoint=False) + math.pi / LEG_COUNT
for _ in range(30):
    diff = np.angle(np.exp(1j * (angles[:, None] - centers[None, :])))
    label = np.argmin(np.abs(diff), axis=1)
    for k in range(LEG_COUNT):
        if np.any(label == k):
            centers[k] = np.angle(np.exp(1j * angles[label == k]).mean())
order = np.argsort(centers)
centers = centers[order]

legs = []
outer_points = V[outer]
diff = np.angle(np.exp(1j * (angles[:, None] - centers[None, :])))
label = np.argmin(np.abs(diff), axis=1)
for k in range(LEG_COUNT):
    pts = outer_points[label == k]
    r = np.hypot(pts[:, 0] - center[0], pts[:, 1] - center[1])
    far = pts[r >= np.percentile(r, 75)]
    knee = far[far[:, 2] >= np.percentile(far[:, 2], 60)].mean(axis=0)
    tip = pts[pts[:, 2] <= np.percentile(pts[:, 2], 6)].mean(axis=0)
    direction = np.array([math.cos(centers[k]), math.sin(centers[k])])
    attach = np.array([*(center + direction * 0.16), BODY_Z])
    legs.append({'az': centers[k], 'dir': direction, 'attach': attach, 'knee': knee, 'tip': tip})
    print('LEG', k, 'az=%.0f' % math.degrees(centers[k]), 'knee', knee.round(3), 'tip', tip.round(3))


def segment_distance(points, a, b):
    ab = b - a
    t = np.clip(((points - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(points - (a + t[:, None] * ab), axis=1)


# 卵の範囲でも、膝から脚先（少し下へ延長）の線に近い頂点は脚として扱う
near_leg = np.zeros(len(V), bool)
for leg in legs:
    extended_tip = leg['tip'] + (leg['tip'] - leg['knee']) * 0.35
    near_leg |= segment_distance(V, leg['knee'], extended_tip) < 0.035
nest = egg_zone & ~near_leg

bone_specs = [
    ('Root', (*center, 0.0), (*center, 0.1), None),
    ('Body', (*center, BODY_Z), (*center, 0.9), 'Root'),
]
for k, leg in enumerate(legs):
    bone_specs.append((f'Leg{k}_Upper', tuple(leg['attach']), tuple(leg['knee']), 'Body'))
    bone_specs.append((f'Leg{k}_Lower', tuple(leg['knee']), tuple(leg['tip']), f'Leg{k}_Upper'))

# ウェイト
leg_factor = lib.smoothstep(0.13, 0.2, radius)
angular = np.stack([
    np.exp(-(np.angle(np.exp(1j * (azimuth - leg['az']))) / math.radians(14)) ** 2) for leg in legs
], axis=1)
angular /= np.maximum(angular.sum(axis=1, keepdims=True), 1e-9)
W = np.zeros((len(V), len(bone_specs)))
free = 1 - nest.astype(float)
W[:, 0] = nest
W[:, 1] = free * (1 - leg_factor)
for k, leg in enumerate(legs):
    knee_r = np.hypot(*(leg['knee'][:2] - center))
    lower = lib.smoothstep(leg['knee'][2] + 0.02, leg['knee'][2] - 0.06, V[:, 2]) \
        * lib.smoothstep(knee_r - 0.1, knee_r - 0.04, radius)
    W[:, 2 + 2 * k] = free * leg_factor * angular[:, k] * (1 - lower)
    W[:, 3 + 2 * k] = free * leg_factor * angular[:, k] * lower

# メッシュは小さな破片の集まり。小さい破片は 1 つの塊として動かし、引き伸ばしを防ぐ
leg_line_distance = np.min(np.stack([
    np.minimum(segment_distance(V, leg['attach'], leg['knee']), segment_distance(V, leg['knee'], leg['tip']))
    for leg in legs
], axis=1), axis=1)
for piece in lib.mesh_islands(mesh):
    points = V[piece]
    if np.ptp(points, axis=0).max() > 0.1:
        continue
    centroid = points.mean(axis=0)
    centroid_r = np.hypot(*(centroid[:2] - center))
    in_nest = centroid[2] < 0.04 or (centroid[2] < 0.26 and centroid_r < 0.34)
    if in_nest and leg_line_distance[piece].min() > 0.03:
        W[piece] = 0
        W[piece, 0] = 1
    else:
        W[piece] = W[piece].mean(axis=0)
arm = lib.rig_mesh(mesh, bone_specs, W)

animated = ['Body'] + [name for name, *_ in bone_specs[2:]]
animator = lib.Animator(arm, animated)

Z_AXIS = (0, 0, 1)


def tangent(leg):
    """脚の外向き方向と直交する水平軸。正の回転で脚が下がる / 膝下が内側へたたまれる。"""
    return (-leg['dir'][1], leg['dir'][0], 0)


def forward_sign(leg):
    # 前は -Y。+X 側の脚は Z 負回転、-X 側は Z 正回転で前へ振れる
    return -1 if leg['dir'][0] > 0 else 1


def leg_pose(pose, k, sweep=0.0, raise_upper=0.0, tuck=0.0):
    leg = legs[k]
    t = tangent(leg)
    pose[f'Leg{k}_Upper'] = {'rot': [(Z_AXIS, forward_sign(leg) * sweep), (t, -raise_upper)]}
    pose[f'Leg{k}_Lower'] = {'rot': [(t, tuck)]}


def spider(body=None, **legs_args):
    pose = {'Body': body or {}}
    for k in range(LEG_COUNT):
        leg_pose(pose, k, **legs_args)
    return pose


NEUTRAL = spider()

# --- 待機: 呼吸しながら脚先が少しずつ動く (2.0s ループ) ---
idle_keys = []
for f in range(0, 61, 10):
    p = f / 60
    pose = {'Body': {'X': 2 * math.sin(2 * math.pi * p), 'loc': (0, 0, 0.008 * math.sin(2 * math.pi * p))}}
    for k in range(LEG_COUNT):
        phase = 2 * math.pi * (p + k / LEG_COUNT)
        leg_pose(pose, k, sweep=3 * math.sin(phase), raise_upper=2 * math.sin(phase + 1), tuck=3 * math.cos(phase))
    idle_keys.append((f, pose))
animator.build('idle', idle_keys)

# --- 移動: 隣り合う脚を交互に運ぶ (0.8s ループ) ---
walk_keys = []
for f in range(0, 25, 3):
    p = f / 24
    pose = {'Body': {'Y': 2 * math.sin(2 * math.pi * p), 'loc': (0, 0, 0.014 * math.cos(4 * math.pi * p))}}
    for k in range(LEG_COUNT):
        phase = p + (0.5 if k % 2 else 0.0)
        swing = max(0.0, -math.sin(2 * math.pi * phase))
        leg_pose(pose, k, sweep=14 * math.cos(2 * math.pi * phase), raise_upper=16 * swing, tuck=18 * swing)
    walk_keys.append((f, pose))
animator.build('walk', walk_keys)

# --- 産卵: 胴体を巣へ下ろし、腹を沈めてから戻る (0.9s) ---
LAY_DOWN = spider(body={'X': -15, 'loc': (0, 0.02, -0.13)}, raise_upper=12, tuck=-6)
LAY_PULSE = spider(body={'X': -20, 'loc': (0, 0.03, -0.11)}, raise_upper=10, tuck=-4)
animator.build('attack', [(0, NEUTRAL), (8, LAY_DOWN), (14, LAY_PULSE), (18, LAY_DOWN), (27, NEUTRAL)])

# --- 被弾: 跳ねて脚を縮める (0.37s) ---
HIT = spider(body={'X': 10, 'Y': 6, 'loc': (0, 0, 0.04)}, raise_upper=-6, tuck=22)
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: 跳ねる → 落ちる → 脚を丸めて動かなくなる (1.2s, 最後で止める) ---
DIE_JOLT = spider(body={'X': 8, 'loc': (0, 0, 0.05)}, raise_upper=15, tuck=-10)
# 脚は上に持ち上げて内側へ折りたたむ（死んだクモの丸まった脚）
DIE_FALL = spider(body={'Y': 8, 'loc': (0, 0, -0.24)}, raise_upper=45, tuck=60)
DIE_DOWN = spider(body={'Y': 14, 'X': -6, 'loc': (0, 0, -0.36)}, raise_upper=72, tuck=95)
DIE_BOUNCE = spider(body={'Y': 12, 'X': -6, 'loc': (0, 0, -0.33)}, raise_upper=68, tuck=90)
animator.build('die', [(0, NEUTRAL), (5, DIE_JOLT), (16, DIE_FALL), (26, DIE_DOWN), (30, DIE_BOUNCE), (36, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
