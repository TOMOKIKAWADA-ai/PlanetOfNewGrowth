"""Tripo で作った新種とボス 8 体（2026-11-09）に骨を入れ、idle / walk / attack / hit / die を付けて GLB に書き出す。

Tripo の GLB は骨がなく、高さ 1・足元が原点・前が -Y（Blender の座標）。骨は下の SPECS のランドマーク
（正面・横・上からの画像で読んだ位置）に置き、ウェイトは Blender の自動ウェイトで付ける（enemy_anim_lib.rig_mesh_auto）。
左右のある骨は L_（+X 側）だけ書き、R_ は X を反転して作る。

使い方:
  blender -b --factory-startup -P scripts/blender/build_tripo_enemies.py -- <名前> <元.glb> <出力_anim.glb>
  名前: footprint crier swarmbird splitshell hand rootsucker lotus_core lotus_petal
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import enemy_anim_lib as lib  # noqa: E402

TEXTURE_SIZE = 1024
args = sys.argv[sys.argv.index('--') + 1:]
NAME, SRC, DST = args[0], args[1], args[2]
TAU = math.tau


def s(p, k=1.0, off=0.0):
    return math.sin(TAU * (k * p + off))


def c(p, k=1.0, off=0.0):
    return math.cos(TAU * (k * p + off))


def bones(*specs):
    """(name, head, tail, parent)。name が L_ で始まる骨は R_ を X 反転で足す。"""
    out = []
    for name, head, tail, parent in specs:
        out.append((name, head, tail, parent))
        if name.startswith('L_'):
            rparent = 'R_' + parent[2:] if parent and parent.startswith('L_') else parent
            out.append(('R_' + name[2:], (-head[0], head[1], head[2]), (-tail[0], tail[1], tail[2]), rparent))
    return out


def mirror_value(value):
    """L_ の骨に書いた回転・移動を、R_ の骨用に鏡映する（X 回転はそのまま、Y・Z 回転と X 移動は反転）。"""
    return lib.mirror({'L_x': value})['R_x']


def side(pose, name, left, right=None):
    """L_name に left、R_name に right（省略時は left）を鏡映して入れる。左右対称の動きは right を省く。"""
    pose['L_' + name] = left
    pose['R_' + name] = mirror_value(left if right is None else right)
    return pose


def both(name, value):
    return {'L_' + name: value, 'R_' + name: mirror_value(value)}


def merge(*poses):
    out = {}
    for p in poses:
        out.update(p)
    return out


SPECS = {}


# --- 足跡: 外套の人型と尾。追い手の写し。歩くと尾が揺れる -----------------------------------
def footprint_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Hips'] = {'loc': (0, 0, 0.004 * s(p))}
        pose['Chest'] = {'X': 2 * s(p)}
        pose['Head'] = {'X': -2 * s(p), 'Z': 4 * s(p, 1, 0.2)}
        side(pose, 'Arm', {'X': 3 * s(p)})
        pose['Tail1'] = {'Z': 8 * s(p)}
        pose['Tail2'] = {'Z': 12 * s(p, 1, -0.15)}
    elif clip == 'walk':
        pose['Hips'] = {'loc': (0, 0, 0.012 * abs(c(p))), 'Z': 4 * s(p)}
        pose['Chest'] = {'X': 6, 'Z': -5 * s(p)}
        pose['Head'] = {'X': -4}
        pose['L_Leg'] = {'X': 24 * s(p)}
        pose['R_Leg'] = {'X': -24 * s(p)}
        pose['L_Arm'] = {'X': -16 * s(p)}
        pose['R_Arm'] = {'X': 16 * s(p)}
        pose['Tail1'] = {'Z': 14 * s(p, 1, 0.1)}
        pose['Tail2'] = {'Z': 20 * s(p, 1, -0.05)}
    return pose


def footprint_keys():
    lean = merge({'Hips': {'loc': (0, -0.02, -0.01)}, 'Chest': {'X': 18}, 'Head': {'X': 6},
                  'Tail1': {'X': 15}, 'Tail2': {'X': 10}}, both('Arm', {'X': -70}))
    reach = merge({'Hips': {'loc': (0, -0.05, -0.02)}, 'Chest': {'X': 26}, 'Head': {'X': 10},
                   'Tail1': {'X': 25}, 'Tail2': {'X': 20}}, both('Arm', {'X': -95}))
    hit = {'Hips': {'loc': (0, 0.03, 0)}, 'Chest': {'X': -16, 'Y': 6}, 'Head': {'X': -14},
           'L_Arm': {'X': 20}, 'R_Arm': {'X': 15}, 'Tail1': {'Z': 18}}
    fall = {'Hips': {'loc': (0, -0.05, -0.25), 'X': 30}, 'Chest': {'X': 25}, 'Head': {'X': 15},
            'L_Leg': {'X': -50}, 'R_Leg': {'X': -40}, 'L_Arm': {'X': -40}, 'R_Arm': {'X': -30}, 'Tail1': {'Z': 25}}
    down = {'Hips': {'loc': (0, -0.15, -0.38), 'X': 70}, 'Chest': {'X': 15}, 'Head': {'X': 10},
            'L_Leg': {'X': -70}, 'R_Leg': {'X': -60}, 'L_Arm': {'X': -100}, 'R_Arm': {'X': -90},
            'Tail1': {'Z': 30}, 'Tail2': {'Z': 25}}
    return {
        'attack': [(0, {}), (8, lean), (14, reach), (18, reach), (27, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


# 体の中心が X=-0.06 にあり（尾が +X 側に出ている）左右が非対称なので、R_ の骨も直接書く
SPECS['footprint'] = dict(
    bones=[
        ('Root', (-0.06, -0.08, 0.0), (-0.06, -0.08, 0.05), None),
        ('Hips', (-0.06, -0.08, 0.45), (-0.06, -0.08, 0.6), 'Root'),
        ('Chest', (-0.06, -0.09, 0.6), (-0.06, -0.1, 0.8), 'Hips'),
        ('Head', (-0.06, -0.11, 0.82), (-0.06, -0.12, 0.98), 'Chest'),
        ('L_Arm', (0.05, -0.08, 0.78), (0.04, -0.08, 0.52), 'Chest'),
        ('R_Arm', (-0.17, -0.08, 0.78), (-0.2, -0.08, 0.52), 'Chest'),
        ('L_Leg', (-0.025, -0.08, 0.44), (-0.025, -0.1, 0.02), 'Hips'),
        ('R_Leg', (-0.11, -0.08, 0.44), (-0.11, -0.1, 0.02), 'Hips'),
        ('Tail1', (0.0, 0.0, 0.42), (0.12, 0.1, 0.25), 'Hips'),
        ('Tail2', (0.12, 0.1, 0.25), (0.22, 0.2, 0.04), 'Tail1'),
    ],
    pose=footprint_pose, keys=footprint_keys,
)


# --- 四つ足の歩き（左前と右後ろが同時） -----------------------------------------------------
def quad_walk(pose, p, swing=22, lift=0.012, front='FLeg', hind='HLeg'):
    pose['Body'] = merge(pose.get('Body', {}), {'loc': (0, 0, lift * abs(c(p))), 'Y': 3 * s(p)})
    pose['L_' + front] = {'X': swing * s(p)}
    pose['R_' + front] = {'X': -swing * s(p)}
    pose['L_' + hind] = {'X': -swing * s(p)}
    pose['R_' + hind] = {'X': swing * s(p)}
    return pose


# --- 鳴き: 首の長い座った四つ足。攻撃は首を反らせて鳴く -------------------------------------
def crier_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Body'] = {'loc': (0, 0, 0.004 * s(p))}
        pose['Neck'] = {'X': 4 * s(p), 'Z': 3 * s(p, 1, 0.3)}
        pose['Head'] = {'X': -5 * s(p, 1, 0.1), 'Y': 4 * s(p, 1, 0.25)}
        pose['Tail1'] = {'Z': 10 * s(p)}
        pose['Tail2'] = {'Z': 14 * s(p, 1, -0.15)}
    elif clip == 'walk':
        quad_walk(pose, p, swing=24)
        pose['Neck'] = {'X': 8 + 4 * s(p, 2)}
        pose['Head'] = {'X': -6}
        pose['Tail1'] = {'Z': 14 * s(p)}
        pose['Tail2'] = {'Z': 18 * s(p, 1, -0.1)}
    return pose


def crier_keys():
    swell = {'Body': {'X': -6, 'loc': (0, 0, 0.02)}, 'Neck': {'X': -20}, 'Head': {'X': -20}, 'Tail1': {'X': -10}}
    cry = {'Body': {'X': -10, 'loc': (0, 0, 0.03)}, 'Neck': {'X': -32}, 'Head': {'X': -38}, 'Tail1': {'X': -18}}
    hit = {'Body': {'X': 8, 'Y': 6, 'loc': (0, 0.02, 0.02)}, 'Neck': {'X': -14, 'Z': 10}, 'Head': {'X': -10}}
    fall = {'Body': {'Y': 30, 'loc': (0, 0, -0.08)}, 'Neck': {'X': 30}, 'Head': {'X': 20},
            'L_FLeg': {'X': -30}, 'R_FLeg': {'X': 20}, 'L_HLeg': {'X': 25}, 'R_HLeg': {'X': -20}}
    down = {'Body': {'Y': 75, 'loc': (0.05, 0, -0.14)}, 'Neck': {'X': 45, 'Y': -20}, 'Head': {'X': 30},
            'L_FLeg': {'X': -40}, 'R_FLeg': {'X': 30}, 'L_HLeg': {'X': 35}, 'R_HLeg': {'X': -30}, 'Tail1': {'Z': 25}}
    return {
        'attack': [(0, {}), (8, swell), (14, cry), (20, cry), (30, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['crier'] = dict(
    bones=bones(
        ('Root', (0, 0.02, 0.0), (0, 0.02, 0.05), None),
        ('Body', (0, 0.08, 0.28), (0, -0.12, 0.42), 'Root'),
        ('Neck', (0, -0.12, 0.45), (0, -0.2, 0.72), 'Body'),
        ('Head', (0, -0.21, 0.74), (0, -0.33, 0.83), 'Neck'),
        ('L_FLeg', (0.075, -0.1, 0.36), (0.075, -0.11, 0.02), 'Body'),
        ('L_HLeg', (0.17, 0.1, 0.28), (0.2, 0.04, 0.02), 'Body'),
        ('Tail1', (0, 0.18, 0.14), (0, 0.29, 0.07), 'Body'),
        ('Tail2', (0, 0.29, 0.07), (0, 0.38, 0.02), 'Tail1'),
    ),
    pose=crier_pose, keys=crier_keys,
)


# --- 群れ鳥: 這う白い体と、首の上の赤い翼。walk（飛んで襲う）は速く羽ばたく ------------------
def swarmbird_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Body'] = {'loc': (0, 0, 0.008 * s(p, 2, 0.25))}
        side(pose, 'Wing', {'Y': 12 * s(p, 2)})
        pose['Head'] = {'X': 3 * s(p)}
        pose['Tail'] = {'Z': 8 * s(p)}
    elif clip == 'walk':
        pose['Body'] = {'loc': (0, 0, 0.02 * c(p)), 'X': 4}
        side(pose, 'Wing', {'Y': 34 * s(p)})
        pose['Head'] = {'X': -6}
        side(pose, 'FLeg', {'X': 25})
        side(pose, 'HLeg', {'X': 30})
        pose['Tail'] = {'X': -8, 'Z': 10 * s(p, 1, 0.2)}
    return pose


def swarmbird_keys():
    up = merge({'Body': {'X': -12, 'loc': (0, 0.02, 0.04)}, 'Head': {'X': -15}}, both('Wing', {'Y': -30}))
    bite = merge({'Body': {'X': 15, 'loc': (0, -0.06, -0.02)}, 'Head': {'X': 25}}, both('Wing', {'Y': 35}))
    hit = {'Body': {'X': -8, 'Y': 10, 'loc': (0, 0.02, 0.03)}, 'Head': {'X': -12},
           'L_Wing': {'Y': -20}, 'R_Wing': mirror_value({'Y': 10})}
    fall = {'Body': {'Y': 40, 'loc': (0, 0, -0.04)}, 'Head': {'X': 20},
            'L_Wing': {'Y': 40}, 'R_Wing': mirror_value({'Y': -30})}
    down = {'Body': {'Y': 80, 'loc': (0.04, 0, -0.06)}, 'Head': {'X': 30},
            'L_Wing': {'Y': 70}, 'R_Wing': mirror_value({'Y': -50}), 'Tail': {'Z': 25}}
    return {
        'attack': [(0, {}), (7, up), (12, bite), (16, bite), (24, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['swarmbird'] = dict(
    bones=bones(
        ('Root', (0, 0.0, 0.0), (0, 0.0, 0.05), None),
        ('Body', (0, 0.14, 0.24), (0, -0.12, 0.24), 'Root'),
        ('Head', (0, -0.13, 0.2), (0, -0.38, 0.1), 'Body'),
        ('Stalk', (0, -0.02, 0.34), (0, -0.02, 0.52), 'Body'),
        ('L_Wing', (0.025, -0.02, 0.53), (0.28, 0.15, 1.0), 'Stalk'),
        ('L_FLeg', (0.12, -0.11, 0.2), (0.19, -0.12, 0.01), 'Body'),
        ('L_HLeg', (0.12, 0.17, 0.24), (0.19, 0.22, 0.01), 'Body'),
        ('Tail', (0, 0.17, 0.22), (0, 0.38, 0.06), 'Body'),
    ),
    pose=swarmbird_pose, keys=swarmbird_keys,
)


# --- 割れ殻: 背の高い黒い四つ足、脇に垂れた翼、背中に赤い花 -----------------------------------
def splitshell_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Body'] = {'loc': (0, 0, 0.006 * s(p))}
        pose['Neck'] = {'X': 4 * s(p)}
        pose['Head'] = {'Z': 6 * s(p, 1, 0.2)}
        side(pose, 'Wing', {'Y': 3 * s(p)})
        pose['Tail'] = {'Z': 6 * s(p)}
    elif clip == 'walk':
        quad_walk(pose, p, swing=20, lift=0.015)
        pose['Neck'] = {'X': 3 * s(p, 2)}
        side(pose, 'Wing', {'Y': 6 * s(p), 'X': 6 * s(p, 1, 0.25)}, {'Y': 6 * s(p), 'X': -6 * s(p, 1, 0.25)})
        pose['Tail'] = {'Z': 10 * s(p)}
    return pose


def splitshell_keys():
    rear = merge({'Body': {'X': -10, 'loc': (0, 0.03, 0.02)}, 'Neck': {'X': -25}, 'Head': {'X': -15}},
                 both('Wing', {'Y': -20}))
    lunge = merge({'Body': {'X': 8, 'loc': (0, -0.06, -0.02)}, 'Neck': {'X': 25}, 'Head': {'X': 15}},
                  both('Wing', {'Y': -35}))
    hit = {'Body': {'X': -6, 'Y': 6, 'loc': (0, 0.02, 0.02)}, 'Neck': {'X': -15}, 'Head': {'Z': 12}}
    fall = {'Body': {'Y': 25, 'loc': (0, 0, -0.15)}, 'Neck': {'X': 35}, 'Head': {'X': 20},
            'L_FLeg': {'Y': -25}, 'R_FLeg': {'Y': -15}, 'L_HLeg': {'Y': -20}, 'R_HLeg': {'Y': -10}}
    down = {'Body': {'Y': 60, 'loc': (0.08, 0, -0.32)}, 'Neck': {'X': 45}, 'Head': {'X': 25},
            'L_FLeg': {'Y': -40}, 'R_FLeg': {'Y': -25}, 'L_HLeg': {'Y': -35}, 'R_HLeg': {'Y': -20},
            'L_Wing': {'Y': 25}, 'R_Wing': mirror_value({'Y': -15})}
    return {
        'attack': [(0, {}), (8, rear), (13, lunge), (17, lunge), (26, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['splitshell'] = dict(
    bones=bones(
        ('Root', (0, 0.0, 0.0), (0, 0.0, 0.05), None),
        ('Body', (0, 0.2, 0.62), (0, -0.1, 0.7), 'Root'),
        ('Neck', (0, -0.1, 0.66), (0, -0.28, 0.46), 'Body'),
        ('Head', (0, -0.28, 0.46), (0, -0.43, 0.34), 'Neck'),
        ('L_FLeg', (0.08, -0.06, 0.55), (0.08, -0.24, 0.01), 'Body'),
        ('L_HLeg', (0.1, 0.17, 0.55), (0.1, 0.21, 0.01), 'Body'),
        ('L_Wing', (0.24, 0.0, 0.72), (0.28, 0.05, 0.08), 'Body'),
        ('Tail', (0, 0.3, 0.55), (0, 0.41, 0.05), 'Body'),
    ),
    pose=splitshell_pose, keys=splitshell_keys,
)


# --- 手: 根元が地面に刺さった弓なりの体。垂れた腕と翅。攻撃は身を乗り出して腕を伸ばす -----------
def hand_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Trunk2'] = {'X': 2 * s(p), 'Y': 2 * s(p, 1, 0.3)}
        pose['Trunk3'] = {'X': 3 * s(p, 1, 0.1)}
        pose['Head'] = {'X': -3 * s(p)}
        side(pose, 'Arm', {'X': 6 * s(p, 1, 0.15)}, {'X': 6 * s(p, 1, 0.4)})
        side(pose, 'Wing', {'Y': 8 * s(p, 2)})
        pose['Dangle'] = {'X': 6 * s(p, 1, 0.2)}
    elif clip == 'walk':
        pose['Trunk1'] = {'Y': 4 * s(p), 'X': 3}
        pose['Trunk2'] = {'Y': -6 * s(p), 'X': 5}
        pose['Trunk3'] = {'X': 4 + 3 * s(p, 2)}
        side(pose, 'Arm', {'X': -12 * s(p)}, {'X': 12 * s(p)})
        side(pose, 'Wing', {'Y': 16 * s(p, 2)})
        pose['Dangle'] = {'X': 12 * s(p, 1, 0.25), 'Y': 8 * s(p)}
    return pose


def hand_keys():
    lean = merge({'Trunk2': {'X': 8}, 'Trunk3': {'X': 10}, 'Head': {'X': -10}},
                 both('Arm', {'X': -45}), both('Wing', {'Y': -25}))
    grab = merge({'Trunk2': {'X': 14}, 'Trunk3': {'X': 18}, 'Head': {'X': -6}},
                 both('Arm', {'X': -85, 'Z': 10}), both('Wing', {'Y': 20}))
    hit = {'Trunk2': {'X': -8, 'Y': 6}, 'Trunk3': {'X': -10}, 'Head': {'X': -12},
           'L_Arm': {'X': 20}, 'R_Arm': {'X': 15}, 'Dangle': {'X': -15}}
    # 弓なりの体なので、各節を少しずつ倒すだけで頭が地面に届く（大きく曲げると輪になる）
    fall = {'Trunk1': {'X': 6}, 'Trunk2': {'X': 12, 'Y': 8}, 'Trunk3': {'X': 10}, 'Head': {'X': 8},
            'L_Arm': {'X': 20}, 'R_Arm': {'X': 25}, 'L_Wing': {'Y': 30}, 'R_Wing': mirror_value({'Y': 20})}
    down = {'Trunk1': {'X': 12}, 'Trunk2': {'X': 22, 'Y': 12}, 'Trunk3': {'X': 15}, 'Head': {'X': 10},
            'L_Arm': {'X': 30}, 'R_Arm': {'X': 35}, 'L_Wing': {'Y': 55}, 'R_Wing': mirror_value({'Y': 45}),
            'Dangle': {'X': -30}}
    return {
        'attack': [(0, {}), (8, lean), (14, grab), (20, grab), (30, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['hand'] = dict(
    bones=bones(
        ('Root', (0, 0.13, 0.0), (0, 0.13, 0.05), None),
        ('Trunk1', (0, 0.13, 0.08), (0, 0.13, 0.3), 'Root'),
        ('Trunk2', (0, 0.13, 0.3), (0, 0.09, 0.56), 'Trunk1'),
        ('Trunk3', (0, 0.09, 0.56), (0, -0.02, 0.73), 'Trunk2'),
        ('Head', (0, -0.04, 0.73), (0, -0.33, 0.63), 'Trunk3'),
        ('L_Arm', (0.15, -0.06, 0.64), (0.17, -0.08, 0.38), 'Head'),
        ('L_Wing', (0.05, 0.02, 0.77), (0.28, 0.2, 0.92), 'Trunk3'),
        ('Dangle', (0, -0.27, 0.58), (0, -0.28, 0.12), 'Head'),
    ),
    pose=hand_pose, keys=hand_keys,
)


# --- 吸水根: 頭蓋骨の顔の幹。根元は動かない。攻撃は冠を持ち上げて根を張る -----------------------
def rootsucker_pose(clip, p):
    pose = {}
    if clip == 'idle':
        pose['Trunk1'] = {'X': 1.5 * s(p), 'Y': 1.5 * s(p, 1, 0.25)}
        pose['Trunk2'] = {'X': 2 * s(p, 1, 0.1)}
        pose['Head'] = {'X': -3 * s(p, 1, 0.2)}
        pose['Crown'] = {'Y': 3 * s(p, 1, 0.3)}
        side(pose, 'Branch', {'Y': 6 * s(p, 1, 0.1)}, {'Y': 6 * s(p, 1, 0.35)})
    elif clip == 'walk':
        pose['Trunk1'] = {'Y': 6 * s(p), 'X': 4}
        pose['Trunk2'] = {'Y': -6 * s(p), 'X': 3 * s(p, 2)}
        pose['Head'] = {'X': -3}
        pose['Crown'] = {'Y': 6 * s(p, 1, 0.2)}
        side(pose, 'Branch', {'Y': 10 * s(p, 1, 0.1)}, {'Y': 10 * s(p, 1, 0.35)})
    return pose


def rootsucker_keys():
    lift = merge({'Trunk1': {'X': -4}, 'Trunk2': {'X': -8}, 'Head': {'X': -18}, 'Crown': {'X': -10, 'loc': (0, 0, 0.03)}},
                 both('Branch', {'Y': -20}))
    root = merge({'Trunk1': {'X': 4, 'loc': (0, 0, -0.02)}, 'Trunk2': {'X': 6}, 'Head': {'X': 12}, 'Crown': {'X': 6}},
                 both('Branch', {'Y': 15}))
    hit = {'Trunk1': {'X': -5, 'Y': 4}, 'Trunk2': {'X': -8}, 'Head': {'X': -12}, 'Crown': {'Y': 10}}
    fall = {'Trunk1': {'Y': 18}, 'Trunk2': {'Y': 18, 'X': 10}, 'Head': {'X': 15}, 'Crown': {'Y': 15},
            'L_Branch': {'Y': 25}, 'R_Branch': mirror_value({'Y': -10})}
    down = {'Trunk1': {'Y': 40}, 'Trunk2': {'Y': 35, 'X': 15}, 'Head': {'X': 25}, 'Crown': {'Y': 20},
            'L_Branch': {'Y': 40}, 'R_Branch': mirror_value({'Y': -20})}
    return {
        'attack': [(0, {}), (9, lift), (16, root), (22, root), (32, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['rootsucker'] = dict(
    bones=bones(
        ('Root', (0, 0.04, 0.0), (0, 0.04, 0.06), None),
        ('Trunk1', (0, 0.04, 0.08), (0, 0.03, 0.3), 'Root'),
        ('Trunk2', (0, 0.03, 0.3), (0, 0.0, 0.48), 'Trunk1'),
        ('Head', (0, -0.02, 0.48), (0, -0.26, 0.48), 'Trunk2'),
        ('Crown', (0, 0.0, 0.6), (0, 0.0, 0.88), 'Trunk2'),
        ('L_Branch', (0.12, 0.0, 0.7), (0.3, 0.0, 0.86), 'Crown'),
    ),
    pose=rootsucker_pose, keys=rootsucker_keys,
)


# --- 白蓮の核: 目のある花の頭と細長い 5 本の脚。その場で揺れて立つ。攻撃は身を起こして叩きつける --
def lotus_core_pose(clip, p):
    pose = {}
    amp = 1 if clip == 'idle' else 2
    pose['Body'] = {'loc': (0, 0, 0.008 * amp * s(p)), 'Y': 2 * amp * s(p, 1, 0.25)}
    pose['Head'] = {'X': -4 * amp * s(p, 1, 0.1), 'Z': 5 * amp * s(p, 1, 0.3)}
    side(pose, 'FLeg', {'X': 3 * amp * s(p)}, {'X': -3 * amp * s(p)})
    side(pose, 'SLeg', {'Y': 3 * amp * s(p, 1, 0.2)}, {'Y': 3 * amp * s(p, 1, 0.7)})
    pose['BLeg'] = {'X': -2 * amp * s(p)}
    return pose


def lotus_core_keys():
    rise = merge({'Body': {'X': -12, 'loc': (0, 0.02, 0.05)}, 'Head': {'X': -25}, 'BLeg': {'X': -8}},
                 both('FLeg', {'X': 12}))
    slam = merge({'Body': {'X': 8, 'loc': (0, -0.02, -0.04)}, 'Head': {'X': 18}, 'BLeg': {'X': 6}},
                 both('FLeg', {'X': -8}))
    hit = {'Body': {'X': -6, 'Y': 5, 'loc': (0, 0.02, 0.02)}, 'Head': {'X': -14, 'Z': 10}}
    fall = merge({'Body': {'X': 10, 'loc': (0, 0, -0.2)}, 'Head': {'X': 25}},
                 both('FLeg', {'X': -22}), both('SLeg', {'Y': 22}))
    down = merge({'Body': {'X': 18, 'loc': (0, -0.03, -0.38)}, 'Head': {'X': 35}, 'BLeg': {'X': 25}},
                 both('FLeg', {'X': -42}), both('SLeg', {'Y': 42}))
    return {
        'attack': [(0, {}), (12, rise), (20, rise), (25, slam), (30, slam), (42, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (16, fall), (26, down), (36, down)],
    }


SPECS['lotus_core'] = dict(
    bones=bones(
        ('Root', (0, 0.0, 0.0), (0, 0.0, 0.05), None),
        ('Body', (0, 0.12, 0.62), (0, -0.12, 0.74), 'Root'),
        ('Head', (0, -0.14, 0.76), (0, -0.4, 0.82), 'Body'),
        ('L_FLeg', (0.1, -0.17, 0.62), (0.11, -0.24, 0.01), 'Body'),
        ('L_SLeg', (0.15, -0.05, 0.62), (0.32, -0.1, 0.01), 'Body'),
        ('BLeg', (0, 0.06, 0.6), (0, 0.41, 0.01), 'Body'),
    ),
    pose=lotus_core_pose, keys=lotus_core_keys,
)


# --- 白蓮の花弁: 浮かぶ赤い花と刃の葉、垂れた根。攻撃（産む）は花が開いて脈打つ -----------------
def lotus_petal_pose(clip, p):
    pose = {}
    amp = 1 if clip == 'idle' else 1.6
    pose['Root'] = {'loc': (0, 0, 0.015 * amp * s(p))}
    pose['Flower'] = {'X': 4 * amp * s(p, 1, 0.1), 'Z': 6 * amp * s(p, 1, 0.3)}
    side(pose, 'BladeUp', {'Y': 6 * amp * s(p, 1, 0.1)})
    side(pose, 'BladeMid', {'Y': 5 * amp * s(p, 1, 0.25)})
    side(pose, 'BladeLow', {'Y': 6 * amp * s(p, 1, 0.4)})
    pose['Roots1'] = {'X': 6 * amp * s(p, 1, 0.2), 'Y': 4 * amp * s(p)}
    pose['Roots2'] = {'X': 10 * amp * s(p, 1, 0.05), 'Y': 6 * amp * s(p, 1, 0.3)}
    return pose


def lotus_petal_keys():
    blades = lambda deg: merge(both('BladeUp', {'Y': deg}), both('BladeMid', {'Y': deg * 0.8}),  # noqa: E731
                               both('BladeLow', {'Y': deg}))
    open_ = merge({'Flower': {'X': -15, 'loc': (0, 0, 0.03)}, 'Roots1': {'X': -15}}, blades(-18))
    pulse = merge({'Flower': {'X': 8, 'loc': (0, 0, -0.02)}, 'Roots1': {'X': 15}}, blades(15))
    hit = {'Root': {'loc': (0, 0.03, 0.02)}, 'Flower': {'X': -12, 'Y': 8}, 'Roots1': {'X': -20}}
    down = merge({'Root': {'loc': (0, 0, -0.3)}, 'Flower': {'X': 40}, 'Roots1': {'X': 30}}, blades(38))
    return {
        'attack': [(0, {}), (10, open_), (16, pulse), (20, open_), (30, {})],
        'hit': [(0, {}), (3, hit), (6, hit), (11, {})],
        'die': [(0, {}), (5, hit), (20, down), (36, down)],
    }


SPECS['lotus_petal'] = dict(
    bones=bones(
        ('Root', (0, 0.02, 0.46), (0, 0.02, 0.54), None),
        ('Flower', (0, 0.0, 0.55), (0, -0.06, 0.86), 'Root'),
        ('Roots1', (0, 0.02, 0.46), (0, 0.02, 0.22), 'Root'),
        ('Roots2', (0, 0.02, 0.22), (0, 0.02, 0.0), 'Roots1'),
        ('L_BladeUp', (0.05, 0.05, 0.62), (0.25, 0.2, 0.97), 'Root'),
        ('L_BladeMid', (0.06, 0.05, 0.55), (0.37, 0.1, 0.5), 'Root'),
        ('L_BladeLow', (0.05, 0.05, 0.5), (0.25, 0.15, 0.25), 'Root'),
    ),
    pose=lotus_petal_pose, keys=lotus_petal_keys,
    static_root=False,
)


# ---------------------------------------------------------------- 実行
spec = SPECS[NAME]
lib.load_glb(SRC)
mesh = lib.find_mesh()
lib.merge_close_vertices(mesh)
# ゲームのカメラは上から遠いので、Tripo の 2k テクスチャは 1k に縮める（ファイルと GPU の負担を 1/4 に）
for image in bpy.data.images:
    if image.size[0] > TEXTURE_SIZE:
        image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
bone_specs = spec['bones']
arm = lib.rig_mesh_auto(mesh, bone_specs)
names = [name for name, *_ in bone_specs]
static_root = spec.get('static_root', True)
# 全アクションで同じ骨にキーを打ち、three.js のクロスフェードで値が残らないようにする
animated = [n for n in names if not (static_root and n == 'Root')]
animator = lib.Animator(arm, animated)


def clean(pose):
    return {k: v for k, v in pose.items() if k in animated}


def loop_keys(clip, frames, steps):
    return [(round(frames * i / steps), clean(spec['pose'](clip, i / steps))) for i in range(steps + 1)]


animator.build('idle', loop_keys('idle', 60, 12))
animator.build('walk', loop_keys('walk', 24, 8))
for clip, keys in spec['keys']().items():
    animator.build(clip, [(f, clean(p)) for f, p in keys])

animator.apply_pose({})
lib.stash_actions(arm, ['idle', 'walk', 'attack', 'hit', 'die'])
lib.export_glb(arm, DST)
