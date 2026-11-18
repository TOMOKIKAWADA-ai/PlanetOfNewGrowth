"""bat_rat（赤黒い翼獣・水没ステージの飛ぶ敵 dragonfly）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（高さ約 0.94、Z が上、-Y が前）。四つ足で立ち、翼を上に広げた姿。
ゲームでは宙に浮かせて飛ばすので、walk / idle は羽ばたき。脚は後ろへたたみ、尾でかじを取る。
attack は急降下の噛みつき、die は翼をたたんで落ちる。

使い方:
  blender -b --factory-startup -P scripts/blender/build_bat_rat_animations.py -- \
    assets/enemies/bat_rat_rtp.glb assets/enemies/bat_rat_anim.glb
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
    ('L_Wing', (0.1, -0.05, 0.4), (0.22, 0.03, 0.66), 'Body'),
    ('L_WingTip', (0.22, 0.03, 0.66), (0.36, 0.12, 0.94), 'L_Wing'),
    ('L_FrontLeg', (0.12, -0.2, 0.28), (0.24, -0.24, 0.12), 'Body'),
    ('L_FrontFoot', (0.24, -0.24, 0.12), (0.3, -0.28, 0.0), 'L_FrontLeg'),
    ('L_HindLeg', (0.12, 0.1, 0.26), (0.24, 0.12, 0.12), 'Body'),
    ('L_HindFoot', (0.24, 0.12, 0.12), (0.3, 0.12, 0.0), 'L_HindLeg'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.08), None),
    ('Body', (0, 0.12, 0.3), (0, -0.2, 0.34), 'Root'),
    ('Neck', (0, -0.2, 0.34), (0, -0.36, 0.22), 'Body'),
    ('Head', (0, -0.36, 0.22), (0, -0.5, 0.06), 'Neck'),
    ('Tail1', (0, 0.12, 0.3), (0, 0.32, 0.28), 'Body'),
    ('Tail2', (0, 0.32, 0.28), (0, 0.47, 0.15), 'Tail1'),
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


# 飛んでいる間の基本姿勢: 脚を後ろへたたみ、首を少し上げる
TUCK = merge(both({
    'L_FrontLeg': {'X': 35}, 'L_FrontFoot': {'X': 30},
    'L_HindLeg': {'X': 40}, 'L_HindFoot': {'X': 35},
}), {'Neck': {'X': -12}, 'Head': {'X': -10}})

# 羽ばたき: L の翼は Y+ で外へ下がる（打ち下ろし）
DOWN = merge(TUCK, both({'L_Wing': {'Y': 38}, 'L_WingTip': {'Y': 18}}), {
    'Body': {'loc': (0, 0, 0.03)}, 'Tail1': {'X': -6}, 'Tail2': {'X': -8},
})
UP = merge(TUCK, both({'L_Wing': {'Y': -18}, 'L_WingTip': {'Y': -14}}), {
    'Body': {'loc': (0, 0, -0.03)}, 'Tail1': {'X': 6}, 'Tail2': {'X': 10},
})
MID = merge(TUCK, both({'L_Wing': {'Y': 10}, 'L_WingTip': {'Y': 2}}))

# --- 待機: ゆっくり羽ばたいてその場に浮く (1.0s ループ) ---
animator.build('idle', [(0, UP), (12, DOWN), (20, MID), (30, UP)])

# --- 移動: 速く羽ばたいて前のめりに飛ぶ (0.5s ループ) ---
LEAN = {'Body': {'X': 10}}
animator.build('walk', [(0, merge(UP, LEAN)), (6, merge(DOWN, LEAN)), (10, merge(MID, LEAN)), (15, merge(UP, LEAN))])

# --- 攻撃: 翼を高く上げて溜め、首を突き出して噛みつく (0.6s) ---
WINDUP = merge(TUCK, both({'L_Wing': {'Y': -28}, 'L_WingTip': {'Y': -20}}), {
    'Body': {'X': -12, 'loc': (0, 0.04, 0.04)}, 'Neck': {'X': -30}, 'Head': {'X': -20},
})
BITE = merge(TUCK, both({'L_Wing': {'Y': 45}, 'L_WingTip': {'Y': 25}}), {
    'Body': {'X': 22, 'loc': (0, -0.08, -0.04)}, 'Neck': {'X': 25}, 'Head': {'X': 18},
})
animator.build('attack', [(0, MID), (6, WINDUP), (9, WINDUP), (12, BITE), (15, BITE), (18, MID)])

# --- 被弾: 体がはじかれて翼が乱れる (0.37s) ---
HIT = merge(TUCK, {
    'Body': {'X': -14, 'Y': 10, 'loc': (0, 0.04, 0.02)}, 'Neck': {'X': -20}, 'Head': {'X': -15},
    'L_Wing': {'Y': -25}, 'R_Wing': {'Y': -5},
})
animator.build('hit', [(0, MID), (3, HIT), (6, HIT), (11, MID)])

# --- 死亡: 翼をたたみ、きりもみして地面に落ちる (1.2s, 最後で止める) ---
FOLD = both({'L_Wing': {'Y': 60, 'X': 20}, 'L_WingTip': {'Y': 40}})
DIE_RECOIL = merge(TUCK, {'Body': {'X': -20}, 'Neck': {'X': -25}, 'Head': {'X': -20}, 'L_Wing': {'Y': -30}, 'R_Wing': {'Y': -30}})
DIE_FALL = merge(TUCK, FOLD, {'Body': {'Y': 40, 'X': 15, 'loc': (0, 0, -0.1)}, 'Neck': {'X': 20}})
DIE_DOWN = merge(FOLD, {
    'Body': {'Y': 80, 'loc': (0.05, 0, -0.22)}, 'Neck': {'X': 25, 'Y': -10}, 'Head': {'X': 15},
    'Tail1': {'Z': 15}, 'Tail2': {'Z': 20},
})
DIE_SETTLE = merge(DIE_DOWN, {'Body': {'Y': 76, 'loc': (0.05, 0, -0.2)}})
animator.build('die', [(0, MID), (4, DIE_RECOIL), (14, DIE_FALL), (26, DIE_DOWN), (30, DIE_SETTLE), (36, DIE_DOWN)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
