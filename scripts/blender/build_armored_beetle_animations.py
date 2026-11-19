"""armored_beetle（甲殻獣・水没ステージの跳ねる敵 frog）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ 1、Z が上、-Y が前）。前かがみで、長い腕が地面近くまで垂れる。
attack は跳びかかり: ゲームの跳躍（0.75 秒で 3.4 上がって落ちる）に合わせ、
踏み切り → 空中で腕を振り上げる → 着地で両腕を叩きつける。

使い方:
  blender -b --factory-startup -P scripts/blender/build_armored_beetle_animations.py -- \
    assets/enemies/armored_beetle_rtp.glb assets/enemies/armored_beetle_anim.glb
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
    ('L_Thigh', (0.12, 0.06, 0.45), (0.14, -0.04, 0.27), 'Hips'),
    ('L_Shin', (0.14, -0.04, 0.27), (0.15, 0.06, 0.03), 'L_Thigh'),
    ('L_UpperArm', (0.22, -0.05, 0.72), (0.3, -0.08, 0.45), 'Chest'),
    ('L_Forearm', (0.3, -0.08, 0.45), (0.33, -0.1, 0.1), 'L_UpperArm'),
    ('L_Leaves', (0.15, 0.05, 0.78), (0.32, 0.08, 0.95), 'Chest'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.08), None),
    ('Hips', (0, 0.08, 0.45), (0, 0.0, 0.62), 'Root'),
    ('Chest', (0, 0.0, 0.62), (0, -0.15, 0.78), 'Hips'),
    ('Head', (0, -0.15, 0.78), (0, -0.39, 0.7), 'Chest'),
    ('Back', (0, 0.1, 0.75), (0, 0.18, 0.98), 'Chest'),
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

# --- 待機: 肩で息をし、葉がざわつく (3.0s ループ) ---
IDLE_A = merge(both({'L_Leaves': {'Y': -4}, 'L_UpperArm': {'Y': 3}}), {'Chest': {'X': 3}, 'Head': {'Y': 5}, 'Back': {'X': -3}})
IDLE_B = merge(both({'L_Leaves': {'Y': 5}, 'L_UpperArm': {'Y': -2}, 'L_Forearm': {'X': -6}}), {
    'Chest': {'X': -2}, 'Head': {'X': 6, 'Y': -4}, 'Back': {'X': 4}, 'Hips': {'loc': (0, 0, -0.01)},
})
animator.build('idle', [(0, IDLE_A), (45, IDLE_B), (90, IDLE_A)])

# --- 歩き: 重い体を左右に揺らしてのしのし進む (1.2s で 2 歩ループ) ---
WALK_CONTACT = {
    'Hips': {'Z': 8, 'Y': -4, 'loc': (0, 0, -0.02)},
    'Chest': {'Z': -6, 'X': 4}, 'Head': {'Y': 6},
    'L_Thigh': {'X': -26}, 'L_Shin': {'X': 4},
    'R_Thigh': {'X': 20}, 'R_Shin': {'X': 18},
    'L_UpperArm': {'X': 14}, 'R_UpperArm': {'X': -16}, 'R_Forearm': {'X': -10},
    'L_Leaves': {'Y': 5}, 'R_Leaves': {'Y': 3},
}
WALK_PASS = {
    'Hips': {'loc': (0, 0, 0.015)},
    'Chest': {'X': 6},
    'L_Thigh': {'X': 2}, 'L_Shin': {'X': 6},
    'R_Thigh': {'X': -18}, 'R_Shin': {'X': 48},
    **both({'L_Leaves': {'Y': -3}}),
}
animator.build('walk', [
    (0, WALK_CONTACT), (9, WALK_PASS), (18, lib.mirror(WALK_CONTACT)), (27, lib.mirror(WALK_PASS)), (36, WALK_CONTACT),
])

# --- 攻撃（跳びかかり）: 0.75s。踏み切り → 空中で腕を振り上げる → 両腕を叩きつけて着地 ---
CROUCH = merge(both({'L_Thigh': {'X': -35}, 'L_Shin': {'X': 60}, 'L_UpperArm': {'X': 20}}), {
    'Hips': {'loc': (0, 0.02, -0.12)}, 'Chest': {'X': 18}, 'Head': {'X': -10},
})
LAUNCH = merge(both({'L_Thigh': {'X': 18}, 'L_Shin': {'X': -4}, 'L_UpperArm': {'X': -60, 'Y': -15}, 'L_Leaves': {'Y': -15}}), {
    'Hips': {'loc': (0, 0, 0.04)}, 'Chest': {'X': -14}, 'Head': {'X': -16}, 'Back': {'X': -12},
})
AIR = merge(both({
    'L_Thigh': {'X': -40}, 'L_Shin': {'X': 70},
    'L_UpperArm': {'X': -150, 'Y': -20}, 'L_Forearm': {'X': -30}, 'L_Leaves': {'Y': -22},
}), {'Chest': {'X': -20}, 'Head': {'X': -10}, 'Back': {'X': -16}})
SLAM = merge(both({
    'L_Thigh': {'X': -30}, 'L_Shin': {'X': 50},
    'L_UpperArm': {'X': -10, 'Y': 10}, 'L_Forearm': {'X': -4}, 'L_Leaves': {'Y': 12},
}), {'Hips': {'loc': (0, -0.04, -0.1)}, 'Chest': {'X': 30}, 'Head': {'X': 14}, 'Back': {'X': 10}})
animator.build('attack', [(0, NEUTRAL), (3, CROUCH), (7, LAUNCH), (14, AIR), (19, AIR), (23, SLAM), (28, SLAM), (36, NEUTRAL)])

# --- 被弾: 上体がのけぞり、葉が逆立つ (0.37s) ---
HIT = merge(both({'L_Leaves': {'Y': -18}, 'L_UpperArm': {'X': 20, 'Y': 8}}), {
    'Chest': {'X': -16, 'Y': 6}, 'Head': {'X': -18, 'Y': 10}, 'Back': {'X': -10}, 'Hips': {'loc': (0, 0.03, -0.01)},
})
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞる → 膝が崩れる → 前のめりに倒れる (1.3s, 最後で止める) ---
DIE_RECOIL = merge(both({'L_UpperArm': {'X': 30}, 'L_Leaves': {'Y': -15}}), {'Chest': {'X': -20}, 'Head': {'X': -25}})
DIE_BUCKLE = merge(both({'L_Thigh': {'X': -50}, 'L_Shin': {'X': 85}, 'L_UpperArm': {'X': -10}}), {
    'Hips': {'loc': (0, 0, -0.18)}, 'Chest': {'X': 25}, 'Head': {'X': 20, 'Y': 10},
})
DIE_DOWN = merge(both({'L_Thigh': {'X': -20}, 'L_Shin': {'X': 30}, 'L_UpperArm': {'X': -70, 'Y': 25}, 'L_Leaves': {'Y': 20}}), {
    'Hips': {'X': 70, 'loc': (0, -0.15, -0.36)}, 'Chest': {'X': 10}, 'Head': {'X': -20, 'Y': 15},
})
DIE_SETTLE = merge(DIE_DOWN, {'Hips': {'X': 65, 'loc': (0, -0.15, -0.34)}})
animator.build('die', [(0, NEUTRAL), (5, DIE_RECOIL), (15, DIE_BUCKLE), (28, DIE_DOWN), (32, DIE_SETTLE), (39, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
