"""敵モデルにアニメーションを付けるための共通処理。

各 build_*.py から使う。ポーズは「アーマチュア空間の軸まわりの回転（度）」で書く:
  {'BoneName': {'X': deg, 'Y': deg, 'Z': deg, 'rot': [((x, y, z), deg), ...], 'loc': (x, y, z)}}
敵モデルはすべて Z が上、-Y が前。
  X+ : 上に伸びたボーンが前に倒れる / 下に伸びたボーンが後ろへ振れる
  Z  : 左右にひねる
  Y  : 左右に傾ける
'loc' はアーマチュア空間での移動量。
"""
import sys
import math

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

FPS = 30
AXES = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}


def parse_args():
    args = sys.argv[sys.argv.index('--') + 1:]
    return args[0], args[1]


def load_glb(src):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # 読み込み時の秒→フレーム変換と書き出しで同じ fps を使い、元のアニメの長さを保つ
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=src)


def find_armature():
    return next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)


def world_rotation(value):
    """ポーズ指定の回転をアーマチュア空間のクォータニオンにする。"""
    q = Quaternion()
    for axis in ('Z', 'Y', 'X'):
        deg = value.get(axis, 0)
        if deg:
            q = Quaternion(AXES[axis], math.radians(deg)) @ q
    for axis, deg in value.get('rot', ()):
        q = Quaternion(Vector(axis).normalized(), math.radians(deg)) @ q
    return q


def mirror(pose):
    """左右反転: L/R を入れ替え、回転と移動を X について鏡映する。"""
    out = {}
    for name, value in pose.items():
        if name.startswith('L_'):
            target = 'R_' + name[2:]
        elif name.startswith('R_'):
            target = 'L_' + name[2:]
        else:
            target = name
        mirrored = {}
        for key, item in value.items():
            if key in ('X', 'Y', 'Z'):
                mirrored[key] = item if key == 'X' else -item
            elif key == 'rot':
                mirrored['rot'] = [((ax[0], -ax[1], -ax[2]), -deg) for ax, deg in item]
            elif key == 'loc':
                mirrored['loc'] = (-item[0], item[1], item[2])
        out[target] = mirrored
    return out


def pivot_offset(rotation_value, bone_head, pivot):
    """bone_head を回転中心にした回転を、pivot を中心に回したように見せる移動量。"""
    q = world_rotation(rotation_value)
    head, pivot = Vector(bone_head), Vector(pivot)
    return tuple(pivot - head - q @ (pivot - head))


class Animator:
    def __init__(self, arm, animated):
        self.arm = arm
        self.animated = animated
        self.bones = arm.pose.bones
        arm.animation_data_create()

    def bone_head(self, name):
        return tuple(self.arm.data.bones[name].head_local)

    def apply_pose(self, pose):
        for name in self.animated:
            pb = self.bones[name]
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = Quaternion()
            pb.location = Vector()
        for name, value in pose.items():
            pb = self.bones[name]
            rest = pb.bone.matrix_local.to_3x3()
            q = world_rotation(value)
            # アーマチュア空間の回転をボーンのレスト空間に移す
            pb.rotation_quaternion = (rest.inverted() @ q.to_matrix() @ rest).to_quaternion()
            if 'loc' in value:
                pb.location = rest.inverted() @ Vector(value['loc'])

    def build(self, name, keys):
        """keys: [(frame, pose_dict), ...]"""
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        self.arm.animation_data.action = action
        for frame, pose in keys:
            self.apply_pose(pose)
            for bone_name in self.animated:
                pb = self.bones[bone_name]
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=bone_name)
                pb.keyframe_insert('location', frame=frame, group=bone_name)
        self.arm.animation_data.action = None
        return action


def stash_actions(arm, names):
    """書き出すアクションを NLA に積む（glTF の ACTIONS モードで全部出すため）。"""
    ad = arm.animation_data_create()
    for track in list(ad.nla_tracks):
        ad.nla_tracks.remove(track)
    ad.action = None
    for name in names:
        action = bpy.data.actions[name]
        action.use_fake_user = True
        track = ad.nla_tracks.new()
        track.name = name
        track.strips.new(name, int(action.frame_range[0]), action)
        track.mute = True


def export_glb(arm, dst):
    for o in bpy.data.objects:
        o.select_set(False)
    arm.select_set(True)
    for child in arm.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=dst,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_anim_slide_to_zero=True,
        export_force_sampling=True,
        export_reset_pose_bones=True,
        export_cameras=False,
        export_lights=False,
    )
    print('EXPORTED', dst, sorted(a.name for a in bpy.data.actions))


def find_mesh():
    return max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))


def mesh_vertices(mesh):
    return np.array([mesh.matrix_world @ v.co for v in mesh.data.vertices])


def mesh_islands(mesh):
    """辺でつながった頂点のまとまり（頂点番号の配列）のリスト。"""
    parent = np.arange(len(mesh.data.vertices))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for edge in mesh.data.edges:
        a, b = find(edge.vertices[0]), find(edge.vertices[1])
        if a != b:
            parent[a] = b
    roots = np.array([find(i) for i in range(len(parent))])
    return [np.where(roots == root)[0] for root in np.unique(roots)]


def rig_mesh(mesh, bone_specs, weights, max_influences=4):
    """骨のないメッシュにアーマチュアを作って割り当てる。

    bone_specs: [(name, head, tail, parent_name_or_None), ...]（アーマチュア空間）
    weights: (頂点数, ボーン数) の配列。行ごとに正規化して上位 max_influences 本だけ残す。
    """
    arm_data = bpy.data.armatures.new('Armature')
    arm = bpy.data.objects.new('Armature', arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = {}
    for name, head, tail, parent in bone_specs:
        eb = arm_data.edit_bones.new(name)
        eb.head, eb.tail = Vector(head), Vector(tail)
        if parent:
            eb.parent = edit_bones[parent]
        edit_bones[name] = eb
    bpy.ops.object.mode_set(mode='OBJECT')

    w = np.maximum(np.asarray(weights, dtype=float), 0)
    if max_influences < w.shape[1]:
        cutoff = -np.sort(-w, axis=1)[:, max_influences - 1:max_influences]
        w = np.where(w >= cutoff, w, 0)
    w /= np.maximum(w.sum(axis=1, keepdims=True), 1e-9)

    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    for j, (name, *_rest) in enumerate(bone_specs):
        group = mesh.vertex_groups.new(name=name)
        for weight in np.unique(np.round(w[:, j], 3)):
            if weight <= 0:
                continue
            idx = np.where(np.round(w[:, j], 3) == weight)[0].tolist()
            group.add(idx, float(weight), 'REPLACE')

    world = mesh.matrix_world.copy()
    mesh.parent = arm
    mesh.matrix_world = world
    modifier = mesh.modifiers.new('Armature', 'ARMATURE')
    modifier.object = arm
    return arm


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
