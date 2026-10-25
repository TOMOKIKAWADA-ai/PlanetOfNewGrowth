"""bombarding_001（射撃型・スナイパー）に idle / walk / attack / hit / die を揃えて GLB に書き出す。

元からある anim2（待機）と anim1（射撃）はそのまま idle / attack として残し、
walk / hit / die を追加する。根元が地面に生えている植物なので、体の傾きは
根元を中心に回す（pivot_offset）。

使い方:
  blender -b --factory-startup -P scripts/blender/build_bombarding_animations.py -- \
    assets/enemies/bombarding_001_rigged.glb assets/enemies/bombarding_001_anim.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
arm = lib.find_armature()

bpy.data.actions['anim2'].name = 'idle'
bpy.data.actions['anim1'].name = 'attack'
for action in list(bpy.data.actions):
    if action.name not in ('idle', 'attack'):
        bpy.data.actions.remove(action)

animator = lib.Animator(arm, ['root', 'bone2', 'bone3', 'bone4', 'bone22'])
ROOT_HEAD = animator.bone_head('root')
GROUND = (ROOT_HEAD[0], ROOT_HEAD[1], 0.0)


def plant(rotation, lift=0.0, **head):
    """根元を中心に全体を傾けたポーズ。head には bone2〜4 の回転を渡す。"""
    root = dict(rotation)
    offset = lib.pivot_offset(rotation, ROOT_HEAD, GROUND)
    root['loc'] = (offset[0], offset[1], offset[2] + lift)
    pose = {'root': root}
    pose.update(head)
    return pose


NEUTRAL = plant({})

# --- 移動: 根を引きずりながら左右に揺れる (0.8s ループ) ---
SWAY_L = plant({'Y': 6, 'X': 4}, bone2={'Y': -4}, bone3={'Y': -5, 'X': -3}, bone4={'Y': -4})
SWAY_R = lib.mirror(SWAY_L)
SWAY_MID = plant({'X': 6}, lift=0.012, bone3={'X': -4})
animator.build('walk', [(0, SWAY_L), (6, SWAY_MID), (12, SWAY_R), (18, SWAY_MID), (24, SWAY_L)])

# --- 被弾: 根元から後ろへしなる (0.37s) ---
HIT = plant({'X': -12, 'Y': 4}, bone2={'X': -15}, bone3={'X': -18, 'Y': 10}, bone4={'X': -10})
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: のけぞる → 花がしおれる → 前に倒れる (1.2s, 最後で止める) ---
DIE_RECOIL = plant({'X': -10}, bone2={'X': -12}, bone3={'X': -20}, bone4={'X': -10})
DIE_WILT = plant({'X': 14, 'Y': -6}, bone2={'X': 35}, bone3={'X': 40}, bone4={'X': 30})
DIE_DOWN = plant({'X': 84, 'Y': -8, 'Z': 10}, lift=0.035, bone2={'X': 10, 'Y': 20}, bone3={'X': 15}, bone4={'X': 20})
DIE_BOUNCE = plant({'X': 77, 'Y': -8, 'Z': 10}, lift=0.035, bone2={'X': 18, 'Y': 20}, bone3={'X': 22}, bone4={'X': 25})
animator.build('die', [(0, NEUTRAL), (5, DIE_RECOIL), (14, DIE_WILT), (25, DIE_DOWN), (29, DIE_BOUNCE), (36, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
