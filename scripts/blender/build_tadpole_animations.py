"""tadpole（赤いえらのオタマジャクシ・水の敵 tadpole）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った骨なしモデル（長さ 1、Z が上、-Y が前）。前に丸い頭、両脇に赤いえら、
口の下にひげが垂れ、後ろの尾は上へ巻き上がる。ゲームでは水面を泳がせるので、idle / walk は尾を左右に振る泳ぎ。
attack は体をしならせて頭から突っ込む、die は腹を上にしてひっくり返る。

使い方:
  blender -b --factory-startup -P scripts/blender/build_tadpole_animations.py -- \
    assets/enemies/tadpole_rtp.glb assets/enemies/tadpole_anim.glb
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
    ('L_Gill', (0.1, -0.24, 0.3), (0.25, -0.15, 0.22), 'Body'),
]
RIGHT = [
    ('R_' + name[2:], (-h[0], h[1], h[2]), (-t[0], t[1], t[2]), parent.replace('L_', 'R_'))
    for name, h, t, parent in LEFT
]
bone_specs = [
    ('Root', (0, 0, 0), (0, 0, 0.05), None),
    ('Body', (0, -0.1, 0.28), (0, -0.48, 0.3), 'Root'),
    ('Barbel', (0, -0.42, 0.18), (0, -0.43, 0.0), 'Body'),
    ('Tail1', (0, -0.1, 0.28), (0, 0.1, 0.26), 'Body'),
    ('Tail2', (0, 0.1, 0.26), (0, 0.27, 0.28), 'Tail1'),
    ('Tail3', (0, 0.27, 0.28), (0, 0.38, 0.44), 'Tail2'),
    ('Tail4', (0, 0.38, 0.44), (0, 0.4, 0.66), 'Tail3'),
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


def swim(side, amount=1.0):
    """尾を side (+1 / -1) へ振った姿。根元から先へ遅れて大きく曲がる。頭は少し逆へ振る。"""
    s = side * amount
    return merge({
        'Body': {'Z': -4 * s},
        'Tail1': {'Z': 8 * s},
        'Tail2': {'Z': 14 * s},
        'Tail3': {'Z': 20 * s},
        'Tail4': {'Z': 22 * s},
        'Barbel': {'X': -6 * amount},
    }, both({'L_Gill': {'Z': 8 * amount}}))


def swim_mid(side, amount=1.0):
    """振り返す途中: 根元はもう逆へ、先はまだ前の側に残る（波が尾を伝う）。"""
    s = side * amount
    return merge({
        'Body': {'Z': 2 * s},
        'Tail1': {'Z': -4 * s},
        'Tail2': {'Z': 2 * s},
        'Tail3': {'Z': 10 * s},
        'Tail4': {'Z': 16 * s},
        'Barbel': {'X': 4 * amount},
    }, both({'L_Gill': {'Z': -6 * amount}}))


NEUTRAL = {}

# --- 待機: ゆっくり尾を振って水に浮く (1.2s ループ) ---
animator.build('idle', [
    (0, swim(1, 0.6)), (9, swim_mid(1, 0.6)), (18, swim(-1, 0.6)), (27, swim_mid(-1, 0.6)), (36, swim(1, 0.6)),
])

# --- 移動: 速く大きく尾を振って泳ぐ (0.5s ループ) ---
animator.build('walk', [
    (0, swim(1)), (4, swim_mid(1)), (8, swim(-1)), (11, swim_mid(-1)), (15, swim(1)),
])

# --- 攻撃: 体を S 字に縮めて溜め、頭から突っ込む (0.6s) ---
COIL = merge(swim(1, 1.6), {'Body': {'X': -10, 'loc': (0, 0.05, 0.02)}})
LUNGE = merge(swim_mid(-1, 1.2), {'Body': {'X': 12, 'loc': (0, -0.1, -0.03)}, 'Barbel': {'X': -20}})
animator.build('attack', [(0, NEUTRAL), (6, COIL), (9, COIL), (12, LUNGE), (15, LUNGE), (18, NEUTRAL)])

# --- 被弾: 頭がはじかれて尾がすくむ (0.37s) ---
HIT = merge({
    'Body': {'X': -14, 'Z': 10, 'loc': (0, 0.04, 0.02)},
    'Tail1': {'X': 8}, 'Tail2': {'X': 10, 'Z': -12}, 'Tail3': {'Z': -16}, 'Barbel': {'X': -18},
}, both({'L_Gill': {'Y': -18}}))
animator.build('hit', [(0, NEUTRAL), (3, HIT), (6, HIT), (11, NEUTRAL)])

# --- 死亡: 身をよじって腹を上にひっくり返り、尾がだらりと垂れる (1.2s, 最後で止める) ---
TWIST = merge(swim(1, 1.4), {'Body': {'X': -12, 'Y': 40}})
FLIP = merge({
    'Body': {'Y': 150, 'loc': (0, 0, -0.06)},
    'Tail1': {'X': 10}, 'Tail2': {'X': 12, 'Z': 6}, 'Tail3': {'X': 18}, 'Tail4': {'X': 20},
}, both({'L_Gill': {'Y': 25}}))
LIMP = merge(FLIP, {'Body': {'Y': 170, 'loc': (0, 0, -0.08)}, 'Tail3': {'X': 26}, 'Tail4': {'X': 30}, 'Barbel': {'X': 15}})
animator.build('die', [(0, NEUTRAL), (4, HIT), (12, TWIST), (24, FLIP), (32, LIMP), (36, LIMP)])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST, image_format='JPEG')
print('triangles', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
