"""ene_001（追跡型）に idle / walk / attack / hit / die のアニメーションを付けて GLB に書き出す。

使い方:
  blender -b --factory-startup -P scripts/blender/build_ene_001_animations.py -- \
    assets/enemies/ene_001.glb assets/enemies/ene_001_anim.glb

ポーズの書き方は enemy_anim_lib.py を参照。ここでは 'loc' を Hip の移動量として書く。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
arm = lib.find_armature()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

# 全アクションで同じボーンにキーを打ち、three.js のクロスフェードで値が残らないようにする
ANIMATED = [
    'Hip', 'Spine01', 'Spine02', 'NeckTwist01', 'Head',
    'L_Thigh', 'L_Calf', 'L_Foot', 'R_Thigh', 'R_Calf', 'R_Foot',
    'L_Clavicle', 'L_Upperarm', 'L_Forearm', 'R_Clavicle', 'R_Upperarm', 'R_Forearm',
]
animator = lib.Animator(arm, ANIMATED)


def hip_pose(pose):
    """トップレベルの 'loc' を Hip の移動量に移す。"""
    out = {name: dict(value) for name, value in pose.items() if name != 'loc'}
    if 'loc' in pose:
        out.setdefault('Hip', {})['loc'] = pose['loc']
    return out


def mirror(pose):
    return lib.mirror(hip_pose(pose))


def build_action(name, keys):
    animator.build(name, [(frame, hip_pose(pose)) for frame, pose in keys])


# --- 待機: ゆっくり呼吸しながら首をかしげる (4.0s ループ) ---
IDLE_A = {
    'Spine01': {'X': 3}, 'Spine02': {'X': 2},
    'Head': {'X': 2, 'Y': 6},
    'R_Upperarm': {'X': -3}, 'L_Upperarm': {'X': 3},
    'loc': (0, 0, 0),
}
IDLE_B = {
    'Spine01': {'X': 6}, 'Spine02': {'X': 5},
    'NeckTwist01': {'Z': 6},
    'Head': {'X': -4, 'Y': -2},
    'R_Upperarm': {'X': 4, 'Y': 3}, 'L_Upperarm': {'X': -3},
    'R_Forearm': {'X': -6},
    'loc': (0, 0, -0.008),
}
IDLE_C = {**IDLE_A, 'Head': {'X': 2, 'Y': -7}, 'NeckTwist01': {'Z': -4}}
build_action('idle', [(0, IDLE_A), (30, IDLE_B), (60, IDLE_C), (90, IDLE_B), (120, IDLE_A)])

# --- 歩き: 前かがみでよろよろ歩く (1.0s で 2 歩ループ) ---
WALK_CONTACT = {
    'Hip': {'Z': 7},
    'Spine01': {'X': 10, 'Z': -8}, 'Spine02': {'X': 4},
    'Head': {'X': -6, 'Y': 5},
    'L_Thigh': {'X': -28}, 'L_Calf': {'X': 6}, 'L_Foot': {'X': -10},
    'R_Thigh': {'X': 22}, 'R_Calf': {'X': 22}, 'R_Foot': {'X': 15},
    'R_Upperarm': {'X': -22}, 'R_Forearm': {'X': -12},
    'L_Upperarm': {'X': 18},
    'loc': (0, 0, -0.018),
}
WALK_PASS = {
    'Hip': {'Z': 0},
    'Spine01': {'X': 12}, 'Spine02': {'X': 5},
    'Head': {'X': -2, 'Y': -2},
    'L_Thigh': {'X': 2}, 'L_Calf': {'X': 8},
    'R_Thigh': {'X': -18}, 'R_Calf': {'X': 55}, 'R_Foot': {'X': 10},
    'R_Upperarm': {'X': 0}, 'R_Forearm': {'X': -18},
    'L_Upperarm': {'X': 0},
    'loc': (0, 0, 0.014),
}
build_action('walk', [
    (0, WALK_CONTACT), (8, WALK_PASS), (15, mirror(WALK_CONTACT)), (23, mirror(WALK_PASS)), (30, WALK_CONTACT),
])

# --- 攻撃: 右腕を振りかぶって前に振り下ろす (0.7s) ---
ATTACK_WINDUP = {
    'Spine01': {'X': -12, 'Z': 14}, 'Spine02': {'X': -8, 'Z': 6},
    'Head': {'X': -12},
    'R_Clavicle': {'X': -10}, 'R_Upperarm': {'X': -150, 'Y': -15}, 'R_Forearm': {'X': -25},
    'L_Upperarm': {'X': -35},
    'R_Thigh': {'X': 10}, 'L_Thigh': {'X': -12}, 'L_Calf': {'X': 10},
    'loc': (0, 0.03, 0.01),
}
ATTACK_STRIKE = {
    'Spine01': {'X': 26, 'Z': -12}, 'Spine02': {'X': 14, 'Z': -6},
    'Head': {'X': 12},
    'R_Clavicle': {'X': 6}, 'R_Upperarm': {'X': -25, 'Y': 10}, 'R_Forearm': {'X': -10},
    'L_Upperarm': {'X': 25},
    'L_Thigh': {'X': -26}, 'L_Calf': {'X': 22}, 'R_Thigh': {'X': 14}, 'R_Calf': {'X': 12},
    'loc': (0, -0.06, -0.04),
}
ATTACK_FOLLOW = {**ATTACK_STRIKE, 'R_Upperarm': {'X': -5, 'Y': 12}, 'Spine01': {'X': 30, 'Z': -14}}
build_action('attack', [
    (0, IDLE_A), (7, ATTACK_WINDUP), (9, ATTACK_WINDUP), (12, ATTACK_STRIKE), (15, ATTACK_FOLLOW), (21, IDLE_A),
])

# --- 被弾: 上体がのけぞる (0.37s) ---
HIT_POSE = {
    'Spine01': {'X': -18, 'Y': 6}, 'Spine02': {'X': -10},
    'Head': {'X': -22, 'Y': 12},
    'R_Upperarm': {'X': 28, 'Y': -10}, 'L_Upperarm': {'X': 24, 'Y': 10},
    'R_Forearm': {'X': -20},
    'R_Thigh': {'X': -6}, 'L_Thigh': {'X': 8}, 'L_Calf': {'X': 10},
    'loc': (0, 0.035, -0.01),
}
build_action('hit', [(0, IDLE_A), (3, HIT_POSE), (6, HIT_POSE), (11, IDLE_A)])

# --- 死亡: のけぞる → 膝が崩れる → 後ろに倒れる (1.2s, 最後で止める) ---
DIE_RECOIL = {
    'Spine01': {'X': -22}, 'Spine02': {'X': -12},
    'Head': {'X': -28, 'Y': -10},
    'R_Upperarm': {'X': 35}, 'L_Upperarm': {'X': 30},
    'loc': (0, 0.04, 0),
}
DIE_BUCKLE = {
    'Spine01': {'X': 22, 'Z': 10}, 'Spine02': {'X': 10},
    'Head': {'X': 25, 'Y': 15},
    'L_Thigh': {'X': -48}, 'L_Calf': {'X': 82}, 'L_Foot': {'X': -25},
    'R_Thigh': {'X': -42}, 'R_Calf': {'X': 76}, 'R_Foot': {'X': -25},
    'R_Upperarm': {'X': -10}, 'L_Upperarm': {'X': -8},
    'loc': (0, 0.02, -0.1),
}
# 元の姿勢が前かがみなので、仰向けでは背骨を反らせて上体を地面に寝かせる
DIE_DOWN = {
    'Hip': {'X': -86, 'Z': 8},
    'Spine01': {'X': -28}, 'Spine02': {'X': -14},
    'Head': {'X': -25, 'Y': 25},
    'L_Thigh': {'X': -14}, 'L_Calf': {'X': 18},
    'R_Thigh': {'X': -6}, 'R_Calf': {'X': 10},
    'R_Upperarm': {'X': -10, 'Y': 50}, 'L_Upperarm': {'X': -12, 'Y': -45},
    'loc': (0, 0.16, -0.45),
}
DIE_BOUNCE = {
    **DIE_DOWN,
    'Hip': {'X': -80, 'Z': 8}, 'Spine01': {'X': -20}, 'Head': {'X': -12, 'Y': 25},
    'loc': (0, 0.16, -0.425),
}
build_action('die', [
    (0, IDLE_A), (5, DIE_RECOIL), (14, DIE_BUCKLE), (25, DIE_DOWN), (29, DIE_BOUNCE), (36, DIE_DOWN),
])
animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
