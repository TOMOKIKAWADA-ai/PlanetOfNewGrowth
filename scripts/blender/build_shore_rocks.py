# Hand-built shore stones for the water chapters (backlog B1-6, 2026-11-23). No generated images or models: three
# rounded stones are made from noise-displaced icospheres and joined into one low cluster, colored by vertex colors
# (dark wet band at the waterline, grey-green stone, a little moss on top). One mesh, one material, so the game's
# addInstancedWaterStageProp can instance it like the old rock (obj_008_rtp.glb).
#   blender -b --factory-startup --python scripts/blender/build_shore_rocks.py -- <out.glb> <preview.png>
import math
import random
import sys

import bmesh
import bpy
from mathutils import Vector, noise

args = sys.argv[sys.argv.index('--') + 1:]
out_path, preview = args[0], args[1]
random.seed(1123)

STONE = Vector((0.40, 0.43, 0.41))   # grey with a hint of green
WET = Vector((0.16, 0.19, 0.19))     # darker band where the water touches
MOSS = Vector((0.30, 0.42, 0.20))
PALE = Vector((0.58, 0.60, 0.56))    # dry, sun-bleached tops


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def stone(name, size, squash, offset, seed):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    shift = Vector((seed * 3.1, seed * 1.7, seed * 2.3))
    for v in bm.verts:
        d = v.co.normalized()
        bump = noise.noise(d * 1.6 + shift) * 0.22 + noise.noise(d * 4.0 + shift) * 0.06
        co = d * (1.0 + bump)
        co.x *= size[0]
        co.y *= size[1]
        co.z *= size[2] * squash
        # Flatten the underside so the stone sits on the shore instead of floating.
        if co.z < -0.15 * size[2]:
            co.z = -0.15 * size[2] + (co.z + 0.15 * size[2]) * 0.2
        v.co = co + Vector(offset)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def paint(obj):
    mesh = obj.data
    attr = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    zs = [v.co.z for v in mesh.vertices]
    z0, z1 = min(zs), max(zs)
    for v in mesh.vertices:
        h = (v.co.z - z0) / max(z1 - z0, 1e-6)
        n = noise.noise(v.co * 2.2)
        speck = noise.noise(v.co * 9.0) * 0.05
        col = STONE.lerp(PALE, max(0.0, min(1.0, (h - 0.55) * 1.6 + n * 0.3)))
        # wet band: lowest 30% fades to the dark wet colour
        col = WET.lerp(col, max(0.0, min(1.0, (h - 0.08) / 0.27)))
        # moss on the upper, sheltered faces
        up = v.normal.z
        moss = max(0.0, min(1.0, (up - 0.55) * 2.5)) * max(0.0, n + 0.15) * 1.4
        col = col.lerp(MOSS, min(0.75, moss))
        col = Vector([max(0.0, c + speck) for c in col])
        # The palette above is written as sRGB; glTF vertex colors are linear, so convert (otherwise the game shows them
        # washed out to near white under its sun).
        col = Vector([c ** 2.2 for c in col])
        attr.data[v.index].color = (col.x, col.y, col.z, 1.0)


def material():
    mat = bpy.data.materials.new('ShoreStone')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.62
    col = nodes.new('ShaderNodeVertexColor')
    col.layer_name = 'Col'
    mat.node_tree.links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


clear()
parts = [
    stone('big', (1.0, 0.8, 0.62), 1.0, (0, 0, 0), 1),
    stone('mid', (0.55, 0.48, 0.42), 1.0, (0.95, 0.45, -0.05), 2),
    stone('small', (0.34, 0.3, 0.26), 1.0, (-0.7, 0.75, -0.05), 3),
]
bpy.ops.object.select_all(action='DESELECT')
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
obj.name = 'ShoreRocks'
bpy.ops.object.shade_smooth()
# Sit the cluster on z = 0 and center it.
zs = [v.co.z for v in obj.data.vertices]
xs = [v.co.x for v in obj.data.vertices]
ys = [v.co.y for v in obj.data.vertices]
shift = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)))
for v in obj.data.vertices:
    v.co -= shift
obj.data.update()
paint(obj)
obj.data.materials.append(material())
tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True, export_yup=True,
                          export_vertex_color='ACTIVE')
print(f'shore rocks: {tris} tris -> {out_path}')

# Preview: side view and the steep game-like view, lit like a sunny shore.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'VERTEX'
scene.display.shading.light = 'STUDIO'
scene.render.resolution_x = 900
scene.render.resolution_y = 420
dup = obj.copy()
dup.data = obj.data
scene.collection.objects.link(dup)
obj.location = (-1.6, 0, 0)
dup.location = (1.6, 0, 0.4)
dup.rotation_euler = (math.radians(-55), 0, math.radians(20))
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 6.4
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -8, 0.5)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
scene.render.filepath = preview
bpy.ops.render.render(write_still=True)
print('preview', preview)
