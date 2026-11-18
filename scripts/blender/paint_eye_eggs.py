"""underwater_eye_eggs（水中の目玉卵のかたまり）に目の模様を描いて GLB に書き出す。

Tripo の Smart Mesh P2.0 で作った形（高さ 1、Z が上）は、Tripo のテクスチャ生成がサーバーエラー（error.11000）で
通らなかったので色がない。球がくっついた一つの塊なので、頂点の曲がり具合から球ごとの中心と半径を推定し、
球ごとに「塊の外向き」の方向へ赤い目（黒い瞳）を描く。テクスチャは左半分が目、右半分が裏側の白い殻。
UV は球の中心からの平面投影（三角形の上で線形）なので、目の丸は面の粗さに関係なく丸く出る。

骨もアニメーションもない置き物（揺れや回転はゲーム側のコード）。

使い方:
  blender -b --factory-startup -P scripts/blender/paint_eye_eggs.py -- \
    assets_src/tripo/tripo_aq_eye_eggs.glb assets/eggs/eye_eggs.glb
"""
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_anim_lib as lib  # noqa: E402

SRC, DST = lib.parse_args()
lib.load_glb(SRC)
mesh = lib.find_mesh()
data = mesh.data
V = lib.mesh_vertices(mesh)
N = np.array([(mesh.matrix_world.to_3x3() @ v.normal).normalized() for v in data.vertices])
E = np.array([e.vertices[:] for e in data.edges])

# --- 球ごとの中心: 球の上では「位置の差 / 法線の差」が半径になる ---
ratio = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1) / np.maximum(np.linalg.norm(N[E[:, 0]] - N[E[:, 1]], axis=1), 1e-4)
per_vertex = [[] for _ in V]
for (a, b), r in zip(E, ratio):
    per_vertex[a].append(r)
    per_vertex[b].append(r)
R = np.clip([np.median(rs) if rs else 0.1 for rs in per_vertex], 0.03, 0.4)
C = V - R[:, None] * N

# 推定した中心が近い頂点を集めて球にする（多いものから順に）
TOL = 0.035
label = np.full(len(V), -1)
spheres = []
while True:
    free = np.where(label < 0)[0]
    if len(free) < 12:
        break
    d = np.linalg.norm(C[free][:, None] - C[free][None], axis=2)
    counts = (d < TOL).sum(axis=1)
    best = counts.argmax()
    if counts[best] < 12:
        break
    members = free[d[best] < TOL * 1.5]
    centre = np.median(C[members], axis=0)
    radius = float(np.median(np.linalg.norm(V[members] - centre, axis=1)))
    label[members] = len(spheres)
    spheres.append((centre, radius))
# 残り（球のつなぎ目）は、表面がいちばん近い球へ
for i in np.where(label < 0)[0]:
    label[i] = int(np.argmin([abs(np.linalg.norm(V[i] - c) - r) for c, r in spheres]))
print('spheres', len(spheres), [round(r, 3) for _c, r in spheres])

# --- 目の向き: 塊の中心から球の中心へ（少し上向き、少しばらつかせる） ---
rng = np.random.default_rng(7)
core = (V.min(0) + V.max(0)) / 2
axes = []
for centre, _r in spheres:
    out = centre - core
    out[2] *= 0.6
    if np.linalg.norm(out) < 1e-3:
        out = np.array([0, -1.0, 0.3])
    out = out / np.linalg.norm(out) + rng.normal(0, 0.18, 3) + np.array([0, 0, 0.15])
    axes.append(out / np.linalg.norm(out))


def basis(axis):
    helper = np.array([0, 0, 1.0]) if abs(axis[2]) < 0.9 else np.array([1.0, 0, 0])
    e1 = np.cross(helper, axis)
    e1 /= np.linalg.norm(e1)
    return e1, np.cross(axis, e1)


bases = [basis(a) for a in axes]

# --- UV: 面ごとに球を決め、表側は目（左半分）、裏側は殻（右半分）へ平面投影 ---
uv_layer = data.uv_layers.new(name='UVMap')
for poly in data.polygons:
    k = np.bincount(label[list(poly.vertices)]).argmax()
    centre, radius = spheres[k]
    e1, e2 = bases[k]
    face_normal = np.array(mesh.matrix_world.to_3x3() @ poly.normal)
    half = 0.25 if face_normal @ axes[k] > -0.05 else 0.75
    for li in poly.loop_indices:
        q = (V[data.loops[li].vertex_index] - centre) / radius
        u, v = np.clip(q @ e1, -1, 1), np.clip(q @ e2, -1, 1)
        uv_layer.data[li].uv = (half + 0.24 * u, 0.5 + 0.48 * v)

# --- テクスチャを描く (512x256) ---
H = 256
y, x = np.mgrid[0:H, 0:H]
px = (x + 0.5 - H / 2) / (H * 0.48)
py = (y + 0.5 - H / 2) / (H * 0.48)
d = np.hypot(px, py)
ang = np.arctan2(py, px)
shell = np.array([228, 224, 214], float)
rim = np.array([178, 184, 194], float)


def shell_colour(d):
    t = np.clip((d - 0.35) / 0.65, 0, 1)[..., None] ** 1.6
    return shell * (1 - t) + rim * t


eye = shell_colour(d)
# 細い赤い血管（白目の外側から虹彩へ）
vein = np.zeros_like(d)
for a0 in rng.uniform(-np.pi, np.pi, 9):
    wiggle = a0 + 0.12 * np.sin(d * 14 + a0 * 3)
    width = 0.035 * (1.1 - d)
    vein = np.maximum(vein, np.clip(1 - np.abs(np.angle(np.exp(1j * (ang - wiggle)))) * d / np.maximum(width, 1e-3), 0, 1) * (d > 0.4) * (d < 0.95))
eye = eye * (1 - 0.7 * vein[..., None]) + np.array([170, 30, 40]) * 0.7 * vein[..., None]
# 虹彩: 赤、外へ向かって暗く、放射状の筋
IRIS, PUPIL = 0.46, 0.2
t = np.clip(d / IRIS, 0, 1)
streak = 0.85 + 0.15 * np.sin(ang * 23) * np.sin(ang * 7 + 1.3)
iris = (np.array([215, 32, 34]) * (1 - t[..., None]) + np.array([110, 6, 14]) * t[..., None]) * streak[..., None]
edge = np.clip((IRIS - d) / 0.02, 0, 1)[..., None]
eye = eye * (1 - edge) + iris * edge
pupil = np.clip((PUPIL - d) / 0.015, 0, 1)[..., None]
eye = eye * (1 - pupil) + np.array([18, 6, 8]) * pupil
glint = np.clip((0.075 - np.hypot(px + 0.14, py - 0.16)) / 0.02, 0, 1)[..., None]
eye = eye * (1 - glint) + 250 * glint
back = shell_colour(d)
img = np.concatenate([eye, back], axis=1)
rgba = np.concatenate([np.clip(img, 0, 255) / 255, np.ones((H, H * 2, 1))], axis=2)

image = bpy.data.images.new('eye_eggs', H * 2, H)
image.pixels = rgba.astype(np.float32).ravel()
image.file_format = 'PNG'
image.pack()

mat = data.materials[0] if data.materials else bpy.data.materials.new('eye_eggs')
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
tex = nodes.new('ShaderNodeTexImage')
tex.image = image
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.28
bsdf.inputs['Metallic'].default_value = 0.0
if not data.materials:
    data.materials.append(mat)

for o in bpy.data.objects:
    o.select_set(o == mesh)
bpy.context.view_layer.objects.active = mesh
bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', use_selection=True, export_cameras=False,
                          export_lights=False, export_image_format='AUTO')
print('triangles', sum(len(p.vertices) - 2 for p in data.polygons))
